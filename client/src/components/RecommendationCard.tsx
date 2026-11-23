import type { Recommendation, ActionImpact, Language } from '@airwise/shared';
import { t } from '@airwise/shared';
import { formatExposure, formatCigarettes, formatCo2e } from '../utils/format';
import styles from './RecommendationCard.module.css';

interface RecommendationCardProps {
  recommendation: Recommendation;
  impact?: ActionImpact;
  language: Language;
}

export function RecommendationCard({
  recommendation,
  impact,
  language,
}: RecommendationCardProps) {
  const { title, steps, whyItHelps, difficulty, cost } = recommendation;

  return (
    <article className={`card ${styles.card}`}>
      <div className={styles.header}>
        <h4 className={styles.title}>{title}</h4>
        <div className={styles.badges}>
          <span className={`badge ${styles[difficulty]}`}>
            {t(`rec.difficulty.${difficulty}`, language)}
          </span>
          <span className={`badge ${styles[cost]}`}>
            {t(`rec.cost.${cost}`, language)}
          </span>
        </div>
      </div>

      <ol className={styles.stepList}>
        {steps.map((step, idx) => (
          <li key={idx} className={styles.stepItem}>
            {step}
          </li>
        ))}
      </ol>

      <div className={styles.whyBox}>
        <span className={styles.whyLabel}>{t('rec.whyHelps', language)}:</span>
        <p className={styles.whyText}>{whyItHelps}</p>
      </div>

      {impact && (
        <div className={styles.impactBox}>
          <span className={styles.impactLabel}>{t('rec.impact', language)}:</span>
          <div className={styles.impactMetrics}>
            {impact.exposureReductionPercent > 0 && (
              <span className={styles.metricItem}>
                📉 <strong>{formatExposure(impact.exposureReductionPercent)}%</strong>{' '}
                {t('rec.exposureReduction', language)}
              </span>
            )}
            {impact.cigarettesAvoided > 0 && (
              <span className={styles.metricItem}>
                🚭 <strong>{formatCigarettes(impact.cigarettesAvoided)}</strong>{' '}
                {t('rec.cigarettesAvoided', language)}
              </span>
            )}
            {impact.co2eAvoidedPerWeek > 0 && (
              <span className={styles.metricItem}>
                🌱 <strong>{formatCo2e(impact.co2eAvoidedPerWeek)}</strong>{' '}
                {t('rec.co2eAvoided', language)}
              </span>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
