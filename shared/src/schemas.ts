import { z } from 'zod';

// ── Enums ───────────────────────────────────────────────────────────────────

export const CommuteModeSchema = z.enum([
  'walk', 'cycle', 'two-wheeler', 'car', 'bus', 'metro', 'work-from-home',
]);

export const CookingFuelSchema = z.enum(['lpg', 'induction', 'biomass', 'kerosene']);

export const HomeTypeSchema = z.enum(['apartment', 'independent-house', 'informal-housing']);

export const HeatingTypeSchema = z.enum(['none', 'electric', 'wood-coal']);

export const LanguageSchema = z.enum(['en', 'hi', 'te']);

export const DifficultySchema = z.enum(['easy', 'medium', 'hard']);

export const CostSchema = z.enum(['free', 'low', 'medium']);

export const ActionCategorySchema = z.enum(['routine', 'indoor', 'sustainable', 'protection']);

export const AqiLevelSchema = z.enum([
  'good', 'moderate', 'unhealthy-sensitive', 'unhealthy', 'very-unhealthy', 'hazardous',
]);

// ── Core schemas ────────────────────────────────────────────────────────────

export const AqiCategorySchema = z.object({
  level: AqiLevelSchema,
  label: z.string().min(1).max(60),
  icon: z.string().min(1).max(10),
  color: z.string().min(1).max(20),
  bgColor: z.string().min(1).max(20),
  min: z.number().int().min(0),
  max: z.number().int().min(0),
});

export const HouseholdProfileSchema = z.object({
  householdSize: z.number().int().min(1).max(20),
  hasChildren: z.boolean(),
  hasElderly: z.boolean(),
  hasSensitiveMembers: z.boolean(),
  commuteMode: CommuteModeSchema,
  commuteMinutesPerDay: z.number().int().min(0).max(300),
  cookingFuel: CookingFuelSchema,
  hasAirPurifier: z.boolean(),
  homeType: HomeTypeSchema,
  heatingType: HeatingTypeSchema,
  language: LanguageSchema,
  freeText: z.string().trim().max(200).optional(),
});

export const LocationSchema = z.object({
  name: z.string().min(1).max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  country: z.string().max(100).optional(),
  admin1: z.string().max(200).optional(),
});

export const HourlyAirDataSchema = z.object({
  time: z.string().min(1),
  pm25: z.number().min(0),
  pm10: z.number().min(0),
  usAqi: z.number().int().min(0).max(1000),
});

export const TimeWindowSchema = z.object({
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(0).max(23),
  avgAqi: z.number().min(0),
  label: z.string().min(1).max(100),
});

export const AirQualitySummarySchema = z.object({
  current: z.object({
    pm25: z.number().min(0),
    pm10: z.number().min(0),
    usAqi: z.number().int().min(0).max(1000),
    category: AqiCategorySchema,
  }),
  hourly: z.array(HourlyAirDataSchema),
  bestVentilationWindow: TimeWindowSchema,
  worstOutdoorWindow: TimeWindowSchema,
  fetchedAt: z.string().min(1),
});

export const RecommendationSchema = z.object({
  actionId: z.string().min(1).max(60),
  title: z.string().min(1).max(100),
  steps: z.array(z.string().min(1).max(200)).min(1).max(3),
  whyItHelps: z.string().min(1).max(300),
  difficulty: DifficultySchema,
  cost: CostSchema,
});

export const RoutinePlanSchema = z.object({
  morning: z.array(RecommendationSchema),
  afternoon: z.array(RecommendationSchema),
  evening: z.array(RecommendationSchema),
});

export const DailyPlanSchema = z.object({
  summary: z.string().min(1).max(500),
  routine: RoutinePlanSchema,
  indoor: z.array(RecommendationSchema),
  sustainable: z.array(RecommendationSchema),
  protection: z.array(RecommendationSchema),
  bestVentilationWindow: z.string().min(1).max(100),
  avoidOutdoorWindow: z.string().min(1).max(100),
});

export const ExposureBaselineSchema = z.object({
  dailyExposureUgM3Hours: z.number().min(0),
  averageExposureUgM3: z.number().min(0),
  cigaretteEquivalentPerDay: z.number().min(0),
});

export const ActionImpactSchema = z.object({
  actionId: z.string().min(1),
  exposureReductionPercent: z.number().min(0),
  exposureReductionAbsolute: z.number().min(0),
  cigarettesAvoided: z.number().min(0),
  co2eAvoidedPerWeek: z.number().min(0),
});

export const ImpactAssessmentSchema = z.object({
  baseline: ExposureBaselineSchema,
  actions: z.array(ActionImpactSchema),
});

export const DecisionFactorSchema = z.object({
  code: z.string().min(1),
  description: z.string().min(1),
  weight: z.number(),
});

export const RankedActionSchema = z.object({
  actionId: z.string().min(1),
  score: z.number(),
  feasibility: z.number().min(0).max(1),
  effort: z.number().min(1),
  impactUgM3: z.number().min(0),
  reason: z.string().min(1),
  factors: z.array(DecisionFactorSchema),
});

export const DecisionTraceSchema = z.object({
  topActions: z.array(RankedActionSchema),
  excludedActions: z.array(
    z.object({
      actionId: z.string().min(1),
      reason: z.string().min(1),
    }),
  ),
  seasonFactors: z.array(z.string()),
  formula: z.string().min(1),
});

export const PlanResponseSchema = z.object({
  plan: DailyPlanSchema,
  impact: ImpactAssessmentSchema,
  airSummary: AirQualitySummarySchema,
  source: z.enum(['llm', 'rules']),
  decisionTrace: DecisionTraceSchema,
});

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(1000),
});

export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(6),
  profile: HouseholdProfileSchema,
  airSummary: AirQualitySummarySchema,
  planSummary: z.string().max(1000).optional(),
});

export const ChatResponseSchema = z.object({
  message: z.string().min(1).max(2000),
  suggestedQuestions: z.array(z.string().min(1).max(200)),
  source: z.enum(['llm', 'rules']),
});

export const AffordabilityFilterSchema = z.enum(['all', 'free', 'low']);

export const GeocodingResultSchema = z.object({
  results: z.array(LocationSchema),
});

export const WhatIfScenarioSchema = z.object({
  metroDaysPerWeek: z.number().int().min(0).max(7),
  purifierOn: z.boolean(),
  n95OnCommute: z.boolean(),
  inductionCookingDays: z.number().int().min(0).max(7),
});

export const WhatIfResultSchema = z.object({
  weeklyExposure: z.number().min(0),
  cigaretteEquivalents: z.number().min(0),
  co2ePerWeek: z.number().min(0),
});

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
  }),
});

// ── API Request Schemas ─────────────────────────────────────────────────────

export const GeocodeRequestSchema = z.object({
  q: z.string().trim().min(1).max(100),
});

export const AirRequestSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

export const PlanRequestSchema = z.object({
  profile: HouseholdProfileSchema,
  location: LocationSchema,
  manualAqi: z.number().int().min(0).max(500).optional(),
});
