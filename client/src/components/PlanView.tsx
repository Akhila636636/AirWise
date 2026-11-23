import { useState } from 'react';
import type { PlanResponse, Language, ActionImpact, AffordabilityFilter } from '@airwise/shared';
import { t } from '@airwise/shared';
import { RecommendationCard } from './RecommendationCard';
import { LoadingSkeleton } from './LoadingSkeleton';
import styles from './PlanView.module.css';

interface PlanViewProps {
  planResponse: PlanResponse | null;
  loading: boolean;
  language: Language;
}

export function PlanView({ planResponse, loading, language }: PlanViewProps) {
  const [isSimpleMode, setIsSimpleMode] = useState(false);
  const [affordability, setAffordability] = useState<AffordabilityFilter>('all');

  if (loading) {
    return (
      <section className={styles.wrapper} aria-busy="true">
        <LoadingSkeleton height="3rem" width="50%" />
        <div style={{ marginTop: '1.5rem' }}>
          <LoadingSkeleton height="12rem" />
        </div>
      </section>
    );
  }

  if (!planResponse) {
    return null;
  }

  const { plan, impact, source, decisionTrace, airSummary } = planResponse;

  // Impact lookup
  const impactMap = new Map<string, ActionImpact>();
  for (const item of impact.actions) {
    impactMap.set(item.actionId, item);
  }

  // Current hour of day
  const currentHour = new Date().getHours();
  const isMorning = currentHour >= 5 && currentHour < 12;
  const isAfternoon = currentHour >= 12 && currentHour < 17;
  const timeOfDayFocus = isMorning ? 'Morning Focus' : isAfternoon ? 'Afternoon Focus' : 'Evening Focus';

  // Filter actions based on affordability filter
  const filterAction = (rec: { cost: string }) => {
    if (affordability === 'free') return rec.cost === 'free';
    if (affordability === 'low') return rec.cost === 'free' || rec.cost === 'low';
    return true;
  };

  const topThree = decisionTrace ? decisionTrace.topActions.slice(0, 3) : [];

  return (
    <section className={styles.wrapper} aria-labelledby="plan-main-title">
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h2 id="plan-main-title" className={styles.mainTitle}>
            {t('plan.title', language)}
          </h2>
          <span
            className={`badge ${
              source === 'llm' ? styles.badgeLlm : styles.badgeRules
            }`}
          >
            {source === 'llm'
              ? t('plan.source.llm', language)
              : t('plan.source.rules', language)}
          </span>

          {/* Simple Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsSimpleMode(!isSimpleMode)}
            className={`btn btn-secondary ${styles.simpleToggleBtn}`}
            aria-pressed={isSimpleMode}
          >
            {isSimpleMode ? 'Switch to Detailed View' : '👓 Switch to Simple Mode (Elderly/Low Literacy)'}
          </button>
        </div>

        <p className={styles.summaryText}>{plan.summary}</p>
      </div>

      {/* Dynamic Time-of-Day Adaptive Context Banner */}
      <div className={styles.timeOfDayBanner}>
        <div className={styles.timeTag}>🕒 What to do right now ({timeOfDayFocus}):</div>
        <div className={styles.timeAdvice}>
          {isMorning && (
            <span>
              Thermal inversion peak: keep doors shut and wear N95 during transit. Wait for ventilation window (<strong>{airSummary.bestVentilationWindow.label}</strong>).
            </span>
          )}
          {isAfternoon && (
            <span>
              Sunlight lifts ground inversion: use ventilation window (<strong>{airSummary.bestVentilationWindow.label}</strong>) and avoid afternoon traffic arteries.
            </span>
          )}
          {!isMorning && !isAfternoon && (
            <span>
              Evening smog settling: seal gaps under doors with damp towels, turn on bedroom air cleaner, and isolate kitchen cooking soot.
            </span>
          )}
        </div>
      </div>

      {/* Simple Mode Presentation */}
      {isSimpleMode ? (
        <div className={styles.simpleModeContainer}>
          <div className={styles.simpleModeHeader}>
            <span className={styles.simpleIcon}>🎯</span>
            <h3 className={styles.simpleTitle}>Do These 3 Things First (3 ముఖ్యమైన పనులు / 3 मुख्य कदम):</h3>
          </div>
          <div className={styles.simpleCardsList}>
            {topThree.map((act, idx) => (
              <div key={act.actionId} className={styles.simpleCard}>
                <div className={styles.simpleCardRank}>#{idx + 1}</div>
                <div>
                  <h4 className={styles.simpleActionTitle}>
                    {t(`action.${act.actionId}`, language)}
                  </h4>
                  <p className={styles.simpleActionReason}>{act.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Affordability Filter Bar */}
          <div className={styles.filterBar}>
            <span className={styles.filterLabel}>Affordability Filter:</span>
            <div className={styles.filterButtons}>
              <button
                type="button"
                onClick={() => setAffordability('all')}
                className={`btn ${affordability === 'all' ? 'btn-primary' : 'btn-secondary'} ${styles.filterBtn}`}
              >
                All Recommendations
              </button>
              <button
                type="button"
                onClick={() => setAffordability('low')}
                className={`btn ${affordability === 'low' ? 'btn-primary' : 'btn-secondary'} ${styles.filterBtn}`}
              >
                Low Cost Only
              </button>
              <button
                type="button"
                onClick={() => setAffordability('free')}
                className={`btn ${affordability === 'free' ? 'btn-primary' : 'btn-secondary'} ${styles.filterBtn}`}
              >
                Zero-Cost / Free Hacks Only
              </button>
            </div>
          </div>

          {/* Special "No Purifier, Zero Budget" Callout */}
          {affordability === 'free' && (
            <div className={styles.freeBudgetCallout}>
              💡 <strong>No Purifier, Zero Budget Path:</strong> Focus on ventilation window timing, damp micro-fiber mopping (stops dust resuspension), rolled damp towels under doors, and kitchen door isolation.
            </div>
          )}

          {/* Routine Section */}
          <section className={styles.section} aria-labelledby="routine-heading">
            <h3 id="routine-heading" className={styles.sectionTitle}>
              {t('plan.routine', language)}
            </h3>

            {plan.routine.morning.filter(filterAction).length > 0 && (
              <div className={styles.subSection}>
                <h4 className={styles.subTitle}>
                  🌅 {t('plan.routine.morning', language)}
                </h4>
                <div className={styles.cardGrid}>
                  {plan.routine.morning.filter(filterAction).map((rec) => (
                    <RecommendationCard
                      key={rec.actionId}
                      recommendation={rec}
                      impact={impactMap.get(rec.actionId)}
                      language={language}
                    />
                  ))}
                </div>
              </div>
            )}

            {plan.routine.afternoon.filter(filterAction).length > 0 && (
              <div className={styles.subSection}>
                <h4 className={styles.subTitle}>
                  ☀️ {t('plan.routine.afternoon', language)}
                </h4>
                <div className={styles.cardGrid}>
                  {plan.routine.afternoon.filter(filterAction).map((rec) => (
                    <RecommendationCard
                      key={rec.actionId}
                      recommendation={rec}
                      impact={impactMap.get(rec.actionId)}
                      language={language}
                    />
                  ))}
                </div>
              </div>
            )}

            {plan.routine.evening.filter(filterAction).length > 0 && (
              <div className={styles.subSection}>
                <h4 className={styles.subTitle}>
                  🌙 {t('plan.routine.evening', language)}
                </h4>
                <div className={styles.cardGrid}>
                  {plan.routine.evening.filter(filterAction).map((rec) => (
                    <RecommendationCard
                      key={rec.actionId}
                      recommendation={rec}
                      impact={impactMap.get(rec.actionId)}
                      language={language}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Indoor Section */}
          {plan.indoor.filter(filterAction).length > 0 && (
            <section className={styles.section} aria-labelledby="indoor-heading">
              <h3 id="indoor-heading" className={styles.sectionTitle}>
                🏠 {t('plan.indoor', language)}
              </h3>
              <div className={styles.cardGrid}>
                {plan.indoor.filter(filterAction).map((rec) => (
                  <RecommendationCard
                    key={rec.actionId}
                    recommendation={rec}
                    impact={impactMap.get(rec.actionId)}
                    language={language}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Sustainable Section */}
          {plan.sustainable.filter(filterAction).length > 0 && (
            <section className={styles.section} aria-labelledby="sustainable-heading">
              <h3 id="sustainable-heading" className={styles.sectionTitle}>
                🚲 {t('plan.sustainable', language)}
              </h3>
              <div className={styles.cardGrid}>
                {plan.sustainable.filter(filterAction).map((rec) => (
                  <RecommendationCard
                    key={rec.actionId}
                    recommendation={rec}
                    impact={impactMap.get(rec.actionId)}
                    language={language}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Protection Section */}
          {plan.protection.filter(filterAction).length > 0 && (
            <section className={styles.section} aria-labelledby="protection-heading">
              <h3 id="protection-heading" className={styles.sectionTitle}>
                🛡️ {t('plan.protection', language)}
              </h3>
              <div className={styles.cardGrid}>
                {plan.protection.filter(filterAction).map((rec) => (
                  <RecommendationCard
                    key={rec.actionId}
                    recommendation={rec}
                    impact={impactMap.get(rec.actionId)}
                    language={language}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Medical disclaimer note */}
      <div className={styles.notMedicalNotice} role="note">
        <strong>⚠️ {t('plan.notMedical', language)}</strong>
      </div>
    </section>
  );
}
