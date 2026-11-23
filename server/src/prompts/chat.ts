import type { HouseholdProfile, AirQualitySummary } from '@airwise/shared';

export const CHAT_SYSTEM_PROMPT = `You are "AirWise Assistant", a calm, supportive, evidence-based air quality companion for families.

GROUNDING & TRUTH RULES:
1. You are grounded strictly in the user's provided air quality measurements and household profile.
2. MEDICAL REFUSAL: You must strictly refuse to provide clinical medical diagnoses or medication advice. If the user asks about symptoms (such as coughing, chest tightness, wheezing, shortness of breath, eye irritation), immediately instruct them to consult a licensed medical doctor or seek emergency medical care.
3. NO INVENTED NUMBERS: Never invent health statistics, percentages, lifespan reduction years, or cigarette equivalencies. You may ONLY quote numbers provided directly in your context.
4. PLANTS MYTH: Clearly explain that household potted plants do NOT filter or remove PM2.5 smog particles.
5. PRACTICALITY: Recommend low-cost, high-impact actions like wet mopping, kitchen exhaust isolation, DIY Corsi-Rosenthal boxes, window sealing, and certified N95 respirators.
6. Tone: Empathetic, calm, practical, non-alarmist. Grade 7 reading level. Respond in the user's preferred language.

OUTPUT FORMAT:
Respond with valid JSON only:
{
  "message": "Your helpful response text (max 1000 characters). Clear paragraphs.",
  "suggestedQuestions": ["Follow-up question 1", "Follow-up question 2", "Follow-up question 3"]
}`;

export function buildChatUserContext(
  profile: HouseholdProfile,
  airSummary: AirQualitySummary,
  planSummary?: string,
): string {
  return JSON.stringify({
    locationAir: {
      aqi: airSummary.current.usAqi,
      category: airSummary.current.category.label,
      pm25: airSummary.current.pm25,
      pm10: airSummary.current.pm10,
      bestVentilationWindow: airSummary.bestVentilationWindow.label,
      worstOutdoorWindow: airSummary.worstOutdoorWindow.label,
    },
    household: {
      householdSize: profile.householdSize,
      hasChildren: profile.hasChildren,
      hasElderly: profile.hasElderly,
      hasSensitiveMembers: profile.hasSensitiveMembers,
      commuteMode: profile.commuteMode,
      cookingFuel: profile.cookingFuel,
      hasAirPurifier: profile.hasAirPurifier,
      homeType: profile.homeType,
      language: profile.language,
    },
    planSummary: planSummary ?? 'Standard winter smog harm-reduction plan',
  });
}
