import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAirQuality } from '../services/airQuality.js';
import { searchCities } from '../services/geocoding.js';
import { AppError } from '../middleware/errorHandler.js';

describe('External Services & Error Handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAirQuality', () => {
    it('retrieves and computes 24-hour windows from Open-Meteo response', async () => {
      const mockTimes = Array.from({ length: 48 }, (_, i) =>
        new Date(Date.now() + i * 3600 * 1000).toISOString(),
      );
      const mockPm25 = Array.from({ length: 48 }, (_, i) => (i === 14 ? 20 : 180));
      const mockPm10 = Array.from({ length: 48 }, () => 220);
      const mockAqi = Array.from({ length: 48 }, (_, i) => (i === 14 ? 35 : 210));

      const mockOpenMeteo = {
        latitude: 28.61,
        longitude: 77.23,
        hourly: {
          time: mockTimes,
          pm2_5: mockPm25,
          pm10: mockPm10,
          us_aqi: mockAqi,
        },
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockOpenMeteo,
      } as Response);

      const summary = await getAirQuality(28.61, 77.23);
      expect(summary.current.usAqi).toBeGreaterThan(0);
      expect(summary.bestVentilationWindow).toBeDefined();
      expect(summary.worstOutdoorWindow).toBeDefined();
    });

    it('throws AppError when upstream returns HTTP 500', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      await expect(getAirQuality(10.0, 20.0)).rejects.toThrow();
    });
  });

  describe('searchCities', () => {
    it('returns empty array when query is empty or blank', async () => {
      const results = await searchCities('   ');
      expect(results).toEqual([]);
    });

    it('throws AppError on upstream failure after retry', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 502,
      } as Response);

      await expect(searchCities('Mumbai')).rejects.toThrow(AppError);
    });
  });

  describe('AppError', () => {
    it('creates an error with status code and code string', () => {
      const err = new AppError(404, 'NOT_FOUND', 'Resource not found');
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
      expect(err.message).toBe('Resource not found');
    });
  });
});
