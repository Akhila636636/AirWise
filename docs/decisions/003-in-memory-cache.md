# ADR 003: In-Memory TTL Cache for Open-Meteo Weather & Air Quality Proxies

## Context
AirWise retrieves geocoding and real-time/forecast air quality data from Open-Meteo's public APIs. Although Open-Meteo requires no API key, excessive client requests can lead to IP throttling, slow response times, and unneeded egress.

## Decision
1. **Server Proxy with In-Memory TTL Cache**:
   - Node.js server maintains an in-memory TTL cache (`server/src/services/cache.ts`) using an LRU/Map structure with automated expiration sweep.
   - **Air Quality Cache**: TTL of 15 minutes, keyed by rounded coordinates (`lat.toFixed(2),lon.toFixed(2)`).
   - **Geocoding Cache**: TTL of 60 minutes, keyed by normalized lowercase city name.
2. **Resilience & Timeouts**:
   - External fetch calls enforce a strict 5000 ms timeout via `AbortSignal` with exactly 1 retry upon network failure.
3. **Manual Override Fallback**:
   - If external APIs fail or are unreachable, the UI seamlessly provides a manual AQI slider ($0\text{--}500$) so users can enter local readings (e.g., from an offline air monitor or local news) and receive immediate advice without server dependency.

## Consequences
- **Pros**: Sub-millisecond response times for repeated queries, protects upstream public APIs, works within sandbox memory constraints.
- **Cons**: In-memory cache is node-local; restarting the server clears the cache (acceptable since upstream fetch takes $<500\,\text{ms}$).
