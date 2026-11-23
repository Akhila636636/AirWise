import { useState } from 'react';
import type { PlanResponse, Location, Language } from '@airwise/shared';
import { t } from '@airwise/shared';
import { generateShareText } from '../utils/format';
import { ShareIcon, CopyIcon, PrintIcon, CheckIcon } from './Icons';
import styles from './CommunityShare.module.css';

interface CommunityShareProps {
  planResponse: PlanResponse | null;
  location: Location | null;
  language: Language;
}

export function CommunityShare({
  planResponse,
  location,
  language,
}: CommunityShareProps) {
  const [copied, setCopied] = useState(false);

  if (!planResponse || !location) {
    return null;
  }

  const handleShare = async () => {
    const text = generateShareText(
      planResponse.plan,
      planResponse.airSummary,
      location.name,
      language,
    );

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AirWise Air Quality Plan',
          text,
        });
        return;
      } catch {
        // User cancelled or share failed, fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignore
    }
  };

  const handleCopy = async () => {
    const text = generateShareText(
      planResponse.plan,
      planResponse.airSummary,
      location.name,
      language,
    );
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignore
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <section className={`card ${styles.wrapper} no-print`} aria-labelledby="share-title">
      <div className={styles.inner}>
        <div>
          <h3 id="share-title" className={styles.title}>
            📢 {t('share.title', language)}
          </h3>
          <p className={styles.subtitle}>
            Share actionable air quality steps with neighbors, school groups, or family.
          </p>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={handleShare}
            className="btn btn-primary"
            aria-label={t('share.button', language)}
          >
            <ShareIcon size={18} aria-hidden="true" />
            <span>{t('share.button', language)}</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="btn btn-secondary"
            aria-label={copied ? t('share.copied', language) : t('share.copy', language)}
          >
            {copied ? (
              <>
                <CheckIcon size={18} aria-hidden="true" />
                <span>{t('share.copied', language)}</span>
              </>
            ) : (
              <>
                <CopyIcon size={18} aria-hidden="true" />
                <span>{t('share.copy', language)}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-secondary"
            aria-label={t('share.print', language)}
          >
            <PrintIcon size={18} aria-hidden="true" />
            <span>{t('share.print', language)}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
