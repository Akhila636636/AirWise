import type {
  HouseholdProfile,
  AirQualitySummary,
  AffordabilityFilter,
} from '../types.js';
import type { ActionDefinition } from '../actions.js';

/**
 * Contextual decision rule definition.
 * Transparent, typed data structure—no scattered inline if-statements.
 */
export interface ContextRule {
  readonly id: string;
  readonly name: string;
  readonly targetActionIds: readonly string[];
  readonly condition: (profile: HouseholdProfile, air: AirQualitySummary, now: Date) => boolean;
  readonly factorDescription: (profile: HouseholdProfile, air: AirQualitySummary) => string;
  readonly multiplier: number;
}

/**
 * Season awareness checker based on calendar date and hours.
 * Uses documented meteorology/environmental phenomena, not invented facts.
 */
export function getActiveSeasonalFactors(now: Date = new Date()): readonly string[] {
  const month = now.getMonth(); // 0 = Jan, 9 = Oct, 10 = Nov, 11 = Dec
  const hour = now.getHours();
  const factors: string[] = [];

  // Winter thermal inversion: Nov through Feb, traps pollutants near ground
  if (month === 10 || month === 11 || month === 0 || month === 1) {
    factors.push('Winter ground-level thermal inversion trapping particulate matter');
    if ((hour >= 6 && hour <= 10) || hour >= 20 || hour <= 2) {
      factors.push('Peak nocturnal/morning atmospheric inversion window');
    }
  }

  // Stubble / crop-residue post-monsoon burning season (mid-Oct to late-Nov in Indo-Gangetic plains)
  if (month === 9 || month === 10) {
    factors.push('Regional agricultural crop-residue biomass burning season');
  }

  // Winter festival and domestic heating peak (Nov - Jan)
  if (month === 10 || month === 11 || month === 0) {
    factors.push('High-density winter festival and night heating emissions period');
  }

  return factors;
}

/**
 * Explicit rule table evaluated deterministically by the decision engine.
 */
