# ADR 001: Hybrid Deterministic Engine + LLM Architecture

## Context
AirWise delivers air pollution guidance, exposure reduction calculations, and personalized daily routines for households during severe winter smog.
A common failure mode in GenAI applications is hallucination of numbers, medical claims, or unrealistic impact metrics (e.g., claiming a potted plant cleans 80% of indoor PM2.5 or fabricating AQI health risk numbers). Furthermore, external LLM APIs can suffer outages, latency spikes, or rate limiting.

## Decision
We separate concerns strictly:
1. **Deterministic Engine (`@airwise/shared/engine`) Owns All Facts & Metrics**:
   - Baseline PM2.5 exposure and inhaled particle calculations.
   - Rule-of-thumb cigarette equivalence based on the Berkeley Earth scientific metric ($22\,\mu\text{g}/\text{m}^3$ over 24h $\approx$ 1 cigarette).
   - Inhaled air volume calculations ($12\,\text{m}^3/\text{day}$ adult baseline).
   - Real-time what-if recalculations with actionable delta impacts.
   - Decision ranking using an explicit scoring formula: $\text{Score} = (\text{Impact} \times \text{Feasibility} / \text{Effort}) \times \text{RuleMultipliers}$.
2. **LLM Owns Personalization, Tone & Localization**:
   - The LLM receives pre-scored action IDs and contextual explanations.
   - The LLM's system prompt strictly prohibits inventing numbers or proposing actions outside the fixed catalog of 18 validated actions.
   - The LLM formats reasons ("Why this helps") tailored to the user's specific living situation and language (English, Hindi, Telugu).
3. **Guardrails & Schema Validation**:
   - All LLM outputs are validated with Zod against strict JSON schemas before being served to the client.
   - Any unverified action IDs returned by the LLM are quarantined and dropped.

## Consequences
- **Pros**: 100% mathematical consistency, zero hallucinated statistics, robust auditing, fully testable with standard unit and property tests.
- **Cons**: Requires cataloging actions with discrete effect models rather than allowing arbitrary open-ended action creation.
