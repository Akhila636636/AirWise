import type {
  HouseholdProfile,
  AirQualitySummary,
  DailyPlan,
  Recommendation,
} from '@airwise/shared';
import { DailyPlanSchema, getActionIds } from '@airwise/shared';
import { SYSTEM_PROMPT, buildUserMessage } from '../prompts/plan.js';
import { stripHtmlAndMarkdown } from './sanitize.js';

interface GroqChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

/**
 * Sanitizes all string fields in a Recommendation object.
 */
function sanitizeRecommendation(rec: Recommendation): Recommendation {
  return {
    actionId: rec.actionId,
    title: stripHtmlAndMarkdown(rec.title).slice(0, 100),
    steps: rec.steps
      .slice(0, 3)
      .map((s: string) => stripHtmlAndMarkdown(s).slice(0, 200)),
    whyItHelps: stripHtmlAndMarkdown(rec.whyItHelps).slice(0, 300),
    difficulty: rec.difficulty,
    cost: rec.cost,
  };
}

/**
 * Calls the Groq API in JSON mode to synthesize a tailored air-quality plan.
 * Falls back to null on ANY failure (missing key, timeout, validation error, schema violation).
 */
export async function generateLlmPlan(
  profile: HouseholdProfile,
  airSummary: AirQualitySummary,
  groqApiKey: string,
  modelName: string = 'llama-3.3-70b-versatile',
): Promise<DailyPlan | null> {
  if (!groqApiKey || groqApiKey.trim() === '') {
    return null;
  }

  const allowedActionIds = getActionIds();
  const userMessage = buildUserMessage(profile, airSummary, allowedActionIds);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000); // 8s timeout

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqApiKey.trim()}`,
      },
      body: JSON.stringify({
        model: modelName,
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      console.warn(`Groq API returned HTTP ${response.status}`);
      return null;
    }

    const json = (await response.json()) as GroqChatCompletionResponse;
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      console.warn('Groq returned empty completion content');
      return null;
    }

    const rawPlan = JSON.parse(content);

    // Validate with Zod
    const parsed = DailyPlanSchema.safeParse(rawPlan);
    if (!parsed.success) {
      console.warn('Groq response failed DailyPlan schema validation:', parsed.error.format());
      return null;
    }

    const validated = parsed.data;

    // Filter out unknown action IDs
    const validIdsSet = new Set(allowedActionIds);
    const filterRecs = (recs: readonly Recommendation[]): Recommendation[] =>
      recs
        .filter((r) => validIdsSet.has(r.actionId))
        .map(sanitizeRecommendation);

    const morning = filterRecs(validated.routine.morning);
    const afternoon = filterRecs(validated.routine.afternoon);
    const evening = filterRecs(validated.routine.evening);
    const indoor = filterRecs(validated.indoor);
    const sustainable = filterRecs(validated.sustainable);
    const protection = filterRecs(validated.protection);

    // Ensure we have at least one recommendation in key categories
    if (
      morning.length === 0 &&
      afternoon.length === 0 &&
      evening.length === 0
    ) {
      console.warn('Groq returned zero valid routine recommendations');
      return null;
    }

    return {
      summary: stripHtmlAndMarkdown(validated.summary).slice(0, 500),
      routine: {
        morning,
        afternoon,
        evening,
      },
      indoor,
      sustainable,
      protection,
      bestVentilationWindow: stripHtmlAndMarkdown(validated.bestVentilationWindow).slice(0, 100),
      avoidOutdoorWindow: stripHtmlAndMarkdown(validated.avoidOutdoorWindow).slice(0, 100),
    };
  } catch (err: unknown) {
    clearTimeout(timer);
    const isTimeout = (err as Error)?.name === 'AbortError';
    console.warn(isTimeout ? 'Groq API request timed out after 8s' : 'Groq API call error:', err);
    return null;
  }
}
