import type {
  HouseholdProfile,
  AirQualitySummary,
  ChatResponse,
} from '@airwise/shared';

export async function sendChatMessage(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  profile: HouseholdProfile,
  airSummary: AirQualitySummary,
  planSummary?: string,
  signal?: AbortSignal,
): Promise<ChatResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      profile,
      airSummary,
      planSummary,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Chat error HTTP ${response.status}`);
  }

  return (await response.json()) as ChatResponse;
}
