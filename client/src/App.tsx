import { useState, useEffect, useRef } from 'react';
import type {
  Location,
  AirQualitySummary,
  HouseholdProfile,
  PlanResponse,
  Language,
  PersonaPreset,
} from '@airwise/shared';
import {
  t,
  generateRulePlan,
  calculateAllImpacts,
  evaluateDecisions,
} from '@airwise/shared';
import { Header } from './components/Header';
import { LocationSearch } from './components/LocationSearch';
import { PersonaPresets } from './components/PersonaPresets';
import { AirQualityPanel } from './components/AirQualityPanel';
import { HouseholdForm } from './components/HouseholdForm';
import { PlanView } from './components/PlanView';
import { DecisionTraceView } from './components/DecisionTraceView';
import { WhatIfSlider } from './components/WhatIfSlider';
import { AskAirWise } from './components/AskAirWise';
import { CommunityShare } from './components/CommunityShare';
import { HowCalculated } from './components/HowCalculated';
import { Footer } from './components/Footer';
import { getAirQuality, getPlan } from './utils/api';
import { DEMO_LOCATION, DEMO_PROFILE, createDemoAirQuality } from './utils/demo';

export function App() {
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<'light' | 'dark' | 'high-contrast'>('light');

  const [location, setLocation] = useState<Location | null>(null);
  const [airQuality, setAirQuality] = useState<AirQualitySummary | null>(null);
  const [airLoading, setAirLoading] = useState(false);
  const [manualAqi, setManualAqi] = useState<number | null>(null);

  const [profile, setProfile] = useState<HouseholdProfile | null>(null);
  const [planResponse, setPlanResponse] = useState<PlanResponse | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic monitoring state
  const [aqiAlertBanner, setAqiAlertBanner] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastPlanTime, setLastPlanTime] = useState<string | null>(null);

  const prevCategoryRef = useRef<string | null>(null);

  // Sync html lang attribute
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Sync theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Connectivity listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Demo mode check (?demo=1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === '1') {
      const demoAir = createDemoAirQuality();
      setLocation(DEMO_LOCATION);
      setProfile(DEMO_PROFILE);
      setAirQuality(demoAir);

      const rulePlan = generateRulePlan(DEMO_PROFILE, demoAir);
      const impact = calculateAllImpacts(DEMO_PROFILE, demoAir.current.pm25);
      const decisionTrace = evaluateDecisions(DEMO_PROFILE, demoAir);

      setPlanResponse({
        plan: rulePlan,
        impact,
        airSummary: demoAir,
        source: 'rules',
        decisionTrace,
      });
      setLastPlanTime(new Date().toLocaleTimeString());
    }
  }, []);

  // Dynamic 15-minute polling while the page is open
  useEffect(() => {
    if (!location) return;

    const pollInterval = setInterval(async () => {
      try {
        const freshAir = await getAirQuality(location.latitude, location.longitude);
        const newCat = freshAir.current.category.label;

        if (prevCategoryRef.current && prevCategoryRef.current !== newCat) {
          setAqiAlertBanner(
            `Air quality changed to "${newCat}" (AQI ${freshAir.current.usAqi}). Click to re-calculate your plan.`,
          );
        }

        prevCategoryRef.current = newCat;
        setAirQuality(freshAir);
      } catch {
        // Polling failure silent
      }
    }, 15 * 60 * 1000); // 15 mins

    return () => clearInterval(pollInterval);
  }, [location]);

  // Fetch air quality on location select
  const handleSelectLocation = async (newLocation: Location) => {
    setLocation(newLocation);
    setAirLoading(true);
    setError(null);
    try {
      const summary = await getAirQuality(newLocation.latitude, newLocation.longitude);
      setAirQuality(summary);
      prevCategoryRef.current = summary.current.category.label;
    } catch {
      setAirQuality(createDemoAirQuality());
    } finally {
      setAirLoading(false);
    }
  };

  // 1-Click Persona Preset Handler
  const handleSelectPreset = async (preset: PersonaPreset) => {
    setLocation(preset.location);
    setProfile(preset.profile);
    setLanguage(preset.profile.language);
    setAirLoading(true);
    setError(null);

    let summary: AirQualitySummary;
    try {
      summary = await getAirQuality(preset.location.latitude, preset.location.longitude);
    } catch {
      summary = createDemoAirQuality();
    }
    setAirQuality(summary);
    setAirLoading(false);

    // Immediately generate plan
    setPlanLoading(true);
    try {
      const res = await getPlan(preset.profile, preset.location);
      setPlanResponse(res);
      setLastPlanTime(new Date().toLocaleTimeString());
    } catch {
      const fallbackPlan = generateRulePlan(preset.profile, summary);
      const fallbackImpact = calculateAllImpacts(preset.profile, summary.current.pm25);
      const decisionTrace = evaluateDecisions(preset.profile, summary);

      setPlanResponse({
        plan: fallbackPlan,
        impact: fallbackImpact,
        airSummary: summary,
        source: 'rules',
        decisionTrace,
      });
      setLastPlanTime(new Date().toLocaleTimeString());
    } finally {
      setPlanLoading(false);
    }
  };

  // Profile Submit Handler
  const handleProfileSubmit = async (newProfile: HouseholdProfile) => {
    if (!location) {
      setError('Please select a city first');
      return;
    }

    setProfile(newProfile);
    setPlanLoading(true);
    setError(null);

    try {
      const res = await getPlan(newProfile, location, manualAqi ?? undefined);
      setPlanResponse(res);
      setLastPlanTime(new Date().toLocaleTimeString());
    } catch {
      if (airQuality) {
        const fallbackPlan = generateRulePlan(newProfile, airQuality);
        const fallbackImpact = calculateAllImpacts(newProfile, airQuality.current.pm25);
        const decisionTrace = evaluateDecisions(newProfile, airQuality);

        setPlanResponse({
          plan: fallbackPlan,
          impact: fallbackImpact,
          airSummary: airQuality,
          source: 'rules',
          decisionTrace,
        });
        setLastPlanTime(new Date().toLocaleTimeString());
      } else {
        setError(t('error.generic', language));
      }
    } finally {
      setPlanLoading(false);
    }
  };

  // Step indicator
  const currentStep = !location ? 1 : !planResponse ? 2 : 3;

  return (
    <>
      <a href="#main-content" className="skip-link">
        {t('a11y.skipToContent', language)}
      </a>

      <Header
        language={language}
        onLanguageChange={setLanguage}
        theme={theme}
        onThemeChange={setTheme}
      />

      <main id="main-content" className="container" style={{ paddingTop: 'var(--space-6)' }}>
        {/* Offline cache notice banner */}
        {!isOnline && (
          <div
            role="status"
            aria-live="polite"
            style={{
              padding: 'var(--space-2) var(--space-4)',
              backgroundColor: 'var(--color-warning-bg)',
              border: '1px solid var(--color-warning)',
              borderRadius: 'var(--border-radius)',
              marginBottom: 'var(--space-4)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            📡 <strong>Offline mode:</strong> Displaying cached application shell and saved plan {lastPlanTime ? `(Last updated at ${lastPlanTime})` : ''}.
          </div>
        )}

        {/* Dynamic AQI change alert banner */}
        {aqiAlertBanner && (
          <div
            role="alert"
            style={{
              padding: 'var(--space-3) var(--space-4)',
              backgroundColor: 'var(--color-warning-bg)',
              border: '2px solid var(--color-warning)',
              borderRadius: 'var(--border-radius)',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>⚠️ {aqiAlertBanner}</span>
            <button
              type="button"
              onClick={() => {
                setAqiAlertBanner(null);
                if (profile) handleProfileSubmit(profile);
              }}
              className="btn btn-primary"
              style={{ minHeight: '34px', fontSize: '0.8rem', padding: '0 0.75rem' }}
            >
              Re-calculate Plan Now
            </button>
          </div>
        )}

        {/* Hero headline */}
        <section style={{ marginBottom: 'var(--space-4)', textAlign: 'center' }}>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', marginBottom: 'var(--space-2)' }}>
            🌿 {t('app.name', language)}
          </h1>
          <p
            style={{
              fontSize: 'var(--font-size-base)',
              color: 'var(--color-text-secondary)',
              maxWidth: '48rem',
              margin: '0 auto',
            }}
          >
            {t('app.tagline', language)}
          </p>
        </section>

        {/* 3-Step Guided Onboarding Progress Bar */}
        <nav aria-label="Onboarding Progress" style={{ marginBottom: 'var(--space-6)' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderBottom: '2px solid var(--color-border)',
              paddingBottom: 'var(--space-2)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <span style={{ color: currentStep >= 1 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
              1. Location & Air Data {currentStep > 1 ? '✓' : ''}
            </span>
            <span style={{ color: currentStep >= 2 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
              2. Household Profile & Presets {currentStep > 2 ? '✓' : ''}
            </span>
            <span style={{ color: currentStep >= 3 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
              3. Personalized Plan & Assistant {currentStep === 3 ? '★' : ''}
            </span>
          </div>
        </nav>

        {/* 1-Click Persona Presets for instant onboarding */}
        <PersonaPresets onSelectPreset={handleSelectPreset} language={language} />

        {error && (
          <div
            role="alert"
            style={{
              padding: 'var(--space-3) var(--space-4)',
              backgroundColor: 'var(--color-error-bg)',
              color: 'var(--color-error)',
              border: '1px solid var(--color-error)',
              borderRadius: 'var(--border-radius)',
              marginBottom: 'var(--space-4)',
            }}
          >
            {error}
          </div>
        )}

        {/* 1. Location Search */}
        <LocationSearch
          currentLocation={location}
          onSelectLocation={handleSelectLocation}
          language={language}
        />

        {/* 2. Air Quality Panel */}
        <AirQualityPanel
          airQuality={airQuality}
          loading={airLoading}
          language={language}
          manualAqi={manualAqi}
          onManualAqiChange={setManualAqi}
        />

        {/* 3. Household Form */}
        {airQuality && (
          <HouseholdForm
            initialProfile={profile}
            onSubmit={handleProfileSubmit}
            loading={planLoading}
            language={language}
          />
        )}

        {/* 4. Explainable Decision Trace ("How AirWise Decided") */}
        {planResponse && (
          <DecisionTraceView trace={planResponse.decisionTrace} language={language} />
        )}

        {/* 5. Plan Recommendations */}
        <PlanView
          planResponse={planResponse}
          loading={planLoading}
          language={language}
        />

        {/* 6. What-If Interactive Engine Slider */}
        {profile && airQuality && (
          <WhatIfSlider
            profile={profile}
            outdoorPm25={airQuality.current.pm25}
            language={language}
          />
        )}

        {/* 7. Ask AirWise Chat Assistant */}
        {profile && airQuality && (
          <AskAirWise
            profile={profile}
            airQuality={airQuality}
            planSummary={planResponse?.plan.summary}
            language={language}
          />
        )}

        {/* 8. Community Share & Print */}
        <CommunityShare
          planResponse={planResponse}
          location={location}
          language={language}
        />

        {/* 9. Transparent Calculation Basis */}
        <HowCalculated language={language} />
      </main>

      <Footer language={language} />
    </>
  );
}
