import { describe, it, expect } from 'vitest';
import { evaluateDecisions, getTopThreePriorities } from '../engine/decisionEngine.js';
import type { HouseholdProfile, AirQualitySummary } from '../types.js';

const mockAirSummary: AirQualitySummary = {
  current: {
    pm25: 220,
    pm10: 340,
    usAqi: 270,
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
    avgAqi: 110,
    label: '1:00 PM - 3:00 PM',
  },
  worstOutdoorWindow: {
    startHour: 7,
    endHour: 9,
    avgAqi: 310,
    label: '7:00 AM - 9:00 AM',
  },
  fetchedAt: new Date().toISOString(),
};

const baseProfile: HouseholdProfile = {
  householdSize: 4,
  hasChildren: true,
  hasElderly: true,
  hasSensitiveMembers: false,
  commuteMode: 'two-wheeler',
  commuteMinutesPerDay: 45,
  cookingFuel: 'biomass',
  hasAirPurifier: false,
  homeType: 'apartment',
  heatingType: 'wood-coal',
  language: 'en',
};

describe('Decision Engine & Logical Ranking', () => {
  it('ranks actions deterministically and produces top 3 priorities', () => {
    const trace1 = evaluateDecisions(baseProfile, mockAirSummary);
    const trace2 = evaluateDecisions(baseProfile, mockAirSummary);

    expect(trace1.topActions.length).toBeGreaterThan(0);
    // Determinism property: identical inputs yield identical outputs
    expect(trace1.topActions[0].actionId).toBe(trace2.topActions[0].actionId);
    expect(trace1.topActions[0].score).toBe(trace2.topActions[0].score);

    const topThree = getTopThreePriorities(trace1);
    expect(topThree).toHaveLength(3);
    expect(topThree[0].score).toBeGreaterThanOrEqual(topThree[1].score);
    expect(topThree[1].score).toBeGreaterThanOrEqual(topThree[2].score);
  });

  it('excludes run_purifier_bedroom when purifier is not owned with stated reason', () => {
    const trace = evaluateDecisions(baseProfile, mockAirSummary);
    const topIds = trace.topActions.map((a) => a.actionId);
    expect(topIds).not.toContain('run_purifier_bedroom');

    const excluded = trace.excludedActions.find((a) => a.actionId === 'run_purifier_bedroom');
    expect(excluded).toBeDefined();
    expect(excluded?.reason).toContain('No air purifier currently owned');
  });

  it('skips commute actions for work-from-home households', () => {
    const wfhProfile: HouseholdProfile = {
      ...baseProfile,
      commuteMode: 'work-from-home',
      commuteMinutesPerDay: 0,
    };

    const trace = evaluateDecisions(wfhProfile, mockAirSummary);
    const topIds = trace.topActions.map((a) => a.actionId);

    expect(topIds).not.toContain('use_n95_commute');
    expect(topIds).not.toContain('switch_to_metro');
    expect(topIds).not.toContain('switch_to_bus');
  });

  it('prioritizes fuel switching for biomass cooking', () => {
    const trace = evaluateDecisions(baseProfile, mockAirSummary);
    const topIds = trace.topActions.slice(0, 5).map((a) => a.actionId);
    expect(topIds).toContain('induction_cooking');
  });

  it('respects free affordability filter', () => {
    const freeTrace = evaluateDecisions(baseProfile, mockAirSummary, 'free');
    const topIds = freeTrace.topActions.map((a) => a.actionId);

    // Medium cost actions must be excluded
    expect(topIds).not.toContain('induction_cooking');
    expect(topIds).not.toContain('build_corsi_box');
  });

  it('populates decision factors and seasonal context', () => {
    const winterDate = new Date(2026, 10, 23, 8, 0, 0); // Nov 23, 8 AM
    const trace = evaluateDecisions(baseProfile, mockAirSummary, 'all', winterDate);

    expect(trace.seasonFactors.length).toBeGreaterThan(0);
    expect(trace.formula).toBeDefined();

    // The top action must have explanatory trigger factors
    expect(trace.topActions[0].reason.length).toBeGreaterThan(0);
  });
});
