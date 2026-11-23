# Security Policy — AirWise

## Threat Model

AirWise processes non-sensitive household profile data (family size, commute mode, cooking fuel) to generate localized air quality recommendations. There are no user accounts, passwords, or personal identifiable information (PII) stored.

### Assets & Boundaries
1. **GROQ_API_KEY**: Stored exclusively in server-side environment variables; never exposed to the client bundle or network responses.
2. **User Data**: Transient; the household profile is stored strictly in the user's browser `localStorage` and sent over HTTPS on request. No database exists.
3. **External Dependencies**: Proxied and validated upstream APIs (Open-Meteo Geocoding and Air Quality APIs).

### Threats & Mitigations

| Threat | Mitigation |
|---|---|
| **API Key Exposure** | Server environment validation using Zod; `.env` is gitignored; `.env.example` contains placeholders only. |
| **Prompt Injection via Free-Text** | System prompt explicitly treats user input as untrusted data; free-text is capped at 200 characters and stripped of jailbreak phrases; the LLM selects action IDs only from an immutable catalog. |
| **Cross-Site Scripting (XSS)** | React automatic text escaping; `dangerouslySetInnerHTML` is strictly prohibited; all LLM and upstream strings are stripped of HTML and Markdown before rendering. |
| **Denial of Service (DoS)** | `express-rate-limit` enforces 100 requests / 15 min globally and 10 requests / min on `/api/plan`; body parser is restricted to 10KB. |
| **SSRF via Geolocation Coordinates** | Strict Zod validation on latitude (-90 to 90) and longitude (-180 to 180); only whitelisted Open-Meteo endpoints are queried. |
| **Information Leakage** | Express `x-powered-by` header disabled; Helmet security headers enabled with strict Content Security Policy; central error handler redacts internal stack traces. |
| **Upstream Service Outages** | In-memory 15-minute TTL cache with 5s timeouts and single retry; automatic fallback to deterministic rule engine if Groq or Open-Meteo fail. |

### Responsible Disclosure

To report a vulnerability, please open a private GitHub security advisory. We respond to all valid vulnerability reports within 48 hours.
