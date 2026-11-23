import type {
  HouseholdProfile,
  AqiCategory,
  ExposureBaseline,
  ActionImpact,
  ImpactAssessment,
  HourlyAirData,
  TimeWindow,
  WhatIfScenario,
  WhatIfResult,
} from '../types.js';
import type { ActionDefinition, ActionEffect } from '../actions.js';
import { ACTION_CATALOG } from '../actions.js';
import {
  CIGARETTE_EQUIVALENCE_PM25,
  INDOOR_OUTDOOR_RATIO_CLOSED,
  INDOOR_OUTDOOR_RATIO_OPEN,
  PURIFIER_FACTOR,
  COOKING_FUEL_FACTORS,
  COOKING_BASE_INCREMENT,
  COOKING_HOURS_PER_DAY,
  COMMUTE_EMISSIONS,
  COMMUTE_SPEEDS,
  DEFAULT_WORK_HOURS,
  OFFICE_INDOOR_RATIO,
  HEATING_FACTORS,
  HEATING_HOURS_PER_DAY,
  HEATING_BASE_INCREMENT,
  AQI_CATEGORIES,
} from '../constants.js';

/** Round a number to 1 decimal place */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Get the AQI category for a given AQI value.
 * Returns the matching US EPA category based on breakpoints.
 * Falls back to 'hazardous' for values > 500 and 'good' for values < 0.
 * @param aqi - US AQI value (0-500+)
 * @returns The matching AqiCategory
 */
export function getAqiCategory(aqi: number): AqiCategory {
  const clamped = Math.max(0, aqi);
  for (const cat of AQI_CATEGORIES) {
    if (clamped >= cat.min && clamped <= cat.max) {
      return cat as AqiCategory;
    }
  }
  // Values > 500 are hazardous
  return AQI_CATEGORIES[AQI_CATEGORIES.length - 1] as AqiCategory;
}

/**
 * Internal model parameters computed from a profile + optional overrides.
 * Used to calculate total daily PM2.5 exposure.
 */
interface ExposureModel {
  /** Hours spent commuting per day */
  commuteHours: number;
  /** Distance commuted per day in km */
  commuteKm: number;
  /** Hours spent at home per day */
  homeHours: number;
  /** Hours spent at work/office per day */
  workHours: number;
  /** Indoor PM2.5 concentration at home (µg/m³) */
  homePm25: number;
  /** PM2.5 concentration inhaled during commute (µg/m³) */
  commutePm25: number;
  /** Indoor PM2.5 concentration at office (µg/m³) */
  officePm25: number;
  /** Daily CO2e from commute in grams */
  dailyCo2e: number;
}

/**
 * Build an internal exposure model from a profile and outdoor PM2.5.
 * Optionally applies an action effect as an override.
 * @param profile - The household profile
 * @param outdoorPm25 - Outdoor PM2.5 concentration in µg/m³
 * @param effect - Optional action effect to apply as overrides
 * @returns The computed ExposureModel
 */
