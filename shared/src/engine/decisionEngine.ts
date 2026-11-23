import type {
  HouseholdProfile,
  AirQualitySummary,
  AffordabilityFilter,
  RankedAction,
  DecisionTrace,
  DecisionFactor,
} from '../types.js';
import { ACTION_CATALOG } from '../actions.js';
import { calculateActionImpact } from './index.js';
import {
  CONTEXT_RULES,
  checkActionFeasibility,
  getActiveSeasonalFactors,
} from './decisionRules.js';

/**
 * Numerical effort lookup mapping difficulty and cost to 1-3 scales.
 * effort = difficultyScore + costScore (range 2 to 6).
 */
const DIFFICULTY_WEIGHT: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

const COST_WEIGHT: Record<string, number> = {
  free: 1,
  low: 2,
  medium: 3,
};

/**
 * Evaluates candidate actions using the deterministic formula:
 * score = (impact_ug_m3 × feasibility / effort) × ruleMultiplier
 *
 * Excludes infeasible actions with reasons and produces ranked top priorities.
 */
export function evaluateDecisions(
  profile: HouseholdProfile,
  airSummary: AirQualitySummary,
  affordabilityFilter: AffordabilityFilter = 'all',
  now: Date = new Date(),
): DecisionTrace {
  const outdoorPm25 = airSummary.current.pm25;

  const rankedActions: RankedAction[] = [];
  const excludedActions: Array<{ actionId: string; reason: string }> = [];

  for (const actionDef of ACTION_CATALOG) {
    // 1. Feasibility gate
    const feasibilityCheck = checkActionFeasibility(actionDef, profile, affordabilityFilter);
    if (!feasibilityCheck.feasible) {
      excludedActions.push({
        actionId: actionDef.id,
        reason: feasibilityCheck.reason ?? 'Infeasible under current household parameters',
      });
      continue;
    }

    // 2. Compute deterministic physical impact
    const impact = calculateActionImpact(profile, outdoorPm25, actionDef);

    // Baseline exposure in ug/m3
    const impactUgM3 = impact.exposureReductionAbsolute / 24;

    // 3. Compute effort
    // Mapping default difficulty/cost for catalog items
    let difficulty = 'easy';
    let cost = 'free';

    if (actionDef.id === 'build_corsi_box' || actionDef.id === 'induction_cooking') {
      difficulty = 'medium';
      cost = 'medium';
    } else if (actionDef.id === 'switch_to_metro' || actionDef.id === 'seal_gaps_doors') {
      difficulty = 'medium';
      cost = 'low';
    } else if (actionDef.id === 'use_n95_commute' || actionDef.id === 'run_purifier_bedroom') {
      difficulty = 'easy';
      cost = 'low';
    }

    const effortScore =
      (DIFFICULTY_WEIGHT[difficulty] ?? 1) + (COST_WEIGHT[cost] ?? 1);

    // 4. Evaluate contextual rule multipliers and trigger factors
    let contextMultiplier = 1.0;
    const triggeredFactors: DecisionFactor[] = [];

    for (const rule of CONTEXT_RULES) {
      if (
        rule.targetActionIds.includes(actionDef.id) &&
        rule.condition(profile, airSummary, now)
      ) {
        contextMultiplier *= rule.multiplier;
        triggeredFactors.push({
          code: rule.id,
          description: rule.factorDescription(profile, airSummary),
          weight: rule.multiplier,
        });
      }
    }

    // Baseline formula: score = (impactUgM3 * 1 / effort) * multiplier
    // Add baseline component so zero-exposure-reduction actions (like carpool CO2e) still rank sensibly
    const co2eWeight = impact.co2eAvoidedPerWeek > 0 ? (impact.co2eAvoidedPerWeek / 1000) * 0.5 : 0;
    const baseValue = Math.max(1.0, impactUgM3 * 2 + co2eWeight);
    const finalScore =
      Math.round(((baseValue / effortScore) * contextMultiplier) * 10) / 10;

    // Synthesize human-readable explanation
    const reasonParts = triggeredFactors.map((f) => f.description);
    if (reasonParts.length === 0) {
      reasonParts.push(
        `Reduces exposure by ${Math.round(impact.exposureReductionPercent)}% at ${difficulty} effort and ${cost} cost`,
      );
    }

    rankedActions.push({
      actionId: actionDef.id,
      score: finalScore,
      feasibility: 1.0,
      effort: effortScore,
      impactUgM3: Math.round(impactUgM3 * 10) / 10,
      reason: reasonParts.join('; '),
      factors: triggeredFactors,
    });
  }

  // Sort descending by score
  rankedActions.sort((a, b) => b.score - a.score);

  return {
    topActions: rankedActions,
    excludedActions,
    seasonFactors: getActiveSeasonalFactors(now),
    formula: 'Score = (Exposure Reduction [µg/m³] × Feasibility / Effort [2–6]) × Context Rule Multipliers',
  };
}

/**
 * Returns top 3 priority actions for "Do these 3 first" presentation.
 */
export function getTopThreePriorities(trace: DecisionTrace): readonly RankedAction[] {
  return trace.topActions.slice(0, 3);
}
