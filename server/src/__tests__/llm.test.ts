import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateLlmPlan } from '../services/llm.js';
import { buildUserMessage } from '../prompts/plan.js';
import type { HouseholdProfile, AirQualitySummary } from '@airwise/shared';

const mockProfile: HouseholdProfile = {
  householdSize: 3,
  hasChildren: true,
  hasElderly: false,
  hasSensitiveMembers: false,
  commuteMode: 'metro',
  commuteMinutesPerDay: 30,
  cookingFuel: 'lpg',
  hasAirPurifier: true,
  homeType: 'apartment',
  heatingType: 'none',
  language: 'en',
  freeText: 'Looking for advice',
};

const mockAirSummary: AirQualitySummary = {
  current: {
    pm25: 180,
    pm10: 250,
    usAqi: 230,
    category: {
      level: 'very-unhealthy',
      label: 'Very Unhealthy',
      icon: '🟣',
      color: '#7c3aed',
      bgColor: '#ede9fe',
      min: 201,
      max: 300,
    },
  },
  hourly: [],
  bestVentilationWindow: {
    startHour: 13,
    endHour: 15,
    avgAqi: 90,
    label: '1:00 PM - 3:00 PM',
  },
  worstOutdoorWindow: {
    startHour: 7,
    endHour: 9,
    avgAqi: 280,
    label: '7:00 AM - 9:00 AM',
  },
  fetchedAt: new Date().toISOString(),
};

describe('LLM Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null immediately when GROQ_API_KEY is empty', async () => {
    const plan = await generateLlmPlan(mockProfile, mockAirSummary, '');
    expect(plan).toBeNull();
  });

  it('builds a sanitized JSON user message for the LLM', () => {
    const msg = buildUserMessage(mockProfile, mockAirSummary, ['use_n95_commute']);
    const parsed = JSON.parse(msg);

    expect(parsed.household.householdSize).toBe(3);
    expect(parsed.locationAir.aqi).toBe(230);
    expect(parsed.allowedActionIds).toContain('use_n95_commute');
  });

  it('parses, validates, and filters Groq LLM completion', async () => {
    const validLlmPayload = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: 'Air is very unhealthy today. Protect children and avoid morning outdoor exercise.',
              routine: {
                morning: [
                  {
                    actionId: 'close_windows_peak_hours',
                    title: 'Keep windows closed',
                    steps: ['Shut all windows before 7 AM'],
                    whyItHelps: 'Blocks heavy ground-level morning soot.',
                    difficulty: 'easy',
                    cost: 'free',
                  },
                ],
                afternoon: [],
                evening: [],
              },
              indoor: [
                {
                  actionId: 'run_purifier_bedroom',
                  title: 'Run bedroom purifier',
                  steps: ['Turn on HEPA purifier'],
                  whyItHelps: 'Cycles indoor air continuously.',
                  difficulty: 'easy',
                  cost: 'low',
                },
              ],
              sustainable: [],
              protection: [
                {
                  actionId: 'use_n95_commute',
                  title: 'Wear N95 mask',
                  steps: ['Fit tightly around nose'],
                  whyItHelps: 'Traps airborne micro-particulates.',
                  difficulty: 'easy',
                  cost: 'low',
                },
              ],
              bestVentilationWindow: '1:00 PM - 3:00 PM',
              avoidOutdoorWindow: '7:00 AM - 9:00 AM',
            }),
          },
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => validLlmPayload,
    } as Response);

    const plan = await generateLlmPlan(mockProfile, mockAirSummary, 'fake_key');
    expect(plan).not.toBeNull();
    expect(plan?.routine.morning).toHaveLength(1);
    expect(plan?.routine.morning[0].actionId).toBe('close_windows_peak_hours');
  });

  it('returns null when Groq returns invalid JSON or HTTP error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    const plan = await generateLlmPlan(mockProfile, mockAirSummary, 'fake_key');
    expect(plan).toBeNull();
  });
});
