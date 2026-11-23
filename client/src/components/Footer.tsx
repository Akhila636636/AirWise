import type { Language } from '@airwise/shared';
import { t } from '@airwise/shared';

interface FooterProps {
  language: Language;
}

export function Footer({ language }: FooterProps) {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--color-border)',
        padding: 'var(--space-6) 0',
        marginTop: 'var(--space-8)',
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--font-size-xs)',
        textAlign: 'center',
      }}
    >
      <div className="container">
        <p style={{ marginBottom: 'var(--space-2)' }}>
          <strong>{t('footer.disclaimer', language)}</strong>
        </p>
        <p>{t('footer.copyright', language)} • Production Grade Open Source</p>
      </div>
    </footer>
  );
}
