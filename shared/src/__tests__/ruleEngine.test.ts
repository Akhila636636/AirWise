import { describe, it, expect } from 'vitest';
import { generateRulePlan } from '../ruleEngine.js';
import { DailyPlanSchema } from '../schemas.js';
import type { HouseholdProfile, AirQualitySummary, Language } from '../types.js';

const mockAirSummary: AirQualitySummary = {
  current: {
    pm25: 180,
    pm10: 260,
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
    startHour: 14,
    endHour: 16,
    avgAqi: 85,
    label: '2:00 PM - 4:00 PM',
  },
  worstOutdoorWindow: {
    startHour: 7,
    endHour: 9,
    avgAqi: 260,
    label: '7:00 AM - 9:00 AM',
  },
  fetchedAt: new Date().toISOString(),
};

const languages: Language[] = ['en', 'hi', 'te'];

describe('Rule Engine Plans', () => {
  languages.forEach((lang) => {
    it(`generates schema-valid plan for language: ${lang}`, () => {
      const profile: HouseholdProfile = {
        householdSize: 4,
        hasChildren: true,
        hasElderly: true,
        hasSensitiveMembers: true,
        commuteMode: 'car',
        commuteMinutesPerDay: 45,
        cookingFuel: 'biomass',
        hasAirPurifier: false,
        homeType: 'apartment',
        heatingType: 'wood-coal',
        language: lang,
      };

      const plan = generateRulePlan(profile, mockAirSummary);

      // Validate against strict Zod schema
      const parseResult = DailyPlanSchema.safeParse(plan);
      expect(parseResult.success).toBe(true);

      // Verify sections have recommendations
      expect(plan.routine.morning.length).toBeGreaterThan(0);
      expect(plan.routine.afternoon.length).toBeGreaterThan(0);
      expect(plan.routine.evening.length).toBeGreaterThan(0);
      expect(plan.indoor.length).toBeGreaterThan(0);
      expect(plan.sustainable.length).toBeGreaterThan(0);
      expect(plan.protection.length).toBeGreaterThan(0);

      // Verify each recommendation has at most 3 steps
      for (const rec of [
        ...plan.routine.morning,
        ...plan.routine.afternoon,
        ...plan.routine.evening,
        ...plan.indoor,
        ...plan.sustainable,
        ...plan.protection,
      ]) {
        expect(rec.steps.length).toBeLessThanOrEqual(3);
        expect(rec.title.length).toBeGreaterThan(0);
        expect(rec.whyItHelps.length).toBeGreaterThan(0);
      }
    });
  });

  it('adapts recommendations when purifier is present', () => {
    const profileWithPurifier: HouseholdProfile = {
      householdSize: 2,
      hasChildren: false,
      hasElderly: false,
      hasSensitiveMembers: false,
      commuteMode: 'work-from-home',
      commuteMinutesPerDay: 0,
      cookingFuel: 'induction',
      hasAirPurifier: true,
      homeType: 'apartment',
      heatingType: 'none',
      language: 'en',
    };

    const plan = generateRulePlan(profileWithPurifier, mockAirSummary);
    const eveningActionIds = plan.routine.evening.map((r) => r.actionId);
    expect(eveningActionIds).toContain('run_purifier_bedroom');
  });
});
