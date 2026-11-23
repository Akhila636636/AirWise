import { z } from 'zod';
import type { AirQualitySummary, HourlyAirData } from '@airwise/shared';
import {
  getAqiCategory,
  findBestVentilationWindow,
  findWorstOutdoorWindow,
} from '@airwise/shared';
import { Cache } from './cache.js';
import { AppError } from '../middleware/errorHandler.js';

// Open-Meteo Air Quality Response Schema
const OpenMeteoAirQualitySchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string().optional(),
  hourly: z.object({
    time: z.array(z.string()),
    pm2_5: z.array(z.number().nullable().optional()),
    pm10: z.array(z.number().nullable().optional()),
    us_aqi: z.array(z.number().nullable().optional()),
  }),
});

// Cache with 15-minute TTL
const airQualityCache = new Cache<AirQualitySummary>(15 * 60 * 1000);

/**
 * Key coordinates to two decimal places (~1.1 km precision) for caching
 */
function getCacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)}:${lon.toFixed(2)}`;
}

/**
 * Fetches real-time and 24-48h forecast air quality data from Open-Meteo.
 * Includes in-memory 15-minute TTL cache, 5s timeout, and 1 retry.
 */
export async function getAirQuality(
  lat: number,
  lon: number,
): Promise<AirQualitySummary> {
  const cacheKey = getCacheKey(lat, lon);
  const cached = airQualityCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm2_5,pm10,us_aqi&forecast_days=2&timezone=auto`;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!response.ok) {
        throw new AppError(
          502,
          'AIR_QUALITY_API_ERROR',
          `Air quality service returned HTTP ${response.status}`,
        );
      }

      const rawJson = await response.json();
      const parsed = OpenMeteoAirQualitySchema.safeParse(rawJson);
      if (!parsed.success) {
        throw new AppError(
          502,
          'AIR_QUALITY_PARSE_ERROR',
          'Malformed response from air quality service',
        );
      }

      const { time, pm2_5, pm10, us_aqi } = parsed.data.hourly;
      if (!time || time.length === 0) {
        throw new AppError(
          502,
          'AIR_QUALITY_DATA_EMPTY',
          'No hourly air quality measurements returned',
        );
      }

      // Convert hourly arrays into objects
      const hourlyData: HourlyAirData[] = [];
      const now = new Date();
      let currentIndex = 0;
      let smallestDiff = Infinity;

      for (let i = 0; i < time.length; i++) {
        const tStr = time[i];
        const p25 = Math.max(0, pm2_5?.[i] ?? 0);
        const p10 = Math.max(0, pm10?.[i] ?? 0);
        const aqi = Math.max(0, Math.round(us_aqi?.[i] ?? 0));

        hourlyData.push({
          time: tStr,
          pm25: Math.round(p25 * 10) / 10,
          pm10: Math.round(p10 * 10) / 10,
          usAqi: aqi,
        });

        const entryTime = new Date(tStr);
        const diff = Math.abs(entryTime.getTime() - now.getTime());
        if (diff < smallestDiff) {
          smallestDiff = diff;
          currentIndex = i;
        }
      }

      const currentPoint = hourlyData[currentIndex] ?? hourlyData[0];
      const category = getAqiCategory(currentPoint.usAqi);

      // Take the next 24 hours from current index for window calculation
      const next24Hours = hourlyData.slice(
        currentIndex,
        Math.min(hourlyData.length, currentIndex + 24),
      );

      const bestVentilationWindow = findBestVentilationWindow(
        next24Hours.length >= 2 ? next24Hours : hourlyData.slice(0, 24),
      );
      const worstOutdoorWindow = findWorstOutdoorWindow(
        next24Hours.length >= 2 ? next24Hours : hourlyData.slice(0, 24),
      );

      const summary: AirQualitySummary = {
        current: {
          pm25: currentPoint.pm25,
          pm10: currentPoint.pm10,
          usAqi: currentPoint.usAqi,
          category,
        },
        hourly: hourlyData.slice(0, 48),
        bestVentilationWindow,
        worstOutdoorWindow,
        fetchedAt: new Date().toISOString(),
      };

      airQualityCache.set(cacheKey, summary);
      return summary;
    } catch (err: unknown) {
      clearTimeout(timer);
      const isAbort = (err as Error)?.name === 'AbortError';
      lastError = isAbort
        ? new AppError(504, 'AIR_QUALITY_TIMEOUT', 'Air quality request timed out after 5s')
        : (err as Error);

      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
  }

  throw lastError ?? new AppError(500, 'AIR_QUALITY_FAILED', 'Failed to retrieve air quality data');
}
