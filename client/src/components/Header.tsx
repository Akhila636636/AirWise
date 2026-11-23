import type { Language } from '@airwise/shared';
import { t } from '@airwise/shared';
import { LeafIcon, SunIcon, MoonIcon, ContrastIcon } from './Icons';
import styles from './Header.module.css';

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  theme: 'light' | 'dark' | 'high-contrast';
  onThemeChange: (theme: 'light' | 'dark' | 'high-contrast') => void;
}

export function Header({
  language,
  onLanguageChange,
  theme,
  onThemeChange,
}: HeaderProps) {
  const toggleTheme = () => {
    if (theme === 'light') onThemeChange('dark');
    else if (theme === 'dark') onThemeChange('high-contrast');
    else onThemeChange('light');
  };

  const themeLabel =
    theme === 'light'
      ? t('header.theme.light', language)
      : theme === 'dark'
        ? t('header.theme.dark', language)
        : t('header.theme.highContrast', language);

  return (
    <header className={styles.header}>
      <div className={`container ${styles.headerInner}`}>
        <div className={styles.brand}>
          <LeafIcon className={styles.brandIcon} size={28} aria-hidden="true" />
          <div>
            <span className={styles.brandName}>AirWise</span>
            <span className={styles.brandTagline}>
              {t('app.tagline', language)}
            </span>
          </div>
        </div>

        <div className={styles.controls}>
          {/* Language Switcher */}
          <div className={styles.controlItem}>
            <label htmlFor="language-select" className="sr-only">
              {t('header.language', language)}
            </label>
            <select
              id="language-select"
              value={language}
              onChange={(e) => onLanguageChange(e.target.value as Language)}
              className={styles.select}
              aria-label={t('header.language', language)}
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="te">తెలుగు</option>
            </select>
          </div>

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            className={styles.themeBtn}
            title={`${t('header.theme', language)}: ${themeLabel}`}
            aria-label={`${t('header.theme', language)}: ${themeLabel}`}
          >
            {theme === 'light' && <SunIcon size={20} aria-hidden="true" />}
            {theme === 'dark' && <MoonIcon size={20} aria-hidden="true" />}
            {theme === 'high-contrast' && (
              <ContrastIcon size={20} aria-hidden="true" />
            )}
            <span className={styles.themeText}>{themeLabel}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
