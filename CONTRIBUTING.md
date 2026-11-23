# Contributing to AirWise

Thank you for contributing to AirWise! This guide outlines how to contribute clean, production-grade code to the project and demonstrates how easily new catalog actions or contextual decision rules can be added.

---

## Architecture Overview

AirWise is an npm monorepo with three workspaces:
- `/shared` (`@airwise/shared`): Core types, Zod schemas, physical constants, 18-action catalog, deterministic impact engine, decision rules, and rule-based fallback generator.
- `/server` (`@airwise/server`): Express API, Open-Meteo proxies, in-memory TTL caching, Groq LLM integration, rate limiting, and security middleware.
- `/client` (`@airwise/client`): React 18 + Vite SPA, CSS custom properties, triple-channel AQI indicators, What-If slider, PWA service worker, and Ask AirWise chat.

---

## How to Add a New Action in Under 10 Lines

All actions live in the typed catalog in `shared/src/actions.ts`. To add a new action (e.g., `carpool_ride_share`):

```typescript
// 1. In shared/src/actions.ts, append to ACTION_CATALOG:
ACTION_CATALOG.push({
  id: 'carpool_ride_share',
  category: 'sustainable_alternatives',
  defaultDifficulty: 'easy',
  defaultCost: 'low',
  effect: { type: 'transport_shift', reductionFactor: 0.5, co2SavedKgPerDay: 2.1 }
});
```

*Note: Run `npm run build -w shared` to make the new action available to both client and server automatically.*

---

## How to Add a New Decision Rule in Under 10 Lines

All decision rules live in `shared/src/engine/decisionRules.ts`. To add a new context rule (e.g., boosting solar/induction cooking during severe winter inversion):

```typescript
// 1. In shared/src/engine/decisionRules.ts, append to CONTEXT_RULES:
CONTEXT_RULES.push({
  id: 'severe_winter_clean_cooking',
  condition: (p, aqi) => aqi.aqi >= 250 && p.cookingFuel === 'biomass',
  multiplier: 2.5,
  boostActionIds: ['shift_cooking_fuel', 'cross_ventilation_cooking'],
  factor: { label: 'Severe Smog + Biomass Fuel', weight: 2.5, reason: 'High indoor smoke during hazardous outdoor air' }
});
```

That's it! The `decisionEngine.ts` immediately integrates this rule into its multi-attribute utility calculation:
$$\text{Score} = \left(\frac{\text{Impact} \times \text{Feasibility}}{\text{Effort}}\right) \times \text{RuleMultipliers}$$

---

## Development Workflow

### 1. Prerequisites
- Node.js >= 20.0.0
- npm >= 9.0.0

### 2. Install Dependencies
```bash
npm install
```

### 3. Build Shared Library
```bash
npm run build -w shared
```

### 4. Run Development Servers
```bash
# Terminal 1: Start Express API server (port 3001)
npm run dev -w server

# Terminal 2: Start Vite Client (port 5173)
npm run dev -w client
```

---

## Code Quality Standards

1. **No `any`**: TypeScript strict mode is enabled everywhere. Always type function parameters and return values.
2. **Deterministic Facts**: Never let the LLM calculate numbers or AQI values. All metrics must derive from `@airwise/shared/engine`.
3. **Zod Validation**: Validate all inbound HTTP request payloads and external API responses with Zod schemas.
4. **File Length**: Keep files modular and focused (aim under ~200 lines per module).
5. **Testing**: Write unit tests for all new engine rules or actions in `shared/src/__tests__/` or `server/src/__tests__/`.

---

## Verification Commands

Before opening a pull request or submitting code, ensure all checks pass:

```bash
# Typecheck all packages
npm run typecheck

# Lint all packages
npm run lint

# Run all unit and service tests with coverage
npm run test:coverage

# Build all packages for production
npm run build
```
