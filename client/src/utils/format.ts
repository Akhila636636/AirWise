import type { DailyPlan, AirQualitySummary, Language } from '@airwise/shared';

export function formatAqi(aqi: number): string {
  return `${Math.round(aqi)}`;
}

export function formatExposure(val: number): string {
  return `${Math.round(val * 10) / 10}`;
}

export function formatCigarettes(val: number): string {
  return `${Math.round(val * 10) / 10}`;
}

export function formatCo2e(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(1)} kg`;
  }
  return `${Math.round(grams)} g`;
}

/**
 * Formats a plain-text WhatsApp or printable summary for community sharing.
 */
export function generateShareText(
  plan: DailyPlan,
  airSummary: AirQualitySummary,
  cityName: string,
  _lang: Language = 'en',
): string {
  const aqi = airSummary.current.usAqi;
  const cat = airSummary.current.category.label;

  let text = `🌿 *AirWise Family Air Quality Alert — ${cityName}*\n`;
  text += `Today's AQI: *${aqi}* (${cat})\n`;
  text += `🌬️ Best window to ventilate: ${airSummary.bestVentilationWindow.label}\n`;
  text += `🚫 Worst outdoor smog hours: ${airSummary.worstOutdoorWindow.label}\n\n`;

  text += `📋 *Top Action Steps:*\n`;
  const keyActions = [
    ...plan.routine.morning.slice(0, 1),
    ...plan.indoor.slice(0, 1),
    ...plan.protection.slice(0, 1),
  ];

  for (const item of keyActions) {
    text += `• *${item.title}*: ${item.steps[0] ?? ''}\n`;
  }

  text += `\n_Generated via AirWise (Not medical advice. Stay safe!)_`;
  return text;
}
