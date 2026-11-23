import { z } from 'zod';
import type { Location } from '@airwise/shared';
import { AppError } from '../middleware/errorHandler.js';

const OpenMeteoGeocodeItemSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  country: z.string().optional(),
  admin1: z.string().optional(),
});

const OpenMeteoGeocodeResponseSchema = z.object({
  results: z.array(OpenMeteoGeocodeItemSchema).optional(),
});

/**
 * Searches for cities using the Open-Meteo Geocoding API with a 5s timeout and 1 retry.
 * @param query - City query string (min 1 char)
 * @returns Array of matched Location objects
 */
export async function searchCities(query: string): Promise<Location[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=5`;

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
          'GEOCODING_API_ERROR',
          `Open-Meteo geocoding returned HTTP ${response.status}`,
        );
      }

      const rawJson = await response.json();
      const parsed = OpenMeteoGeocodeResponseSchema.safeParse(rawJson);
      if (!parsed.success) {
        throw new AppError(
          502,
          'GEOCODING_PARSE_ERROR',
          'Malformed response from geocoding service',
        );
      }

      if (!parsed.data.results || parsed.data.results.length === 0) {
        return [];
      }

      return parsed.data.results.map((item) => ({
        name: item.name,
        latitude: item.latitude,
        longitude: item.longitude,
        country: item.country,
        admin1: item.admin1,
      }));
    } catch (err: unknown) {
      clearTimeout(timer);
      const isAbort = (err as Error)?.name === 'AbortError';
      lastError = isAbort
        ? new AppError(504, 'GEOCODING_TIMEOUT', 'Geocoding request timed out after 5s')
        : (err as Error);

      if (attempt === 0) {
        // Backoff slightly before retry
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
  }

  throw lastError ?? new AppError(500, 'GEOCODING_FAILED', 'Failed to resolve location');
}
