# AirWise – Build Plan

## Overview
AirWise is a GenAI-powered assistant helping families navigate severe winter smog and urban air pollution. It suggests low-emission daily routines, indoor air quality hacks, and sustainable alternatives tailored to location and lifestyle, while clearly explaining impact.

## Architecture
- **Monorepo** with npm workspaces: `/shared`, `/server`, `/client`
- **Shared**: Types, Zod schemas, action catalog, impact engine constants, i18n dictionaries
- **Server**: Express API proxying Open-Meteo, calling Groq LLM, running deterministic engine
- **Client**: React 18 + Vite SPA with CSS custom properties, Recharts (lazy), what-if slider

## Phases

### Phase 1: Scaffold & Shared (types, constants, engine)
- Root package.json with workspaces
- TypeScript configs (strict)
- Shared: types, Zod schemas, action catalog, constants, impact engine, rule engine, i18n

### Phase 2: Server
- Express app with helmet, rate-limit, CORS, Zod env validation
- Routes: /api/health, /api/geocode, /api/air, /api/plan
- Services: geocoding, air quality (TTL cache), LLM (Groq), plan orchestrator
- Fallback to rule engine on LLM failure

### Phase 3: Client
- Vite + React 18 setup
- Components: LocationSearch, AirQualityPanel, HouseholdForm, PlanCards, WhatIfSlider, CommunityShare
- CSS with custom properties, light/dark/high-contrast themes
- Demo mode (?demo=1)

### Phase 4: Accessibility & i18n
- Semantic HTML, ARIA, skip-to-content, focus management
- i18n dictionaries (en, hi, te), language switcher
- prefers-reduced-motion, prefers-color-scheme

### Phase 5: Testing
- Vitest: engine unit tests, API integration tests (Supertest), component tests, a11y (jest-axe)
- Playwright e2e smoke test
- Coverage >= 80% on engine/services

### Phase 6: CI & Docs
- GitHub Actions workflow
- README, SECURITY.md, docs/ACCESSIBILITY.md
- .env.example, ESLint/Prettier configs

## Key Decisions
- No database; profile in localStorage, sent per request
- LLM selects from fixed action catalog; engine owns all numbers
- Rule engine as full fallback (no Groq key needed for demo)
- Three languages: English, Hindi, Telugu
- CSS custom properties over CSS-in-JS for performance
