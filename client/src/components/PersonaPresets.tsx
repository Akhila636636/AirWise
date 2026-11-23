import type { PersonaPreset, Language } from '@airwise/shared';
import styles from './PersonaPresets.module.css';

interface PersonaPresetsProps {
  onSelectPreset: (preset: PersonaPreset) => void;
  language?: Language;
}

export const PRESETS: readonly PersonaPreset[] = [
  {
    id: 'family_toddler',
    title: 'Family with a Toddler',
    subtitle: 'Delhi apartment • LPG cooking • No purifier • 2-wheeler commute',
    location: {
      name: 'Delhi',
      latitude: 28.6139,
      longitude: 77.209,
      country: 'India',
      admin1: 'Delhi',
    },
    profile: {
      householdSize: 4,
      hasChildren: true,
      hasElderly: false,
      hasSensitiveMembers: true,
      commuteMode: 'two-wheeler',
      commuteMinutesPerDay: 40,
      cookingFuel: 'lpg',
      hasAirPurifier: false,
      homeType: 'apartment',
      heatingType: 'none',
      language: 'en',
      freeText: 'Toddler has mild nighttime cough during winter mornings.',
    },
  },
  {
    id: 'elderly_informal',
    title: 'Elderly Parents (Low Budget)',
    subtitle: 'Informal housing • Biomass/wood cooking • Zero-cost solutions',
    location: {
      name: 'Patna',
      latitude: 25.5941,
      longitude: 85.1376,
      country: 'India',
      admin1: 'Bihar',
    },
    profile: {
      householdSize: 3,
      hasChildren: false,
      hasElderly: true,
      hasSensitiveMembers: true,
      commuteMode: 'walk',
      commuteMinutesPerDay: 20,
      cookingFuel: 'biomass',
      hasAirPurifier: false,
      homeType: 'informal-housing',
      heatingType: 'wood-coal',
      language: 'hi',
      freeText: 'Budget is limited; need free ventilation and DIY hacks.',
    },
  },
  {
    id: 'student_commuter',
    title: 'Student on Two-Wheeler',
    subtitle: 'Hyderabad • Long daily commute • Focus on mask & transport',
    location: {
      name: 'Hyderabad',
      latitude: 17.385,
      longitude: 78.4867,
      country: 'India',
      admin1: 'Telangana',
    },
    profile: {
      householdSize: 2,
      hasChildren: false,
      hasElderly: false,
      hasSensitiveMembers: false,
      commuteMode: 'two-wheeler',
      commuteMinutesPerDay: 60,
      cookingFuel: 'induction',
      hasAirPurifier: false,
      homeType: 'apartment',
      heatingType: 'none',
      language: 'te',
      freeText: 'College commute through heavy traffic junction daily.',
    },
  },
];

export function PersonaPresets({ onSelectPreset, language: _language }: PersonaPresetsProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.headerRow}>
        <span className={styles.label}>⚡ Quick Persona Presets (1-Click Setup):</span>
      </div>
      <div className={styles.presetsGrid}>
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelectPreset(preset)}
            className={styles.presetCard}
            aria-label={`Select persona: ${preset.title}`}
          >
            <span className={styles.cardTitle}>{preset.title}</span>
            <span className={styles.cardSubtitle}>{preset.subtitle}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
