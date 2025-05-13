
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Language, getTranslations, Translations } from '@/lib/i18n';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [translations, setTranslations] = useState<Translations>(getTranslations('en'));
  const { currentEmployee, isAuthenticated } = useAuth();

  // Fetch language preference from Supabase when the user logs in
  useEffect(() => {
    const fetchLanguagePreference = async () => {
      if (!isAuthenticated || !currentEmployee) return;
      
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('language')
          .eq('user_id', currentEmployee.id)
          .maybeSingle();
        
        if (error) throw error;
        
        if (data && data.language) {
          const userLang = data.language as Language;
          setLanguage(userLang);
          setTranslations(getTranslations(userLang));
        } else {
          // Create default preference if none exists
          await supabase
            .from('user_preferences')
            .insert({ user_id: currentEmployee.id, language: 'en' })
            .select()
            .single();
        }
      } catch (error) {
        console.error('Error fetching language preference:', error);
      }
    };
    
    fetchLanguagePreference();
  }, [currentEmployee, isAuthenticated]);
  
  // Update language and save preference to database
  const handleSetLanguage = async (newLanguage: Language) => {
    setLanguage(newLanguage);
    setTranslations(getTranslations(newLanguage));
    
    if (isAuthenticated && currentEmployee) {
      try {
        const { error } = await supabase
          .from('user_preferences')
          .upsert({ 
            user_id: currentEmployee.id, 
            language: newLanguage 
          }, { 
            onConflict: 'user_id' 
          });
        
        if (error) throw error;
      } catch (error) {
        console.error('Error saving language preference:', error);
      }
    }
  };
  
  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: handleSetLanguage,
        t: translations
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
