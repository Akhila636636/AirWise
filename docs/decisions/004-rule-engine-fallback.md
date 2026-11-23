# ADR 004: 100% Offline Rule Engine Fallback

## Context
During severe smog crises or natural emergencies, network connectivity may be erratic, upstream LLM APIs (Groq) may experience rate limiting or downtime, or users may not have an active Groq API key configured. AirWise must remain fully functional and useful regardless of external service availability.

## Decision
1. **Deterministic Rule Engine (`@airwise/shared/ruleEngine.ts`)**:
   - Complete fallback plan generator containing curated, science-backed guidance for all 18 actions across 4 core problem statement categories:
     - Low-emission daily routines (morning/afternoon/evening windows)
     - Indoor air quality hacks (sealing, DIY Corsi-Rosenthal boxes, ventilation timing, plant myth debunking)
     - Sustainable alternatives (commute, cooking, heating, waste burning)
     - Protection guidance (N95/FFP2 masks, activity restrictions)
2. **Multilingual Fallback Content**:
   - The rule engine provides native, hand-curated guidance in English, Hindi (`hi`), and Telugu (`te`) without requiring any LLM translation calls.
3. **Automatic Circuit-Breaker**:
   - If the Groq API call fails, times out (after 8 seconds), is unconfigured, or returns invalid JSON schema, `server/src/controllers/planController.ts` immediately engages `generateRuleBasedPlan()` and returns a valid plan stamped with `meta.fallback = true`.
   - The UI displays an honest, accessible banner informing the user that deterministic offline recommendations are active.

## Consequences
- **Pros**: Zero single point of failure; 100% uptime guarantee for emergency advice; full offline support when combined with PWA service worker.
- **Cons**: Fallback plan phrasing is pre-compiled rather than dynamically bespoke, though it is fully tailored to the user's specific profile and AQI level.
