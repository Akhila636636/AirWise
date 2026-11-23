import type {
  HouseholdProfile,
  AirQualitySummary,
  ChatResponse,
} from '@airwise/shared';
import { CHAT_SYSTEM_PROMPT, buildChatUserContext } from '../prompts/chat.js';
import { stripHtmlAndMarkdown } from './sanitize.js';

interface MessageTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Returns contextual follow-up chips based on household profile and AQI.
 */
export function getContextualQuestions(
  profile: HouseholdProfile,
  airSummary: AirQualitySummary,
): string[] {
  const questions: string[] = [];

  if (profile.hasChildren) {
    questions.push('Is it safe for my toddler or kids to play outside today?');
  }

  if (profile.cookingFuel === 'biomass' || profile.cookingFuel === 'lpg') {
    questions.push('What can I do about indoor cooking smoke?');
  }

  if (airSummary.current.usAqi >= 150) {
    questions.push('What should I do during morning inversion smog hours?');
  }

  if (!profile.hasAirPurifier) {
    questions.push('How do I build a low-cost DIY Corsi-Rosenthal box?');
  } else {
    questions.push('Where should I place our air purifier for best coverage?');
  }

  if (profile.commuteMode !== 'work-from-home') {
    questions.push('Which mask is best for my commute: cloth, surgical, or N95?');
  }

  questions.push('Do house plants help clean indoor PM2.5 smog?');
  questions.push(`When is the best time today to ventilate our home?`);

  return questions.slice(0, 3);
}

/**
 * Deterministic rule-based fallback answering common air quality queries.
 */
export function getFallbackAnswer(
  query: string,
  profile: HouseholdProfile,
  airSummary: AirQualitySummary,
): ChatResponse {
  const lower = query.toLowerCase();
  const aqi = airSummary.current.usAqi;
  const cat = airSummary.current.category.label;
  const suggestedQuestions = getContextualQuestions(profile, airSummary);

  // Medical query guardrail
  if (
    lower.includes('cough') ||
    lower.includes('chest') ||
    lower.includes('breath') ||
    lower.includes('pain') ||
    lower.includes('medicine') ||
    lower.includes('doctor') ||
    lower.includes('asthma') ||
    lower.includes('inhaler')
  ) {
    return {
      message:
        'I cannot provide medical diagnoses or prescriptions. If you or a family member are experiencing shortness of breath, chest tightness, severe coughing, or persistent wheezing, please contact a licensed healthcare professional or local emergency services immediately.',
      suggestedQuestions,
      source: 'rules',
    };
  }

  // Children / Toddler outdoor play
  if (lower.includes('toddler') || lower.includes('child') || lower.includes('kid') || lower.includes('play')) {
    const advice =
      aqi >= 150
        ? `With today's air quality at ${aqi} (${cat}), outdoor play and physical exertion are NOT safe for toddlers or children. Children breathe more air per kilogram of body weight, making them particularly vulnerable to bronchial inflammation. Keep play indoors and seal gaps under doors during morning smog hours.`
        : `Air quality is currently ${aqi} (${cat}). If taking children outdoors, plan around the best ventilation window (${airSummary.bestVentilationWindow.label}) and avoid high-traffic roads during peak hours (${airSummary.worstOutdoorWindow.label}).`;

    return {
      message: advice,
      suggestedQuestions,
      source: 'rules',
    };
  }

  // Cooking smoke
  if (lower.includes('cook') || lower.includes('kitchen') || lower.includes('smoke') || lower.includes('fuel')) {
    return {
      message:
        'Indoor cooking with unvented stoves produces heavy PM2.5 spikes. Key steps: (1) Run your kitchen exhaust fan before igniting the burner and keep it running 5 minutes after cooking; (2) Keep interior kitchen doors closed to prevent soot from drifting into bedrooms; (3) If using biomass or kerosene, transition routine meal boiling to an induction cooktop.',
      suggestedQuestions,
      source: 'rules',
    };
  }

  // Mask types
  if (lower.includes('mask') || lower.includes('n95') || lower.includes('cloth')) {
    return {
      message:
        'Cloth and surgical masks do not create a tight facial seal and allow ~80% of submicron PM2.5 to penetrate. Well-fitted N95 or FFP2 respirators with an adjustable nose clip reduce inhaled PM2.5 by over 80%. Ensure headbands hold the mask firmly against cheeks without air leaks.',
      suggestedQuestions,
      source: 'rules',
    };
  }

  // DIY Purifier / Corsi-Rosenthal
  if (lower.includes('corsi') || lower.includes('purifier') || lower.includes('filter') || lower.includes('diy')) {
    return {
      message:
        'A DIY Corsi-Rosenthal box combines a standard 20-inch box fan with four MERV-13 furnace filters taped into a cube. Testing shows it provides Clean Air Delivery Rates (CADR) comparable to high-end commercial HEPA purifiers for a fraction of the cost. Place in a central living room and run on medium speed.',
      suggestedQuestions,
      source: 'rules',
    };
  }

  // Plants
  if (lower.includes('plant') || lower.includes('leaf') || lower.includes('flower')) {
    return {
      message:
        'Common house plants do NOT remove fine PM2.5 or urban smog. While plants exchange carbon dioxide through stomata, they have virtually zero particulate filtration capacity. Do not rely on plants for smog protection—use HEPA/MERV filtration and source ventilation instead.',
      suggestedQuestions,
      source: 'rules',
    };
  }

  // Default response grounded in current AQI
  return {
    message: `Today's AQI in your area is ${aqi} (${cat}). The best window to air out your home is ${airSummary.bestVentilationWindow.label}, while the highest outdoor pollution window is ${airSummary.worstOutdoorWindow.label}. Prioritize indoor source control, wet micro-fiber mopping, and wear an N95 respirator if stepping outside during peak traffic.`,
    suggestedQuestions,
    source: 'rules',
  };
}

