import type { Request, Response, NextFunction } from 'express';
import type { AirQualitySummary, DailyPlan } from '@airwise/shared';
import {
  PlanRequestSchema,
  getAqiCategory,
  calculateAllImpacts,
  generateRulePlan,
  evaluateDecisions,
} from '@airwise/shared';
import { getAirQuality } from '../services/airQuality.js';
import { generateLlmPlan } from '../services/llm.js';
import { sanitizeFreeText } from '../services/sanitize.js';
import type { Env } from '../env.js';

/**
 * Creates a synthetic AirQualitySummary when manual AQI entry is used.
 */
function createSyntheticAirSummary(manualAqi: number): AirQualitySummary {
  const category = getAqiCategory(manualAqi);
  // Estimate PM2.5 from US AQI approximation
  // EPA approx: AQI 100 ~ 35 ug/m3, AQI 150 ~ 55 ug/m3, AQI 200 ~ 150 ug/m3, AQI 300 ~ 250 ug/m3
  const pm25 = Math.round((manualAqi * 0.7) * 10) / 10;
  const pm10 = Math.round(pm25 * 1.5 * 10) / 10;

  return {
    current: {
      pm25,
      pm10,
      usAqi: manualAqi,
      category,
    },
    hourly: [
      {
        time: new Date().toISOString(),
        pm25,
        pm10,
        usAqi: manualAqi,
      },
    ],
    bestVentilationWindow: {
      startHour: 13,
      endHour: 15,
      avgAqi: Math.max(20, Math.round(manualAqi * 0.7)),
      label: '1:00 PM - 3:00 PM',
    },
    worstOutdoorWindow: {
      startHour: 7,
      endHour: 9,
      avgAqi: Math.round(manualAqi * 1.2),
      label: '7:00 AM - 9:00 AM',
    },
    fetchedAt: new Date().toISOString(),
  };
}

export function createPlanController(env: Env) {
  return async function planHandler(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { profile, location, manualAqi } = PlanRequestSchema.parse(req.body);

      // Sanitize freeText without altering other fields
      const sanitizedProfile = {
        ...profile,
        freeText: profile.freeText ? sanitizeFreeText(profile.freeText) : undefined,
      };

      // Safe logging without PII or freeText
      console.log(
        `[${req.requestId}] Plan requested for city "${location.name}", lang="${sanitizedProfile.language}", manualAqi=${manualAqi ?? 'none'}`,
      );

      let airSummary: AirQualitySummary;
      if (manualAqi !== undefined && manualAqi !== null) {
        airSummary = createSyntheticAirSummary(manualAqi);
      } else {
        try {
          airSummary = await getAirQuality(location.latitude, location.longitude);
        } catch (fetchErr) {
          console.warn(`[${req.requestId}] Upstream air quality failed; fallback to default Delhi smog profile`);
          // Default fallback AQI 180 (Unhealthy) so the user gets a working plan regardless
          airSummary = createSyntheticAirSummary(180);
        }
      }

      // Try LLM first
      let plan: DailyPlan | null = null;
      let source: 'llm' | 'rules' = 'rules';

      if (env.GROQ_API_KEY && env.GROQ_API_KEY.trim().length > 0) {
        plan = await generateLlmPlan(
          sanitizedProfile,
          airSummary,
          env.GROQ_API_KEY,
          env.GROQ_MODEL,
        );
        if (plan) {
          source = 'llm';
        }
      }

      // If LLM returned null or was skipped, run deterministic ruleEngine
      if (!plan) {
        plan = generateRulePlan(sanitizedProfile, airSummary);
        source = 'rules';
      }

      // Compute deterministic impact metrics
      const impact = calculateAllImpacts(sanitizedProfile, airSummary.current.pm25);

      // Compute explainable decision trace
      const decisionTrace = evaluateDecisions(sanitizedProfile, airSummary);

      res.json({
        plan,
        impact,
        airSummary,
        source,
        decisionTrace,
      });
    } catch (err) {
      next(err);
    }
  };
}
