import type { Language } from '@airwise/shared';
import { t } from '@airwise/shared';

interface HowCalculatedProps {
  language: Language;
}

export function HowCalculated({ language }: HowCalculatedProps) {
  return (
    <details className="card" style={{ marginBottom: 'var(--space-8)' }}>
      <summary
        style={{
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: 'var(--font-size-base)',
          color: 'var(--color-primary)',
        }}
      >
        ℹ️ {t('howCalc.title', language)}
      </summary>

      <div style={{ marginTop: 'var(--space-4)', fontSize: 'var(--font-size-sm)', lineHeight: 1.6 }}>
        <p style={{ marginBottom: 'var(--space-2)' }}>
          {t('howCalc.intro', language)}
        </p>

        <ul style={{ paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <li>
            <strong>{t('howCalc.cigarette', language)}</strong>
          </li>
          <li>
            <strong>{t('howCalc.indoor', language)}</strong>
          </li>
          <li>
            <strong>{t('howCalc.purifier', language)}</strong>
          </li>
          <li>
            <strong>{t('howCalc.n95', language)}</strong>
          </li>
          <li>
            <strong>{t('howCalc.cooking', language)}</strong>
          </li>
          <li>
            <strong>{t('howCalc.emissions', language)}</strong>
          </li>
        </ul>

        <p style={{ marginTop: 'var(--space-3)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
          {t('howCalc.note', language)}
        </p>
      </div>
    </details>
  );
}
