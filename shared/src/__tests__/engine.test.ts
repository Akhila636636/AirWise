import { describe, it, expect } from 'vitest';
import {
  getAqiCategory,
  calculateBaseline,
  calculateActionImpact,
  calculateAllImpacts,
  calculateWhatIf,
  findBestVentilationWindow,
  findWorstOutdoorWindow,
} from '../engine/index.js';
import { ACTION_CATALOG, getAction } from '../actions.js';
import type { HouseholdProfile, HourlyAirData } from '../types.js';

const sampleProfile: HouseholdProfile = {
  householdSize: 4,
  hasChildren: true,
  hasElderly: true,
  hasSensitiveMembers: false,
  commuteMode: 'car',
  commuteMinutesPerDay: 60,
  cookingFuel: 'lpg',
  hasAirPurifier: false,
  homeType: 'apartment',
  heatingType: 'none',
  language: 'en',
};

describe('AQI Categorization', () => {
  it('correctly maps standard AQI breakpoints', () => {
    expect(getAqiCategory(25).level).toBe('good');
    expect(getAqiCategory(50).level).toBe('good');
    expect(getAqiCategory(51).level).toBe('moderate');
    expect(getAqiCategory(100).level).toBe('moderate');
    expect(getAqiCategory(101).level).toBe('unhealthy-sensitive');
    expect(getAqiCategory(150).level).toBe('unhealthy-sensitive');
    expect(getAqiCategory(151).level).toBe('unhealthy');
    expect(getAqiCategory(200).level).toBe('unhealthy');
    expect(getAqiCategory(201).level).toBe('very-unhealthy');
    expect(getAqiCategory(300).level).toBe('very-unhealthy');
    expect(getAqiCategory(301).level).toBe('hazardous');
    expect(getAqiCategory(500).level).toBe('hazardous');
  });

  it('handles negative or extreme values gracefully', () => {
    expect(getAqiCategory(-10).level).toBe('good');
    expect(getAqiCategory(600).level).toBe('hazardous');
  });

  it('provides icon, color, and bgColor for non-color-only identification', () => {
    const cat = getAqiCategory(175);
    expect(cat.icon).toBeDefined();
    expect(cat.color).toBeDefined();
    expect(cat.label).toBe('Unhealthy');
  });
});

describe('Baseline Exposure Math', () => {
  it('computes positive exposure metrics for normal profile', () => {
    const baseline = calculateBaseline(sampleProfile, 150);
    expect(baseline.dailyExposureUgM3Hours).toBeGreaterThan(0);
    expect(baseline.averageExposureUgM3).toBeGreaterThan(0);
    expect(baseline.cigaretteEquivalentPerDay).toBeGreaterThan(0);
  });

  it('handles zero outdoor PM2.5', () => {
    const baseline = calculateBaseline(sampleProfile, 0);
    expect(baseline.dailyExposureUgM3Hours).toBeGreaterThanOrEqual(0);
    expect(baseline.cigaretteEquivalentPerDay).toBeGreaterThanOrEqual(0);
  });

  it('handles work-from-home (zero commute)', () => {
    const wfhProfile: HouseholdProfile = {
      ...sampleProfile,
      commuteMode: 'work-from-home',
      commuteMinutesPerDay: 0,
    };
    const baseline = calculateBaseline(wfhProfile, 100);
    expect(baseline.averageExposureUgM3).toBeGreaterThan(0);
  });
});

describe('Action Impacts and Invariants', () => {
  it('calculates impact for every catalog action without crashing', () => {
    const outdoorPm25 = 120;
    const assessment = calculateAllImpacts(sampleProfile, outdoorPm25);
    expect(assessment.baseline.dailyExposureUgM3Hours).toBeGreaterThan(0);
    expect(assessment.actions.length).toBe(ACTION_CATALOG.length);

    for (const impact of assessment.actions) {
      // Invariant 1: an action never increases exposure (delta >= 0)
      expect(impact.exposureReductionAbsolute).toBeGreaterThanOrEqual(0);
      expect(impact.exposureReductionPercent).toBeGreaterThanOrEqual(0);
      expect(impact.cigarettesAvoided).toBeGreaterThanOrEqual(0);
      expect(impact.co2eAvoidedPerWeek).toBeGreaterThanOrEqual(0);

      // Invariant 2: deltas never exceed baseline
      expect(impact.exposureReductionAbsolute).toBeLessThanOrEqual(
        assessment.baseline.dailyExposureUgM3Hours,
      );
      expect(impact.exposureReductionPercent).toBeLessThanOrEqual(100);
    }
  });

  it('gives N95 action non-zero reduction during commute', () => {
    const n95Action = getAction('use_n95_commute');
    expect(n95Action).toBeDefined();
    if (n95Action) {
      const impact = calculateActionImpact(sampleProfile, 100, n95Action);
      expect(impact.exposureReductionAbsolute).toBeGreaterThan(0);
      expect(impact.exposureReductionPercent).toBeGreaterThan(0);
    }
  });

  it('gives metro switch positive CO2e reduction from car commute', () => {
    const metroAction = getAction('switch_to_metro');
    expect(metroAction).toBeDefined();
    if (metroAction) {
      const impact = calculateActionImpact(sampleProfile, 100, metroAction);
      expect(impact.co2eAvoidedPerWeek).toBeGreaterThan(0);
    }
  });
});

describe('What-If Scenario Calculations', () => {
  it('updates exposure when toggling purifier and masks', () => {
    const baseline = calculateBaseline(sampleProfile, 150);
    expect(baseline.dailyExposureUgM3Hours).toBeGreaterThan(0);
    const resultNoInterventions = calculateWhatIf(sampleProfile, 150, {
      metroDaysPerWeek: 0,
      purifierOn: false,
      n95OnCommute: false,
      inductionCookingDays: 0,
    });

    const resultWithInterventions = calculateWhatIf(sampleProfile, 150, {
      metroDaysPerWeek: 5,
      purifierOn: true,
      n95OnCommute: true,
      inductionCookingDays: 7,
    });

    // Exposure with interventions must be strictly lower
    expect(resultWithInterventions.weeklyExposure).toBeLessThan(
      resultNoInterventions.weeklyExposure,
    );
    expect(resultWithInterventions.cigaretteEquivalents).toBeLessThan(
      resultNoInterventions.cigaretteEquivalents,
    );
    expect(resultWithInterventions.co2ePerWeek).toBeLessThan(
      resultNoInterventions.co2ePerWeek,
    );
  });
});

describe('Ventilation and Outdoor Windows', () => {
  it('finds lowest and highest 2-hour windows', () => {
    const hourly: HourlyAirData[] = Array.from({ length: 24 }, (_, i) => ({
      time: `2026-11-23T${String(i).padStart(2, '0')}:00:00Z`,
      pm25: i === 14 || i === 15 ? 20 : 150, // lowest in afternoon
      pm10: 200,
      usAqi: i === 14 || i === 15 ? 40 : 250,
    }));

    const best = findBestVentilationWindow(hourly);
    const worst = findWorstOutdoorWindow(hourly);

    expect(best.startHour).toBe(14);
    expect(best.avgAqi).toBeLessThan(worst.avgAqi);
  });
});
