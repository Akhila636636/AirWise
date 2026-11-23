import type { ActionCategory } from './types.js';

/** Describes how an action modifies the exposure model */
export interface ActionEffect {
  /** If set, overrides commute mode */
  readonly commuteMode?: string;
  /** If set, applies mask reduction during commute */
  readonly maskReduction?: number;
  /** If set, toggles purifier */
  readonly purifierOn?: boolean;
  /** If set, overrides indoor/outdoor ratio behavior */
  readonly windowsPolicy?: 'close-peak' | 'ventilate-low';
  /** If set, overrides cooking fuel */
  readonly cookingFuel?: string;
  /** If set, shifts outdoor activity indoors */
  readonly shiftIndoors?: boolean;
  /** If set, avoids dry sweeping (reduces indoor PM2.5 by factor) */
  readonly indoorReductionFactor?: number;
  /** If set, builds a Corsi-Rosenthal box (DIY purifier) */
  readonly diyCleaner?: boolean;
  /** If set, provides CO2e reduction from avoiding waste burning per week in grams */
  readonly co2eReductionPerWeek?: number;
  /** If set, carpooling factor (reduces emissions by this fraction) */
  readonly carpoolFactor?: number;
}

/** A single action in the catalog with its engine-effect parameters */
export interface ActionDefinition {
  readonly id: string;
  readonly category: ActionCategory;
  readonly titleKey: string;
  /** What the action modifies in the engine model */
  readonly effect: ActionEffect;
}

/** Complete catalog of all supported actions */
export const ACTION_CATALOG: readonly ActionDefinition[] = [
  {
    id: 'use_n95_commute',
    category: 'protection',
    titleKey: 'action.use_n95_commute',
    effect: { maskReduction: 0.8 },
  },
  {
    id: 'use_cloth_mask',
    category: 'protection',
    titleKey: 'action.use_cloth_mask',
    effect: { maskReduction: 0.2 },
  },
  {
    id: 'switch_to_metro',
    category: 'sustainable',
    titleKey: 'action.switch_to_metro',
    effect: { commuteMode: 'metro' },
  },
  {
    id: 'switch_to_bus',
    category: 'sustainable',
    titleKey: 'action.switch_to_bus',
    effect: { commuteMode: 'bus' },
  },
  {
    id: 'run_purifier_bedroom',
    category: 'indoor',
    titleKey: 'action.run_purifier_bedroom',
    effect: { purifierOn: true },
  },
  {
    id: 'close_windows_peak_hours',
    category: 'indoor',
    titleKey: 'action.close_windows_peak_hours',
    effect: { windowsPolicy: 'close-peak' },
  },
  {
    id: 'ventilate_low_pm_window',
    category: 'indoor',
    titleKey: 'action.ventilate_low_pm_window',
    effect: { windowsPolicy: 'ventilate-low' },
  },
  {
    id: 'induction_cooking',
    category: 'sustainable',
    titleKey: 'action.induction_cooking',
    effect: { cookingFuel: 'induction' },
  },
  {
    id: 'avoid_waste_burning',
    category: 'sustainable',
    titleKey: 'action.avoid_waste_burning',
    effect: { co2eReductionPerWeek: 5000 },
  },
  {
    id: 'build_corsi_box',
    category: 'indoor',
    titleKey: 'action.build_corsi_box',
    effect: { diyCleaner: true },
  },
  {
    id: 'avoid_dry_sweeping',
    category: 'indoor',
    titleKey: 'action.avoid_dry_sweeping',
    effect: { indoorReductionFactor: 0.85 },
  },
  {
    id: 'shift_exercise_indoors',
    category: 'routine',
    titleKey: 'action.shift_exercise_indoors',
    effect: { shiftIndoors: true },
  },
  {
    id: 'carpool',
    category: 'sustainable',
    titleKey: 'action.carpool',
    effect: { carpoolFactor: 0.5 },
  },
  {
    id: 'limit_outdoor_children',
    category: 'protection',
    titleKey: 'action.limit_outdoor_children',
    effect: { shiftIndoors: true },
  },
  {
    id: 'seal_gaps_doors',
    category: 'indoor',
    titleKey: 'action.seal_gaps_doors',
    effect: { indoorReductionFactor: 0.9 },
  },
  {
    id: 'wet_mop_cleaning',
    category: 'indoor',
    titleKey: 'action.wet_mop_cleaning',
    effect: { indoorReductionFactor: 0.9 },
  },
  {
    id: 'humidity_control',
    category: 'indoor',
    titleKey: 'action.humidity_control',
    effect: { indoorReductionFactor: 0.92 },
  },
  {
    id: 'cooking_ventilation',
    category: 'indoor',
    titleKey: 'action.cooking_ventilation',
    effect: { indoorReductionFactor: 0.7 },
  },
];

/** Get action by ID, returns undefined for unknown IDs */
export function getAction(id: string): ActionDefinition | undefined {
  return ACTION_CATALOG.find((a) => a.id === id);
}

/** Get all valid action IDs */
export function getActionIds(): readonly string[] {
  return ACTION_CATALOG.map((a) => a.id);
}

/** Filter unknown action IDs, returning only valid ones */
export function filterValidActionIds(ids: readonly string[]): string[] {
  const validIds = new Set(getActionIds());
  return ids.filter((id) => validIds.has(id));
}