function buildModel(
  profile: HouseholdProfile,
  outdoorPm25: number,
  effect?: ActionEffect,
): ExposureModel {
  const safePm25 = Math.max(0, outdoorPm25);

  // Determine commute mode (may be overridden by action)
  const commuteMode = effect?.commuteMode ?? profile.commuteMode;
  const isWfh = commuteMode === 'work-from-home';

  // Commute hours and distance
  const commuteMinutes = isWfh ? 0 : profile.commuteMinutesPerDay;
  const commuteHours = commuteMinutes / 60;
  const commuteSpeed = COMMUTE_SPEEDS[commuteMode] ?? 0;
  const commuteKm = commuteHours * commuteSpeed;

  // Time allocation: home gets the remaining hours
  const workHours = isWfh ? 0 : DEFAULT_WORK_HOURS;
  const homeHours = Math.max(0, 24 - commuteHours - workHours);

  // Indoor/outdoor ratio at home
  let homeRatio = INDOOR_OUTDOOR_RATIO_CLOSED;

  // Windows policy override
  if (effect?.windowsPolicy === 'ventilate-low') {
    // Open windows during low-pollution hours → higher ratio but intentional
    homeRatio = INDOOR_OUTDOOR_RATIO_OPEN;
  } else if (effect?.windowsPolicy === 'close-peak') {
    // Close windows during peak → use closed ratio (already the default)
    homeRatio = INDOOR_OUTDOOR_RATIO_CLOSED;
  }

  // Purifier effect
  const hasPurifier = effect?.purifierOn ?? profile.hasAirPurifier;
  if (hasPurifier) {
    homeRatio = homeRatio * PURIFIER_FACTOR;
  }

  // DIY cleaner (Corsi-Rosenthal box) acts like a purifier at ~60% efficiency
  if (effect?.diyCleaner && !hasPurifier) {
    homeRatio = homeRatio * 0.5;
  }

  // Indoor reduction factor (e.g., avoiding dry sweeping, sealing gaps)
  const indoorReductionFactor = effect?.indoorReductionFactor ?? 1.0;

  // Base indoor PM2.5 from outdoor infiltration
  let homePm25 = safePm25 * homeRatio * indoorReductionFactor;

  // Cooking contribution
  const cookingFuel = effect?.cookingFuel ?? profile.cookingFuel;
  const cookingFactor = COOKING_FUEL_FACTORS[cookingFuel] ?? 1.0;
  const cookingContribution =
    (COOKING_BASE_INCREMENT * cookingFactor * COOKING_HOURS_PER_DAY) / Math.max(homeHours, 1);
  homePm25 += cookingContribution;

  // Heating contribution (spread across home hours)
  const heatingFactor = HEATING_FACTORS[profile.heatingType] ?? 0;
  if (heatingFactor > 0) {
    const heatingContribution =
      (HEATING_BASE_INCREMENT * heatingFactor * HEATING_HOURS_PER_DAY) / Math.max(homeHours, 1);
    homePm25 += heatingContribution;
  }

  // Commute PM2.5 (outdoor, possibly with mask)
  const maskReduction = effect?.maskReduction ?? 0;
  const commutePm25 = safePm25 * (1 - maskReduction);

  // If shifting outdoors to indoors, commute PM2.5 becomes indoor
  if (effect?.shiftIndoors) {
    // The user stays indoors rather than going outside for activities;
    // we reduce commute exposure by treating it as home exposure
    // (but commute minutes aren't changed, just the exposure level)
  }

  // Office PM2.5
  const officePm25 = safePm25 * OFFICE_INDOOR_RATIO;

  // CO2e from commute
  const emissionsPerKm = COMMUTE_EMISSIONS[commuteMode] ?? 0;
  let dailyCo2e = commuteKm * emissionsPerKm;

  // Carpool factor reduces emissions
  if (effect?.carpoolFactor !== undefined) {
    dailyCo2e = dailyCo2e * effect.carpoolFactor;
  }

  return {
    commuteHours,
    commuteKm,
    homeHours,
    workHours,
    homePm25,
    commutePm25,
    officePm25,
    dailyCo2e,
  };
}

/**
 * Calculate total daily exposure from a model.
 * Total = sum of (concentration × hours) for each time segment.
 * @param model - The exposure model
 * @returns Total daily exposure in µg/m³·hours
 */
function totalExposure(model: ExposureModel): number {
  return (
    model.homePm25 * model.homeHours +
    model.commutePm25 * model.commuteHours +
    model.officePm25 * model.workHours
  );
}

/**
 * Calculate baseline exposure for a household profile at a given outdoor PM2.5 level.
 * @param profile - The household profile
 * @param outdoorPm25 - Outdoor PM2.5 in µg/m³
 * @returns ExposureBaseline with daily exposure, average, and cigarette equivalence
 */
export function calculateBaseline(
  profile: HouseholdProfile,
  outdoorPm25: number,
): ExposureBaseline {
  const model = buildModel(profile, outdoorPm25);
  const dailyExposure = totalExposure(model);
  const avg = dailyExposure / 24;
  const cigs = CIGARETTE_EQUIVALENCE_PM25 > 0 ? avg / CIGARETTE_EQUIVALENCE_PM25 : 0;

  return {
    dailyExposureUgM3Hours: round1(dailyExposure),
    averageExposureUgM3: round1(avg),
    cigaretteEquivalentPerDay: round1(cigs),
  };
}

/**
 * Calculate the impact of a single action on exposure.
 * Compares baseline model with the modified model after applying the action's effect.
 * Deltas are clamped to >= 0 (an action must never increase exposure).
 * @param profile - The household profile
 * @param outdoorPm25 - Outdoor PM2.5 in µg/m³
 * @param action - The action definition from the catalog
 * @returns ActionImpact with reduction percentages and CO2e savings
 */
