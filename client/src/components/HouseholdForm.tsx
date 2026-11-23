import React, { useState, useEffect } from 'react';
import type {
  HouseholdProfile,
  CommuteMode,
  CookingFuel,
  HomeType,
  HeatingType,
  Language,
} from '@airwise/shared';
import { HouseholdProfileSchema, t } from '@airwise/shared';
import styles from './HouseholdForm.module.css';

interface HouseholdFormProps {
  initialProfile: HouseholdProfile | null;
  onSubmit: (profile: HouseholdProfile) => void;
  loading: boolean;
  language: Language;
}

const STORAGE_KEY = 'airwise_household_profile';

export function HouseholdForm({
  initialProfile,
  onSubmit,
  loading,
  language,
}: HouseholdFormProps) {
  const [profile, setProfile] = useState<HouseholdProfile>(() => {
    if (initialProfile) return initialProfile;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return {
      householdSize: 4,
      hasChildren: false,
      hasElderly: false,
      hasSensitiveMembers: false,
      commuteMode: 'metro',
      commuteMinutesPerDay: 40,
      cookingFuel: 'lpg',
      hasAirPurifier: false,
      homeType: 'apartment',
      heatingType: 'none',
      language,
      freeText: '',
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
    }
  }, [initialProfile]);

  const handleChange = <K extends keyof HouseholdProfile>(
    field: K,
    value: HouseholdProfile[K],
  ) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parseResult = HouseholdProfileSchema.safeParse(profile);
    if (!parseResult.success) {
      const errMap: Record<string, string> = {};
      parseResult.error.errors.forEach((err) => {
        const path = err.path.join('.');
        errMap[path] = err.message;
      });
      setErrors(errMap);
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parseResult.data));
    } catch {
      // Ignore localStorage write failure
    }

    setErrors({});
    onSubmit(parseResult.data);
  };

  return (
    <section className={`card ${styles.card}`} aria-labelledby="form-heading">
      <div className={styles.header}>
        <h2 id="form-heading" className={styles.title}>
          {t('household.title', language)}
        </h2>
        <p className={styles.subtitle}>{t('household.subtitle', language)}</p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Family Structure */}
        <div className={styles.formGrid}>
          <div className="form-group">
            <label htmlFor="household-size" className="form-label">
              {t('household.householdSize', language)}
            </label>
            <input
              id="household-size"
              type="number"
              min="1"
              max="20"
              value={profile.householdSize}
              onChange={(e) =>
                handleChange('householdSize', parseInt(e.target.value, 10) || 1)
              }
              aria-describedby={
                errors.householdSize ? 'household-size-err' : 'household-size-hint'
              }
              aria-invalid={!!errors.householdSize}
              className="form-input"
            />
            {errors.householdSize ? (
              <span id="household-size-err" className="form-error" role="alert">
                {errors.householdSize}
              </span>
            ) : (
              <span id="household-size-hint" className="form-hint">
                {t('household.householdSize.hint', language)}
              </span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Vulnerable Family Members</label>
            <div className={styles.checkboxGroup}>
              <label className="checkbox-group">
                <input
                  type="checkbox"
                  checked={profile.hasChildren}
                  onChange={(e) => handleChange('hasChildren', e.target.checked)}
                />
                <span>{t('household.hasChildren', language)}</span>
              </label>
              <label className="checkbox-group">
                <input
                  type="checkbox"
                  checked={profile.hasElderly}
                  onChange={(e) => handleChange('hasElderly', e.target.checked)}
                />
                <span>{t('household.hasElderly', language)}</span>
              </label>
              <label className="checkbox-group">
                <input
                  type="checkbox"
                  checked={profile.hasSensitiveMembers}
                  onChange={(e) =>
                    handleChange('hasSensitiveMembers', e.target.checked)
                  }
                />
                <span>{t('household.hasSensitive', language)}</span>
              </label>
            </div>
          </div>
        </div>

        {/* Commute */}
        <div className={styles.formGrid}>
          <div className="form-group">
            <label htmlFor="commute-mode" className="form-label">
              {t('household.commuteMode', language)}
            </label>
            <select
              id="commute-mode"
              value={profile.commuteMode}
              onChange={(e) =>
                handleChange('commuteMode', e.target.value as CommuteMode)
              }
              className="form-select"
            >
              <option value="walk">{t('commute.walk', language)}</option>
              <option value="cycle">{t('commute.cycle', language)}</option>
              <option value="two-wheeler">
                {t('commute.two-wheeler', language)}
              </option>
              <option value="car">{t('commute.car', language)}</option>
              <option value="bus">{t('commute.bus', language)}</option>
              <option value="metro">{t('commute.metro', language)}</option>
              <option value="work-from-home">
                {t('commute.work-from-home', language)}
              </option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="commute-minutes" className="form-label">
              {t('household.commuteMinutes', language)}
            </label>
            <input
              id="commute-minutes"
              type="number"
              min="0"
              max="300"
              value={profile.commuteMinutesPerDay}
              onChange={(e) =>
                handleChange(
                  'commuteMinutesPerDay',
                  parseInt(e.target.value, 10) || 0,
                )
              }
              disabled={profile.commuteMode === 'work-from-home'}
              className="form-input"
              aria-describedby="commute-hint"
            />
            <span id="commute-hint" className="form-hint">
              {t('household.commuteMinutes.hint', language)}
            </span>
          </div>
        </div>

        {/* Living Conditions */}
        <div className={styles.formGrid}>
          <div className="form-group">
            <label htmlFor="cooking-fuel" className="form-label">
              {t('household.cookingFuel', language)}
            </label>
            <select
              id="cooking-fuel"
              value={profile.cookingFuel}
              onChange={(e) =>
                handleChange('cookingFuel', e.target.value as CookingFuel)
              }
              className="form-select"
            >
              <option value="lpg">{t('fuel.lpg', language)}</option>
              <option value="induction">{t('fuel.induction', language)}</option>
              <option value="biomass">{t('fuel.biomass', language)}</option>
              <option value="kerosene">{t('fuel.kerosene', language)}</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="heating-type" className="form-label">
              {t('household.heatingType', language)}
            </label>
            <select
              id="heating-type"
              value={profile.heatingType}
              onChange={(e) =>
                handleChange('heatingType', e.target.value as HeatingType)
              }
              className="form-select"
            >
              <option value="none">{t('heating.none', language)}</option>
              <option value="electric">{t('heating.electric', language)}</option>
              <option value="wood-coal">{t('heating.wood-coal', language)}</option>
            </select>
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className="form-group">
            <label htmlFor="home-type" className="form-label">
              {t('household.homeType', language)}
            </label>
            <select
              id="home-type"
              value={profile.homeType}
              onChange={(e) =>
                handleChange('homeType', e.target.value as HomeType)
              }
              className="form-select"
            >
              <option value="apartment">{t('home.apartment', language)}</option>
              <option value="independent-house">
                {t('home.independent-house', language)}
              </option>
              <option value="informal-housing">
                {t('home.informal-housing', language)}
              </option>
            </select>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
            <label className="checkbox-group" style={{ marginTop: '1.25rem' }}>
              <input
                type="checkbox"
                checked={profile.hasAirPurifier}
                onChange={(e) =>
                  handleChange('hasAirPurifier', e.target.checked)
                }
              />
              <span>{t('household.hasAirPurifier', language)}</span>
            </label>
          </div>
        </div>

        {/* Free text */}
        <div className="form-group">
          <label htmlFor="free-text" className="form-label">
            {t('household.freeText', language)}
          </label>
          <textarea
            id="free-text"
            rows={2}
            maxLength={200}
            value={profile.freeText ?? ''}
            onChange={(e) => handleChange('freeText', e.target.value)}
            className="form-textarea"
            aria-describedby="freetext-hint"
            placeholder="e.g. Near highway, dusty construction nearby, ground floor..."
          />
          <span id="freetext-hint" className="form-hint">
            {t('household.freeText.hint', language)} ({200 - (profile.freeText?.length ?? 0)} chars left)
          </span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`btn btn-primary ${styles.submitBtn}`}
        >
          {loading ? t('household.saving', language) : t('household.submit', language)}
        </button>
      </form>
    </section>
  );
}
