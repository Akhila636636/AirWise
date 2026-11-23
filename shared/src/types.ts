/** AQI category with associated metadata */
export interface AqiCategory {
  readonly level: 'good' | 'moderate' | 'unhealthy-sensitive' | 'unhealthy' | 'very-unhealthy' | 'hazardous';
  readonly label: string;
  readonly icon: string;
  readonly color: string;
  readonly bgColor: string;
  readonly min: number;
  readonly max: number;
}

/** Commute mode options */
export type CommuteMode = 'walk' | 'cycle' | 'two-wheeler' | 'car' | 'bus' | 'metro' | 'work-from-home';

/** Cooking fuel type */
export type CookingFuel = 'lpg' | 'induction' | 'biomass' | 'kerosene';

/** Home type */
export type HomeType = 'apartment' | 'independent-house' | 'informal-housing';

/** Heating type */
export type HeatingType = 'none' | 'electric' | 'wood-coal';

/** Supported languages */
export type Language = 'en' | 'hi' | 'te';

/** Household profile - no PII stored */
export interface HouseholdProfile {
  readonly householdSize: number;
  readonly hasChildren: boolean;
  readonly hasElderly: boolean;
  readonly hasSensitiveMembers: boolean;
  readonly commuteMode: CommuteMode;
  readonly commuteMinutesPerDay: number;
  readonly cookingFuel: CookingFuel;
  readonly hasAirPurifier: boolean;
  readonly homeType: HomeType;
  readonly heatingType: HeatingType;
  readonly language: Language;
  readonly freeText?: string;
}

/** Location data */
export interface Location {
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly country?: string;
  readonly admin1?: string;
}

/** Hourly air quality data point */
export interface HourlyAirData {
  readonly time: string;
  readonly pm25: number;
  readonly pm10: number;
  readonly usAqi: number;
}

/** Air quality summary */
export interface AirQualitySummary {
  readonly current: {
    readonly pm25: number;
    readonly pm10: number;
    readonly usAqi: number;
    readonly category: AqiCategory;
  };
  readonly hourly: readonly HourlyAirData[];
  readonly bestVentilationWindow: TimeWindow;
  readonly worstOutdoorWindow: TimeWindow;
  readonly fetchedAt: string;
}

/** Time window (for best/worst hours) */
export interface TimeWindow {
  readonly startHour: number;
  readonly endHour: number;
  readonly avgAqi: number;
  readonly label: string;
}

/** Difficulty level for recommendations */
export type Difficulty = 'easy' | 'medium' | 'hard';

/** Cost level for recommendations */
export type Cost = 'free' | 'low' | 'medium';

/** Action category */
export type ActionCategory = 'routine' | 'indoor' | 'sustainable' | 'protection';

/** A single recommendation in the plan */
export interface Recommendation {
  readonly actionId: string;
  readonly title: string;
  readonly steps: readonly string[];
  readonly whyItHelps: string;
  readonly difficulty: Difficulty;
  readonly cost: Cost;
}

/** Time-of-day routine plan */
export interface RoutinePlan {
  readonly morning: readonly Recommendation[];
  readonly afternoon: readonly Recommendation[];
  readonly evening: readonly Recommendation[];
}

/** Complete daily plan */
export interface DailyPlan {
  readonly summary: string;
  readonly routine: RoutinePlan;
  readonly indoor: readonly Recommendation[];
  readonly sustainable: readonly Recommendation[];
  readonly protection: readonly Recommendation[];
  readonly bestVentilationWindow: string;
  readonly avoidOutdoorWindow: string;
}

/** Impact calculation for a single action */
export interface ActionImpact {
  readonly actionId: string;
  readonly exposureReductionPercent: number;
  readonly exposureReductionAbsolute: number;
  readonly cigarettesAvoided: number;
  readonly co2eAvoidedPerWeek: number;
}

/** Baseline exposure calculation */
export interface ExposureBaseline {
  readonly dailyExposureUgM3Hours: number;
  readonly averageExposureUgM3: number;
  readonly cigaretteEquivalentPerDay: number;
}

/** Complete impact assessment */
export interface ImpactAssessment {
  readonly baseline: ExposureBaseline;
  readonly actions: readonly ActionImpact[];
}

/** Affordability filter options */
export type AffordabilityFilter = 'all' | 'free' | 'low';

/** Triggered contextual factor in decision engine */
export interface DecisionFactor {
  readonly code: string;
  readonly description: string;
  readonly weight: number;
}

/** An action ranked by the deterministic decision engine */
export interface RankedAction {
  readonly actionId: string;
  readonly score: number;
  readonly feasibility: number;
  readonly effort: number;
  readonly impactUgM3: number;
  readonly reason: string;
  readonly factors: readonly DecisionFactor[];
}

/** Complete explainability trace from decision engine */
export interface DecisionTrace {
  readonly topActions: readonly RankedAction[];
  readonly excludedActions: readonly { readonly actionId: string; readonly reason: string }[];
  readonly seasonFactors: readonly string[];
  readonly formula: string;
}

/** Plan API response */
export interface PlanResponse {
  readonly plan: DailyPlan;
  readonly impact: ImpactAssessment;
  readonly airSummary: AirQualitySummary;
  readonly source: 'llm' | 'rules';
  readonly decisionTrace: DecisionTrace;
}

/** Chat message for Ask AirWise */
export interface ChatMessage {
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly timestamp: string;
}

/** Chat request body */
export interface ChatRequest {
  readonly messages: readonly { readonly role: 'user' | 'assistant'; readonly content: string }[];
  readonly profile: HouseholdProfile;
  readonly airSummary: AirQualitySummary;
  readonly planSummary?: string;
}

/** Chat response body */
export interface ChatResponse {
  readonly message: string;
  readonly suggestedQuestions: readonly string[];
  readonly source: 'llm' | 'rules';
}

/** Persona preset definition */
export interface PersonaPreset {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly location: Location;
  readonly profile: HouseholdProfile;
}

/** API error response */
export interface ApiError {
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

/** Geocoding result */
export interface GeocodingResult {
  readonly results: readonly Location[];
}

/** What-if scenario inputs */
export interface WhatIfScenario {
  readonly metroDaysPerWeek: number;
  readonly purifierOn: boolean;
  readonly n95OnCommute: boolean;
  readonly inductionCookingDays: number;
}

/** What-if result */
export interface WhatIfResult {
  readonly weeklyExposure: number;
  readonly cigaretteEquivalents: number;
  readonly co2ePerWeek: number;
}