export const CONTEXT_RULES: readonly ContextRule[] = [
  {
    id: 'vulnerable_severe_aqi',
    name: 'Vulnerable Members in Severe Smog',
    targetActionIds: ['limit_outdoor_children', 'shift_exercise_indoors', 'use_n95_commute'],
    condition: (profile, air) =>
      (profile.hasChildren || profile.hasElderly || profile.hasSensitiveMembers) &&
      air.current.usAqi >= 150,
    factorDescription: (profile, air) =>
      `Household includes ${[
        profile.hasChildren ? 'children' : '',
        profile.hasElderly ? 'elderly' : '',
        profile.hasSensitiveMembers ? 'respiratory-sensitive' : '',
      ].filter(Boolean).join(' and ')} during high pollution (AQI ${air.current.usAqi})`,
    multiplier: 1.8,
  },
  {
    id: 'dirty_cooking_fuel',
    name: 'Biomass or Kerosene Fuel Transition',
    targetActionIds: ['induction_cooking', 'cooking_ventilation'],
    condition: (profile) =>
      profile.cookingFuel === 'biomass' || profile.cookingFuel === 'kerosene',
    factorDescription: (profile) =>
      `Using high-emission cooking fuel (${profile.cookingFuel.toUpperCase()}) produces intense indoor soot spikes`,
    multiplier: 3.2,
  },
  {
    id: 'active_commute_high_smog',
    name: 'Two-Wheeler or Cycle Exposure in Traffic',
    targetActionIds: ['use_n95_commute', 'switch_to_metro', 'switch_to_bus'],
    condition: (profile, air) =>
      (profile.commuteMode === 'two-wheeler' || profile.commuteMode === 'cycle') &&
      profile.commuteMinutesPerDay > 0 &&
      air.current.usAqi >= 100,
    factorDescription: (profile, air) =>
      `Daily ${profile.commuteMinutesPerDay}-min ${profile.commuteMode} commute directly in tailpipe exhaust (AQI ${air.current.usAqi})`,
    multiplier: 1.7,
  },
  {
    id: 'car_emissions_reduction',
    name: 'Car Commute Emission Transition',
    targetActionIds: ['switch_to_metro', 'switch_to_bus', 'carpool'],
    condition: (profile) => profile.commuteMode === 'car' && profile.commuteMinutesPerDay >= 30,
    factorDescription: (profile) =>
      `Daily solo car commute (${profile.commuteMinutesPerDay} min) is prime target for weekly community CO2e savings`,
    multiplier: 1.4,
  },
  {
    id: 'purifier_runtime_focus',
    name: 'Purifier Runtime Optimization',
    targetActionIds: ['run_purifier_bedroom'],
    condition: (profile, air) => profile.hasAirPurifier && air.current.usAqi >= 100,
    factorDescription: () => 'Air purifier already owned—optimizing runtime and door seals yields maximum exposure reduction at zero additional hardware cost',
    multiplier: 1.9,
  },
  {
    id: 'no_purifier_low_cost_cleaner',
    name: 'DIY Filtration Alternative for Unpurified Homes',
    targetActionIds: ['build_corsi_box', 'seal_gaps_doors'],
    condition: (profile, air) => !profile.hasAirPurifier && air.current.usAqi >= 150,
    factorDescription: () => 'No air purifier owned during severe smog—Corsi-Rosenthal box and gap sealing deliver HEPA-level clean air delivery at fraction of commercial purifier price',
    multiplier: 1.6,
  },
  {
    id: 'winter_inversion_ventilation',
    name: 'Inversion Smog Window Control',
    targetActionIds: ['close_windows_peak_hours', 'ventilate_low_pm_window'],
    condition: (_profile, air, now) => {
      const month = now.getMonth();
      return (month === 10 || month === 11 || month === 0 || month === 1) && air.current.usAqi >= 150;
    },
    factorDescription: (_profile, air) =>
      `Winter thermal inversion trapping toxic ground smog (AQI ${air.current.usAqi}); strict ventilation timing required`,
    multiplier: 1.5,
  },
];

/**
 * Checks if an action is practically feasible given household constraints.
 * Returns { feasible: boolean, reason?: string }.
 */
export function checkActionFeasibility(
  action: ActionDefinition,
  profile: HouseholdProfile,
  filter: AffordabilityFilter = 'all',
): { feasible: boolean; reason?: string } {
  // Purifier actions require owning a purifier
  if (action.id === 'run_purifier_bedroom' && !profile.hasAirPurifier) {
    return { feasible: false, reason: 'No air purifier currently owned (recommend DIY Corsi box instead)' };
  }

  // WFH skips all commute-related actions
  if (
    (action.category === 'protection' && action.id.includes('commute')) ||
    action.id === 'switch_to_metro' ||
    action.id === 'switch_to_bus' ||
    action.id === 'carpool'
  ) {
    if (profile.commuteMode === 'work-from-home' || profile.commuteMinutesPerDay === 0) {
      return { feasible: false, reason: 'Work-from-home household with no daily commute' };
    }
  }

  // If already commuting by metro, switching to metro is redundant
  if (action.id === 'switch_to_metro' && profile.commuteMode === 'metro') {
    return { feasible: false, reason: 'Already commuting via metro rail' };
  }

  // If already cooking with induction, switching to induction is redundant
  if (action.id === 'induction_cooking' && profile.cookingFuel === 'induction') {
    return { feasible: false, reason: 'Already using induction/electric cooking' };
  }

  // If already owning a commercial purifier, building DIY box has lower priority unless requested
  if (action.id === 'build_corsi_box' && profile.hasAirPurifier) {
    return { feasible: false, reason: 'Commercial purifier already active in household' };
  }

  // Affordability filter constraints
  if (filter === 'free') {
    if (action.id === 'build_corsi_box' || action.id === 'induction_cooking') {
      return { feasible: false, reason: 'Filtered by zero-cost affordability selection' };
    }
  }

  return { feasible: true };
}
