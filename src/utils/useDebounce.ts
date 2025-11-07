import { useState, useEffect } from 'react';

/**
 * Hook pour debounce une valeur
 * Utile pour les recherches et les inputs fréquents
 * 
 * @param value - La valeur à debounce
 * @param delay - Le délai en millisecondes (défaut: 300ms)
 * @returns La valeur debounced
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebounce(searchTerm, 300);
 * 
 * // Utiliser debouncedSearch dans les requêtes
 * useEffect(() => {
 *   if (debouncedSearch) {
 *     searchSamples(debouncedSearch);
 *   }
 * }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Créer un timer qui met à jour la valeur après le délai
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Nettoyer le timer si la valeur change avant la fin du délai
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

