import { useState } from 'react';
import type { DecisionTrace, Language } from '@airwise/shared';
import { t } from '@airwise/shared';
import styles from './DecisionTraceView.module.css';

interface DecisionTraceViewProps {
  trace: DecisionTrace | null;
  language: Language;
}

export function DecisionTraceView({ trace, language }: DecisionTraceViewProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!trace) {
    return null;
  }

  const topPriorities = trace.topActions.slice(0, 3);

  return (
    <section className={`card ${styles.wrapper}`} aria-labelledby="decision-heading">
      <div className={styles.header}>
        <div>
          <span className={styles.badge}>Transparent AI Engine</span>
          <h3 id="decision-heading" className={styles.title}>
            🧠 How AirWise Decided Your Priorities
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`btn btn-secondary ${styles.toggleBtn}`}
          aria-expanded={isOpen}
          aria-controls="decision-details"
        >
          {isOpen ? 'Hide Formula & Rules ▲' : 'Inspect Decision Formula ▼'}
        </button>
      </div>

      {/* Top 3 Prioritized Actions */}
      <div className={styles.topThreeList}>
        <div className={styles.topThreeHeader}>
          <strong>🎯 Recommended Top 3 Priorities:</strong>
        </div>
        <ol className={styles.priorityList}>
          {topPriorities.map((item, idx) => (
            <li key={item.actionId} className={styles.priorityItem}>
              <div className={styles.itemHeader}>
                <span className={styles.itemRank}>#{idx + 1}</span>
                <span className={styles.actionName}>{t(`action.${item.actionId}`, language)}</span>
                <span className={styles.scorePill}>Score: {item.score}</span>
              </div>
              <p className={styles.itemReason}>
                <strong>Why this is recommended for you:</strong> {item.reason}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {isOpen && (
        <div id="decision-details" className={styles.detailsContent}>
          {/* Formula */}
          <div className={styles.formulaBox}>
            <span className={styles.boxLabel}>Deterministic Scoring Formula:</span>
            <code>{trace.formula}</code>
          </div>

          {/* Active seasonal factors */}
          {trace.seasonFactors.length > 0 && (
            <div className={styles.sectionBlock}>
              <span className={styles.boxLabel}>Active Environmental & Seasonal Rules:</span>
              <ul className={styles.bulletList}>
                {trace.seasonFactors.map((factor, idx) => (
                  <li key={idx}>🍂 {factor}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Excluded Actions with Reasons */}
          {trace.excludedActions.length > 0 && (
            <div className={styles.sectionBlock}>
              <span className={styles.boxLabel}>Excluded Infeasible Actions & Rationales:</span>
              <ul className={styles.excludedList}>
                {trace.excludedActions.map((ex, idx) => (
                  <li key={idx} className={styles.excludedItem}>
                    <strong>{t(`action.${ex.actionId}`, language)}:</strong>{' '}
                    <span className={styles.excludedReason}>Excluded — {ex.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
