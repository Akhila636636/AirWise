# Accessibility Statement & Conformance Report — AirWise

AirWise is designed and engineered to conform to **WCAG 2.2 Level AA** criteria.

## Conformance Checklist

### 1. Perceivable
- **Non-Text Content (1.1.1)**: All meaningful SVG icons include descriptive labels or titles; purely decorative icons have `aria-hidden="true"`.
- **Information and Relationships (1.3.1)**: Semantic HTML landmarks (`<header>`, `<main>`, `<footer>`, `<section>`, `<article>`) organize page content. Form fields are programmatically tied to labels with `htmlFor` / `id` and descriptive error spans with `aria-describedby`.
- **Contrast (1.4.3 & 1.4.11)**: All text elements achieve a minimum 4.5:1 contrast ratio against their backgrounds across Light, Dark, and High-Contrast themes.
- **Resize Text (1.4.4)**: Layout remains fully functional and legible at 200% zoom without horizontal scrolling or text clipping.
- **Use of Color (1.4.1)**: AQI categories are conveyed simultaneously via text label, color, numerical value, and icon (e.g. "Unhealthy", "🔴", "180", "PM2.5").

### 2. Operable
- **Keyboard (2.1.1 & 2.1.2)**: Every interactive element (city search combobox, theme toggle, language dropdown, sliders, buttons) is fully operable using Tab, Enter, Space, and Arrow keys with no keyboard traps.
- **Skip to Content (2.4.1)**: A visible "Skip to main content" link is the first focusable element on the page.
- **Focus Visible (2.4.7)**: High-contrast focus rings (`0 0 0 3px rgba(5, 150, 105, 0.45)`) ensure active elements are clearly visible.
- **Target Size (2.5.8)**: All buttons, selects, and inputs satisfy the minimum 44×44px touch target requirement.
- **Reduced Motion (2.3.3)**: Animations and transitions respect `prefers-reduced-motion: reduce`.

### 3. Understandable
- **Language of Page (3.1.1)**: The `<html lang="...">` attribute updates dynamically when switching between English (`en`), Hindi (`hi`), and Telugu (`te`).
- **On Input (3.2.2)**: Sliders and inputs update values without causing unexpected context shifts.
- **Error Identification & Suggestion (3.3.1 & 3.3.3)**: Form errors are displayed inline with explicit instructions on how to correct invalid inputs.

### 4. Robust
- **Status Messages (4.1.3)**: Dynamic what-if recalculations and search status notifications use `aria-live="polite"` regions. Loading states utilize `aria-busy="true"`.
- **Chart Fallback**: The 24-hour forecast chart includes a toggleable accessible data table alternative for screen reader users.

## Automated Testing

Automated accessibility audits are performed using `vitest-axe` (Axe Core) on core components to guarantee zero violations.
