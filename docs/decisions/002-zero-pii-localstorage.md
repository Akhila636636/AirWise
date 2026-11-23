# ADR 002: Zero-PII & Client-Side LocalStorage Profile

## Context
AirWise collects household context (family composition, presence of children/elderly/sensitive members, commute modes, cooking fuel, heating source, housing type). Storing such data in a centralized backend database creates compliance overhead, data breach risks, and privacy violations under global data protection regulations (GDPR, India DPDP Act).

## Decision
1. **No Database & No User Accounts**:
   - The application does not maintain a backend database, session store, or user authentication system.
   - No personally identifiable information (PII) such as names, phone numbers, exact addresses, or IP addresses is persisted.
2. **Client-Side Profile Storage**:
   - Household profile state is stored exclusively in the browser's `localStorage` (`airwise_household_profile`).
   - The profile is transmitted ephemerally as the payload of `/api/plan` and `/api/chat` POST requests.
3. **Coarse Location & Geolocation**:
   - Geolocation is strictly optional and user-consented. Coordinates are rounded to 2 decimal places ($\approx 1.1\,\text{km}$ resolution) to avoid tracking precise residence locations.

## Consequences
- **Pros**: Complete privacy-by-design, zero risk of user data breach, zero database infrastructure costs, instant setup without signup friction.
- **Cons**: Profiles do not synchronize across devices unless manually exported/imported or re-entered (mitigated by quick sub-30-second form and one-click persona presets).
