
import { useState } from 'react';

// This is a simplified version without the language provider
export function useLanguagePreference() {
  const [language, setLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(false);

  // Simplified function that just updates the local state
  const updateLanguage = async (newLanguage: string) => {
    setLanguage(newLanguage);
  };

  return { language, setLanguage: updateLanguage, isLoading };
}