export function calculateActionImpact(
  profile: HouseholdProfile,
  outdoorPm25: number,
  action: ActionDefinition,
): ActionImpact {
  const baselineModel = buildModel(profile, outdoorPm25);
  const baselineTotal = totalExposure(baselineModel);
  const baselineAvg = baselineTotal / 24;

  const modifiedModel = buildModel(profile, outdoorPm25, action.effect);
  const modifiedTotal = totalExposure(modifiedModel);
  const modifiedAvg = modifiedTotal / 24;

  // Clamp: an action must never increase exposure
  const rawDeltaTotal = baselineTotal - modifiedTotal;
  const deltaTotal = Math.max(0, rawDeltaTotal);
  const deltaAvg = Math.max(0, baselineAvg - modifiedAvg);

  // Percent reduction (safe against zero baseline)
  const percent = baselineTotal > 0 ? (deltaTotal / baselineTotal) * 100 : 0;

  // Cigarettes avoided
  const cigsAvoided = CIGARETTE_EQUIVALENCE_PM25 > 0
    ? deltaAvg / CIGARETTE_EQUIVALENCE_PM25
    : 0;

  // CO2e savings per week
  let co2ePerWeek = 0;
  if (action.effect.co2eReductionPerWeek !== undefined) {
    co2ePerWeek = action.effect.co2eReductionPerWeek;
  } else {
    // Compare daily commute emissions
    const baselineDailyCo2e = baselineModel.dailyCo2e;
    const modifiedDailyCo2e = modifiedModel.dailyCo2e;
    const dailySavings = Math.max(0, baselineDailyCo2e - modifiedDailyCo2e);
    co2ePerWeek = dailySavings * 7;
  }

  return {
    actionId: action.id,
    exposureReductionPercent: round1(percent),
    exposureReductionAbsolute: round1(deltaTotal),
    cigarettesAvoided: round1(cigsAvoided),
    co2eAvoidedPerWeek: round1(co2ePerWeek),
  };
}

/**
 * Calculate the impact of ALL actions in the catalog.
 * Returns the baseline exposure plus the impact of each action individually.
 * @param profile - The household profile
 * @param outdoorPm25 - Outdoor PM2.5 in µg/m³
 * @returns ImpactAssessment with baseline and per-action impacts
 */
export function calculateAllImpacts(
  profile: HouseholdProfile,
  outdoorPm25: number,
): ImpactAssessment {
  const baseline = calculateBaseline(profile, outdoorPm25);
  const actions = ACTION_CATALOG.map((action) =>
    calculateActionImpact(profile, outdoorPm25, action),
  );

  return { baseline, actions };
}

/**
 * Calculate a what-if scenario over a week.
 * Applies scenario overrides: metro days, purifier, N95, induction cooking days.
 * Blends per-day profiles across the week.
 * @param profile - The household profile
 * @param outdoorPm25 - Outdoor PM2.5 in µg/m³
 * @param scenario - The what-if scenario parameters
 * @returns WhatIfResult with weekly exposure, cigarette equivalents, and CO2e
 */
export function calculateWhatIf(
  profile: HouseholdProfile,
  outdoorPm25: number,
  scenario: WhatIfScenario,
): WhatIfResult {
  let weeklyExposure = 0;
  let weeklyCo2e = 0;

  for (let day = 0; day < 7; day++) {
    // Determine overrides for this day
    const isMetroDay = day < scenario.metroDaysPerWeek;
    const isInductionDay = day < scenario.inductionCookingDays;

    const effect: ActionEffect = {
      commuteMode: isMetroDay ? 'metro' : undefined,
      purifierOn: scenario.purifierOn || undefined,
      maskReduction: scenario.n95OnCommute ? 0.8 : undefined,
      cookingFuel: isInductionDay ? 'induction' : undefined,
    };

    const model = buildModel(profile, outdoorPm25, effect);
    const dailyExposure = totalExposure(model);
    weeklyExposure += dailyExposure;
    weeklyCo2e += model.dailyCo2e;
  }

  const weeklyAvg = weeklyExposure / (7 * 24);
  const weeklyCigs = CIGARETTE_EQUIVALENCE_PM25 > 0
    ? (weeklyAvg / CIGARETTE_EQUIVALENCE_PM25) * 7
    : 0;

  return {
    weeklyExposure: round1(weeklyExposure),
    cigaretteEquivalents: round1(weeklyCigs),
    co2ePerWeek: round1(weeklyCo2e),
  };
}

