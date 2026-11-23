import { useState, useMemo } from 'react';
import type { HouseholdProfile, WhatIfScenario, Language } from '@airwise/shared';
import { calculateWhatIf, t } from '@airwise/shared';
import { formatExposure, formatCigarettes, formatCo2e } from '../utils/format';
import styles from './WhatIfSlider.module.css';

interface WhatIfSliderProps {
  profile: HouseholdProfile;
  outdoorPm25: number;
  language: Language;
}

export function WhatIfSlider({
  profile,
  outdoorPm25,
  language,
}: WhatIfSliderProps) {
  const [scenario, setScenario] = useState<WhatIfScenario>({
    metroDaysPerWeek: profile.commuteMode === 'metro' ? 5 : 0,
    purifierOn: profile.hasAirPurifier,
    n95OnCommute: false,
    inductionCookingDays: profile.cookingFuel === 'induction' ? 7 : 0,
  });

  // Calculate baseline (scenario with zero interventions)
  const baselineResult = useMemo(() => {
    return calculateWhatIf(profile, outdoorPm25, {
      metroDaysPerWeek: 0,
      purifierOn: false,
      n95OnCommute: false,
      inductionCookingDays: 0,
    });
  }, [profile, outdoorPm25]);

  // Current scenario result
  const currentResult = useMemo(() => {
    return calculateWhatIf(profile, outdoorPm25, scenario);
  }, [profile, outdoorPm25, scenario]);

  const exposureReductionPercent =
    baselineResult.weeklyExposure > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              ((baselineResult.weeklyExposure - currentResult.weeklyExposure) /
                baselineResult.weeklyExposure) *
                100,
            ),
          ),
        )
      : 0;

  return (
    <section className={`card ${styles.wrapper}`} aria-labelledby="whatif-title">
      <div className={styles.header}>
        <h3 id="whatif-title" className={styles.title}>
          🎛️ {t('whatif.title', language)}
        </h3>
        <p className={styles.subtitle}>{t('whatif.subtitle', language)}</p>
      </div>

      <div className={styles.controlsGrid}>
        {/* Metro Days Slider */}
        <div className={styles.controlItem}>
          <div className={styles.labelRow}>
            <label htmlFor="metro-days-range" className={styles.sliderLabel}>
              {t('whatif.metroDays', language)}
            </label>
            <span className={styles.sliderValue}>
              {scenario.metroDaysPerWeek} days
            </span>
          </div>
          <input
            id="metro-days-range"
            type="range"
            min="0"
            max="7"
            step="1"
            value={scenario.metroDaysPerWeek}
            onChange={(e) =>
              setScenario((prev) => ({
                ...prev,
                metroDaysPerWeek: parseInt(e.target.value, 10),
              }))
            }
            className={styles.rangeInput}
            aria-valuemin={0}
            aria-valuemax={7}
            aria-valuenow={scenario.metroDaysPerWeek}
          />
        </div>

        {/* Induction Cooking Days Slider */}
        <div className={styles.controlItem}>
          <div className={styles.labelRow}>
            <label htmlFor="induction-days-range" className={styles.sliderLabel}>
              {t('whatif.inductionDays', language)}
            </label>
            <span className={styles.sliderValue}>
              {scenario.inductionCookingDays} days
            </span>
          </div>
          <input
            id="induction-days-range"
            type="range"
            min="0"
            max="7"
            step="1"
            value={scenario.inductionCookingDays}
            onChange={(e) =>
              setScenario((prev) => ({
                ...prev,
                inductionCookingDays: parseInt(e.target.value, 10),
              }))
            }
            className={styles.rangeInput}
            aria-valuemin={0}
            aria-valuemax={7}
            aria-valuenow={scenario.inductionCookingDays}
          />
        </div>

        {/* Toggles */}
        <div className={styles.toggleRow}>
          <label className="checkbox-group">
            <input
              type="checkbox"
              checked={scenario.purifierOn}
              onChange={(e) =>
                setScenario((prev) => ({ ...prev, purifierOn: e.target.checked }))
              }
            />
            <span>{t('whatif.purifier', language)}</span>
          </label>

          <label className="checkbox-group">
            <input
              type="checkbox"
              checked={scenario.n95OnCommute}
              onChange={(e) =>
                setScenario((prev) => ({ ...prev, n95OnCommute: e.target.checked }))
              }
            />
            <span>{t('whatif.n95', language)}</span>
          </label>
        </div>
      </div>

      {/* Before / After Comparison */}
      <div
        className={styles.resultsBox}
        role="region"
        aria-live="polite"
        aria-label="What-if simulated results"
      >
        <div className={styles.metricCard}>
          <span className={styles.metricTitle}>
            {t('whatif.weeklyExposure', language)}
          </span>
          <div className={styles.comparisonBar}>
            <div className={styles.barItem}>
              <span className={styles.barLabel}>{t('whatif.before', language)}</span>
              <div className={styles.barTrack}>
                <div className={styles.barBaseline} style={{ width: '100%' }} />
              </div>
              <span className={styles.barVal}>
                {formatExposure(baselineResult.weeklyExposure)}{' '}
                {t('whatif.unit.ugm3h', language)}
              </span>
            </div>

            <div className={styles.barItem}>
              <span className={styles.barLabel}>{t('whatif.after', language)}</span>
              <div className={styles.barTrack}>
                <div
                  className={styles.barCurrent}
                  style={{
                    width: `${Math.max(
                      10,
                      Math.min(
                        100,
                        (currentResult.weeklyExposure /
                          (baselineResult.weeklyExposure || 1)) *
                          100,
                      ),
                    )}%`,
                  }}
                />
              </div>
              <span className={styles.barVal}>
                {formatExposure(currentResult.weeklyExposure)}{' '}
                {t('whatif.unit.ugm3h', language)}
                {exposureReductionPercent > 0 && (
                  <strong className={styles.savedTag}>
                    (-{exposureReductionPercent}%)
                  </strong>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statPill}>
            <span className={styles.statLabel}>
              {t('whatif.cigarettes', language)}
            </span>
            <span className={styles.statNumber}>
              {formatCigarettes(currentResult.cigaretteEquivalents)} / wk
            </span>
          </div>

          <div className={styles.statPill}>
            <span className={styles.statLabel}>{t('whatif.co2e', language)}</span>
            <span className={styles.statNumber}>
              {formatCo2e(currentResult.co2ePerWeek)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
