import { useState, Suspense, lazy } from 'react';
import type { AirQualitySummary, Language } from '@airwise/shared';
import { t } from '@airwise/shared';
import { LoadingSkeleton } from './LoadingSkeleton';
import styles from './AirQualityPanel.module.css';

// Lazy-load Recharts component for fast initial render
const ForecastChart = lazy(() => import('./ForecastChart'));

interface AirQualityPanelProps {
  airQuality: AirQualitySummary | null;
  loading: boolean;
  language: Language;
  manualAqi: number | null;
  onManualAqiChange: (val: number | null) => void;
}

export function AirQualityPanel({
  airQuality,
  loading,
  language,
  manualAqi,
  onManualAqiChange,
}: AirQualityPanelProps) {
  const [showTable, setShowTable] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);

  if (loading && !airQuality) {
    return (
      <section
        className={`card ${styles.panel}`}
        aria-label={t('airQuality.title', language)}
        aria-busy="true"
      >
        <LoadingSkeleton height="3rem" width="60%" />
        <div style={{ marginTop: '1rem' }}>
          <LoadingSkeleton height="8rem" />
        </div>
      </section>
    );
  }

  if (!airQuality) {
    return null;
  }

  const { current, hourly, bestVentilationWindow, worstOutdoorWindow } = airQuality;
  const aqiValue = manualAqi !== null ? manualAqi : current.usAqi;
  const category = current.category;

  return (
    <section
      className={`card ${styles.panel}`}
      aria-labelledby="aqi-heading"
    >
      <div className={styles.header}>
        <div>
          <h2 id="aqi-heading" className={styles.title}>
            {t('airQuality.title', language)}
          </h2>
          <p className={styles.subtitle}>
            {bestVentilationWindow && (
              <span>
                <strong>{t('airQuality.bestWindow', language)}:</strong>{' '}
                {bestVentilationWindow.label}
              </span>
            )}
          </p>
        </div>

        {/* Manual AQI toggle */}
        <button
          type="button"
          onClick={() => setShowManualInput(!showManualInput)}
          className={`btn btn-secondary ${styles.manualToggleBtn}`}
          aria-expanded={showManualInput}
        >
          {t('airQuality.manualAqi', language)}
        </button>
      </div>

      {showManualInput && (
        <div className={styles.manualSliderBox}>
          <label htmlFor="manual-aqi-slider" className={styles.sliderLabel}>
            {t('airQuality.manualAqi.hint', language)}: <strong>{aqiValue}</strong>
          </label>
          <input
            id="manual-aqi-slider"
            type="range"
            min="0"
            max="500"
            step="5"
            value={aqiValue}
            onChange={(e) => onManualAqiChange(Number(e.target.value))}
            className={styles.rangeInput}
            aria-valuemin={0}
            aria-valuemax={500}
            aria-valuenow={aqiValue}
          />
          <button
            type="button"
            onClick={() => onManualAqiChange(null)}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', minHeight: '32px' }}
          >
            Reset to live data
          </button>
        </div>
      )}

      {/* Hero AQI display */}
      <div
        className={styles.heroBanner}
        style={{
          borderLeftColor: category.color,
          backgroundColor: category.bgColor ? `${category.bgColor}40` : 'var(--color-bg-secondary)',
        }}
      >
        <div className={styles.aqiMetric}>
          <div className={styles.aqiNumber} style={{ color: category.color }}>
            {aqiValue}
          </div>
          <div className={styles.aqiMeta}>
            <span className={styles.aqiUnit}>{t('airQuality.usAqi', language)}</span>
            <div
              className={styles.categoryBadge}
              style={{ backgroundColor: category.color, color: '#ffffff' }}
            >
              <span aria-hidden="true">{category.icon}</span>
              <span>{category.label}</span>
            </div>
          </div>
        </div>

        {/* Particulate matter breakdown */}
        <div className={styles.pollutants}>
          <div className={styles.pollutantCard}>
            <span className={styles.pollutantLabel}>
              {t('airQuality.pm25', language)}
            </span>
            <span className={styles.pollutantValue}>
              {current.pm25}{' '}
              <span className={styles.pollutantUnit}>
                {t('airQuality.unit', language)}
              </span>
            </span>
          </div>
          <div className={styles.pollutantCard}>
            <span className={styles.pollutantLabel}>
              {t('airQuality.pm10', language)}
            </span>
            <span className={styles.pollutantValue}>
              {current.pm10}{' '}
              <span className={styles.pollutantUnit}>
                {t('airQuality.unit', language)}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Windows Advice Box */}
      <div className={styles.windowsGrid}>
        <div className={`${styles.windowCard} ${styles.bestWindow}`}>
          <div className={styles.windowIcon}>🌬️</div>
          <div>
            <div className={styles.windowTitle}>
              {t('airQuality.bestWindow', language)}
            </div>
            <div className={styles.windowTime}>
              {bestVentilationWindow.label}
            </div>
          </div>
        </div>

        <div className={`${styles.windowCard} ${styles.worstWindow}`}>
          <div className={styles.windowIcon}>⚠️</div>
          <div>
            <div className={styles.windowTitle}>
              {t('airQuality.worstWindow', language)}
            </div>
            <div className={styles.windowTime}>
              {worstOutdoorWindow.label}
            </div>
          </div>
        </div>
      </div>

      {/* Forecast Chart Section */}
      <div className={styles.chartSection}>
        <div className={styles.chartHeader}>
          <h3 className={styles.chartTitle}>
            {t('airQuality.forecast', language)}
          </h3>
          <button
            type="button"
            onClick={() => setShowTable(!showTable)}
            className={`btn btn-secondary ${styles.toggleTableBtn}`}
            aria-expanded={showTable}
            aria-controls="forecast-table"
          >
            {showTable
              ? t('airQuality.showChart', language)
              : t('airQuality.showTable', language)}
          </button>
        </div>

        {showTable ? (
          <div id="forecast-table" className={styles.tableWrapper}>
            <table className={styles.table}>
              <caption className="sr-only">
                {t('airQuality.forecast', language)} data table
              </caption>
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">AQI</th>
                  <th scope="col">PM2.5 (µg/m³)</th>
                  <th scope="col">PM10 (µg/m³)</th>
                </tr>
              </thead>
              <tbody>
                {hourly.slice(0, 24).map((row, idx) => (
                  <tr key={idx}>
                    <td>{new Date(row.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{row.usAqi}</td>
                    <td>{row.pm25}</td>
                    <td>{row.pm10}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Suspense
            fallback={<LoadingSkeleton height="260px" width="100%" />}
          >
            <ForecastChart data={hourly} />
          </Suspense>
        )}
      </div>
    </section>
  );
}
