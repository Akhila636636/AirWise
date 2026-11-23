import type {
  Location,
  AirQualitySummary,
  HouseholdProfile,
  HourlyAirData,
} from '@airwise/shared';

export const DEMO_LOCATION: Location = {
  name: 'Delhi',
  latitude: 28.6139,
  longitude: 77.209,
  country: 'India',
  admin1: 'Delhi',
};

export const DEMO_PROFILE: HouseholdProfile = {
  householdSize: 5,
  hasChildren: true,
  hasElderly: true,
  hasSensitiveMembers: true,
  commuteMode: 'two-wheeler',
  commuteMinutesPerDay: 50,
  cookingFuel: 'lpg',
  hasAirPurifier: false,
  homeType: 'apartment',
  heatingType: 'wood-coal',
  language: 'en',
  freeText: 'Live near an active arterial road, lots of dust and morning smog.',
};

/**
 * Creates 24 hours of mock severe air quality data for Delhi.
 */
export function createDemoAirQuality(): AirQualitySummary {
  const hourly: HourlyAirData[] = [];
  const now = new Date();

  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getTime() + i * 3600 * 1000);
    // Severe diurnal smog pattern: peak in early morning (7-9 AM) and late night
    const hour = (now.getHours() + i) % 24;
    let pm25 = 260;
    if (hour >= 6 && hour <= 9) {
      pm25 = 380;
    } else if (hour >= 13 && hour <= 16) {
      pm25 = 150; // ventilation window
    } else if (hour >= 20 || hour <= 3) {
      pm25 = 320;
    }

    const aqi = Math.min(500, Math.round(pm25 * 1.15));
    hourly.push({
      time: d.toISOString(),
      pm25,
      pm10: Math.round(pm25 * 1.6),
      usAqi: aqi,
    });
  }

  return {
    current: {
      pm25: 310,
      pm10: 480,
      usAqi: 360,
      category: {
        level: 'hazardous',
        label: 'Hazardous',
        icon: '🟤',
        color: '#7f1d1d',
        bgColor: '#fecaca',
        min: 301,
        max: 500,
      },
    },
    hourly,
    bestVentilationWindow: {
      startHour: 13,
      endHour: 15,
      avgAqi: 180,
      label: '1:00 PM - 3:00 PM',
    },
    worstOutdoorWindow: {
      startHour: 7,
      endHour: 9,
      avgAqi: 410,
      label: '7:00 AM - 9:00 AM',
    },
    fetchedAt: now.toISOString(),
  };
}