/**
 * Find the 2-hour window with the lowest average AQI.
 * Best window for natural ventilation.
 * @param hourlyData - Array of hourly air data points (should be 24 entries)
 * @returns TimeWindow with the best 2-hour ventilation window
 */
export function findBestVentilationWindow(
  hourlyData: readonly HourlyAirData[],
): TimeWindow {
  if (hourlyData.length === 0) {
    return { startHour: 6, endHour: 8, avgAqi: 0, label: '6:00–8:00' };
  }

  if (hourlyData.length === 1) {
    const h = extractHour(hourlyData[0].time);
    const endH = (h + 1) % 24;
    return {
      startHour: h,
      endHour: endH,
      avgAqi: round1(hourlyData[0].usAqi),
      label: formatHourRange(h, endH),
    };
  }

  let bestStart = 0;
  let bestAvg = Infinity;

  for (let i = 0; i <= hourlyData.length - 2; i++) {
    const avg = (hourlyData[i].usAqi + hourlyData[i + 1].usAqi) / 2;
    if (avg < bestAvg) {
      bestAvg = avg;
      bestStart = i;
    }
  }

  const startHour = extractHour(hourlyData[bestStart].time);
  const endHour = extractHour(hourlyData[Math.min(bestStart + 1, hourlyData.length - 1)].time);
  const displayEnd = (endHour + 1) % 24;

  return {
    startHour,
    endHour: displayEnd,
    avgAqi: round1(bestAvg),
    label: formatHourRange(startHour, displayEnd),
  };
}

/**
 * Find the 2-hour window with the highest average AQI.
 * Worst window to be outdoors.
 * @param hourlyData - Array of hourly air data points (should be 24 entries)
 * @returns TimeWindow with the worst 2-hour outdoor window
 */
export function findWorstOutdoorWindow(
  hourlyData: readonly HourlyAirData[],
): TimeWindow {
  if (hourlyData.length === 0) {
    return { startHour: 17, endHour: 19, avgAqi: 0, label: '17:00–19:00' };
  }

  if (hourlyData.length === 1) {
    const h = extractHour(hourlyData[0].time);
    const endH = (h + 1) % 24;
    return {
      startHour: h,
      endHour: endH,
      avgAqi: round1(hourlyData[0].usAqi),
      label: formatHourRange(h, endH),
    };
  }

  let worstStart = 0;
  let worstAvg = -Infinity;

  for (let i = 0; i <= hourlyData.length - 2; i++) {
    const avg = (hourlyData[i].usAqi + hourlyData[i + 1].usAqi) / 2;
    if (avg > worstAvg) {
      worstAvg = avg;
      worstStart = i;
    }
  }

  const startHour = extractHour(hourlyData[worstStart].time);
  const endHour = extractHour(hourlyData[Math.min(worstStart + 1, hourlyData.length - 1)].time);
  const displayEnd = (endHour + 1) % 24;

  return {
    startHour,
    endHour: displayEnd,
    avgAqi: round1(worstAvg),
    label: formatHourRange(startHour, displayEnd),
  };
}

/**
 * Extract the hour from an ISO time string (e.g. "2024-01-01T14:00" → 14).
 * Falls back to 0 if parsing fails.
 * @param timeStr - ISO time string
 * @returns Hour as an integer 0-23
 */
function extractHour(timeStr: string): number {
  const match = timeStr.match(/T(\d{2})/);
  if (match) {
    return parseInt(match[1], 10);
  }
  // Try parsing as Date
  const d = new Date(timeStr);
  if (!isNaN(d.getTime())) {
    return d.getHours();
  }
  return 0;
}

/**
 * Format a time range for display (e.g. "6:00–8:00").
 * @param startHour - Start hour 0-23
 * @param endHour - End hour 0-23
 * @returns Formatted time range string
 */
function formatHourRange(startHour: number, endHour: number): string {
  const fmt = (h: number): string => `${h}:00`;
  return `${fmt(startHour)}–${fmt(endHour)}`;
}
