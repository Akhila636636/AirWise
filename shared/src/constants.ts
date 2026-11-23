/**
 * Cigarette equivalence factor.
 * 22 µg/m³ PM2.5 sustained over 24h ≈ 1 cigarette.
 * Source: Berkeley Earth rule of thumb.
 * Approximate; editable.
 */
export const CIGARETTE_EQUIVALENCE_PM25 = 22;

/**
 * Indoor/outdoor PM2.5 ratio with windows closed, no purifier.
 * Approximate; editable.
 */
export const INDOOR_OUTDOOR_RATIO_CLOSED = 0.6;

/**
 * Indoor/outdoor PM2.5 ratio with windows open.
 * Approximate; editable.
 */
export const INDOOR_OUTDOOR_RATIO_OPEN = 0.9;

/**
 * Air purifier effectiveness multiplier.
 * Indoor PM2.5 = base_ratio × PURIFIER_FACTOR when purifier is running.
 * Approximate; editable.
 */
export const PURIFIER_FACTOR = 0.4;

/**
 * N95/FFP2 mask real-world fit-adjusted PM2.5 reduction factor.
 * Reduces inhaled PM2.5 by 80% during wear.
 * Approximate; editable.
 */
export const N95_REDUCTION = 0.8;

/**
 * Cloth/surgical mask PM2.5 reduction factor.
 * Reduces inhaled PM2.5 by 20% during wear.
 * Approximate; editable.
 */
export const CLOTH_MASK_REDUCTION = 0.2;

/**
 * Cooking fuel indoor PM2.5 contribution factors.
 * Relative to LPG baseline (1.0).
 * Applied as additive indoor increment during cooking hours (~2h/day).
 * Illustrative model; approximate; editable.
 */
export const COOKING_FUEL_FACTORS: Record<string, number> = {
  lpg: 1.0,
  induction: 0.3,
  biomass: 3.0,
  kerosene: 2.0,
};

/**
 * Base indoor PM2.5 increment from cooking per hour (µg/m³).
 * Multiplied by the fuel factor.
 * Approximate; editable.
 */
export const COOKING_BASE_INCREMENT = 30;

/**
 * Default cooking hours per day.
 * Approximate; editable.
 */
export const COOKING_HOURS_PER_DAY = 2;

/**
 * Emissions per commute mode in g CO2e per passenger-km.
 * Sources: IPCC, various transport studies.
 * Approximate; editable.
 */
export const COMMUTE_EMISSIONS: Record<string, number> = {
  walk: 0,
  cycle: 0,
  'two-wheeler': 50,
  car: 170,
  bus: 30,
  metro: 20,
  'work-from-home': 0,
};

/**
 * Typical urban commute speed by mode in km/h.
 * Used to convert commute minutes to km.
 * Approximate; editable.
 */
export const COMMUTE_SPEEDS: Record<string, number> = {
  walk: 5,
  cycle: 15,
  'two-wheeler': 25,
  car: 20,
  bus: 15,
  metro: 30,
  'work-from-home': 0,
};

/**
 * Hours per day assumed at home (not commuting or at work/school).
 * Approximate; editable.
 */
export const DEFAULT_HOME_HOURS = 15;

/**
 * Hours per day assumed at work/school (indoor, office-like).
 * Approximate; editable.
 */
export const DEFAULT_WORK_HOURS = 8;

/**
 * Indoor/outdoor ratio at a typical office/school.
 * Approximate; editable.
 */
export const OFFICE_INDOOR_RATIO = 0.5;

/**
 * Heating indoor PM2.5 contribution factors.
 * none = 0, electric = 0, wood-coal adds significant indoor PM2.5.
 * Applied during assumed heating hours (~6h/day in winter).
 * Approximate; editable.
 */
export const HEATING_FACTORS: Record<string, number> = {
  none: 0,
  electric: 0,
  'wood-coal': 2.5,
};

/**
 * Heating hours per day in winter.
 * Approximate; editable.
 */
export const HEATING_HOURS_PER_DAY = 6;

/**
 * Base indoor PM2.5 increment from heating per hour (µg/m³).
 * Multiplied by the heating factor.
 * Approximate; editable.
 */
export const HEATING_BASE_INCREMENT = 20;

/** AQI category definitions based on US EPA breakpoints */
export const AQI_CATEGORIES: readonly {
  readonly level: string;
  readonly label: string;
  readonly icon: string;
  readonly color: string;
  readonly bgColor: string;
  readonly min: number;
  readonly max: number;
}[] = [
  { level: 'good', label: 'Good', icon: '🟢', color: '#059669', bgColor: '#d1fae5', min: 0, max: 50 },
  { level: 'moderate', label: 'Moderate', icon: '🟡', color: '#d97706', bgColor: '#fef3c7', min: 51, max: 100 },
  { level: 'unhealthy-sensitive', label: 'Unhealthy for Sensitive Groups', icon: '🟠', color: '#ea580c', bgColor: '#ffedd5', min: 101, max: 150 },
  { level: 'unhealthy', label: 'Unhealthy', icon: '🔴', color: '#dc2626', bgColor: '#fee2e2', min: 151, max: 200 },
  { level: 'very-unhealthy', label: 'Very Unhealthy', icon: '🟣', color: '#7c3aed', bgColor: '#ede9fe', min: 201, max: 300 },
  { level: 'hazardous', label: 'Hazardous', icon: '🟤', color: '#7f1d1d', bgColor: '#fecaca', min: 301, max: 500 },
];
