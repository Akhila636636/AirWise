import React, { useState, useEffect, useRef } from 'react';
import type { Location, Language } from '@airwise/shared';
import { t } from '@airwise/shared';
import { SearchIcon, LocationIcon } from './Icons';
import { searchCities } from '../utils/api';
import styles from './LocationSearch.module.css';

interface LocationSearchProps {
  currentLocation: Location | null;
  onSelectLocation: (loc: Location) => void;
  language: Language;
}

export function LocationSearch({
  currentLocation,
  onSelectLocation,
  language,
}: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced autocomplete (300ms)
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchCities(query);
        setSuggestions(results);
        setIsOpen(results.length > 0);
      } catch (err) {
        console.error('City search failed', err);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (loc: Location) => {
    onSelectLocation(loc);
    setQuery(loc.name);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelect(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Browser Geolocation
  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus(t('location.search.error', language));
      return;
    }

    setGeoStatus(t('location.search.locating', language));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoStatus(null);
        onSelectLocation({
          name: 'My Current Location',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoStatus(t('location.search.denied', language));
        } else {
          setGeoStatus(t('location.search.error', language));
        }
      },
      { timeout: 8000 },
    );
  };

  return (
    <div className={styles.wrapper} ref={containerRef}>
      <div className={styles.searchBar}>
        <div className={styles.inputContainer}>
          <SearchIcon className={styles.searchIcon} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-controls="city-suggestions"
            aria-activedescendant={
              selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined
            }
            aria-label={t('location.search.label', language)}
            placeholder={
              currentLocation
                ? currentLocation.name
                : t('location.search.placeholder', language)
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            className={styles.input}
          />
          {loading && <span className={styles.spinner} aria-hidden="true" />}
        </div>

        <button
          type="button"
          onClick={handleUseLocation}
          className={`btn btn-secondary ${styles.locationBtn}`}
          title={t('location.search.useMyLocation', language)}
        >
          <LocationIcon size={18} aria-hidden="true" />
          <span>{t('location.search.useMyLocation', language)}</span>
        </button>
      </div>

      {geoStatus && (
        <div className={styles.geoStatus} role="status" aria-live="polite">
          {geoStatus}
        </div>
      )}

      {isOpen && suggestions.length > 0 && (
        <ul
          id="city-suggestions"
          role="listbox"
          className={styles.dropdown}
        >
          {suggestions.map((loc, idx) => (
            <li
              key={`${loc.name}-${loc.latitude}-${loc.longitude}-${idx}`}
              id={`suggestion-${idx}`}
              role="option"
              aria-selected={selectedIndex === idx}
              className={`${styles.dropdownItem} ${
                selectedIndex === idx ? styles.activeItem : ''
              }`}
              onClick={() => handleSelect(loc)}
            >
              <span className={styles.cityName}>{loc.name}</span>
              <span className={styles.cityDetails}>
                {[loc.admin1, loc.country].filter(Boolean).join(', ')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
