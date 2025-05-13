
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Language } from '@/lib/i18n';

export function useLanguagePreference() {
  const { currentEmployee, userPreferences, updateUserPreference } = useAuth();
  const [language, setLanguage] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userPreferences) {
      setLanguage(userPreferences.language || 'en');
      setIsLoading(false);
    } else if (currentEmployee) {
      // Fallback: fetch preferences from Supabase if not in context
      const fetchPreferences = async () => {
        try {
          const { data, error } = await supabase
            .from('user_preferences')
            .select('language')
            .eq('user_id', currentEmployee.id)
            .maybeSingle();

          if (error) throw error;
          
          if (data && data.language) {
            setLanguage(data.language as Language);
          }
        } catch (error) {
          console.error('Error fetching language preferences:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchPreferences();
    } else {
      setIsLoading(false);
    }
  }, [currentEmployee, userPreferences]);

  const updateLanguage = async (newLanguage: Language) => {
    setLanguage(newLanguage);
    if (currentEmployee) {
      await updateUserPreference('language', newLanguage);
    }
  };

  return { language, setLanguage: updateLanguage, isLoading };
}