/**
 * Handles chat inquiries via Groq or falls back to deterministic rule engine.
 */
export async function handleChatMessage(
  messages: readonly MessageTurn[],
  profile: HouseholdProfile,
  airSummary: AirQualitySummary,
  planSummary?: string,
  groqApiKey?: string,
  modelName: string = 'llama-3.3-70b-versatile',
): Promise<ChatResponse> {
  const latestMessage = messages[messages.length - 1]?.content ?? '';
  const fallback = getFallbackAnswer(latestMessage, profile, airSummary);

  if (!groqApiKey || groqApiKey.trim() === '') {
    return fallback;
  }

  const systemPrompt = `${CHAT_SYSTEM_PROMPT}\n\nUSER CONTEXT:\n${buildChatUserContext(
    profile,
    airSummary,
    planSummary,
  )}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-6).map((m) => ({
        role: m.role,
        content: stripHtmlAndMarkdown(m.content).slice(0, 500),
      })),
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqApiKey.trim()}`,
      },
      body: JSON.stringify({
        model: modelName,
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: 'json_object' },
        messages: apiMessages,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      return fallback;
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) {
      return fallback;
    }

    const parsed = JSON.parse(rawContent);
    if (!parsed.message || typeof parsed.message !== 'string') {
      return fallback;
    }

    const cleanMessage = stripHtmlAndMarkdown(parsed.message).slice(0, 1500);
    const suggested = Array.isArray(parsed.suggestedQuestions)
      ? parsed.suggestedQuestions.map((q: string) => stripHtmlAndMarkdown(q).slice(0, 150))
      : getContextualQuestions(profile, airSummary);

    return {
      message: cleanMessage,
      suggestedQuestions: suggested.slice(0, 3),
      source: 'llm',
    };
  } catch (err) {
    clearTimeout(timer);
    console.warn('Chat LLM request failed, using fallback:', err);
    return fallback;
  }
}
