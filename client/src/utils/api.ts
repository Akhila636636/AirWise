import type {
  Location,
  AirQualitySummary,
  HouseholdProfile,
  PlanResponse,
} from '@airwise/shared';

const BASE_URL = '/api';

/**
 * Generic fetch wrapper with AbortSignal and consistent error unwrapping.
 */
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.error?.message) {
        errorMsg = errJson.error.message;
      }
    } catch {
      // Keep default
    }
    throw new Error(errorMsg);
  }

  return (await response.json()) as T;
}

export async function searchCities(
  query: string,
  signal?: AbortSignal,
): Promise<Location[]> {
  const data = await fetchJson<{ results: Location[] }>(
    `/geocode?q=${encodeURIComponent(query)}`,
    { signal },
  );
  return data.results;
}

export async function getAirQuality(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<AirQualitySummary> {
  return fetchJson<AirQualitySummary>(`/air?lat=${lat}&lon=${lon}`, { signal });
}

export async function getPlan(
  profile: HouseholdProfile,
  location: Location,
  manualAqi?: number,
  signal?: AbortSignal,
): Promise<PlanResponse> {
  return fetchJson<PlanResponse>('/plan', {
    method: 'POST',
    body: JSON.stringify({
      profile,
      location,
      manualAqi,
    }),
    signal,
  });
}
