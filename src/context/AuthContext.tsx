
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Language } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';

interface Employee {
  id: string;
  name: string;
  role: 'admin' | 'manager' | 'worker' | 'workstation';
  workstation?: string;
  expires?: number;
}

interface UserPreference {
  language: Language;
}

interface AuthContextType {
  currentEmployee: Employee | null;
  isAuthenticated: boolean;
  login: (employeeData: Employee) => void;
  logout: () => void;
  userPreferences: UserPreference | null;
  updateUserPreference: (key: keyof UserPreference, value: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreference | null>(null);
  const navigate = useNavigate();
  
  // Check for existing session on component mount and check for expiration
  useEffect(() => {
    const checkSession = () => {
      const storedSession = localStorage.getItem('employeeSession');
      if (storedSession) {
        try {
          const employeeData = JSON.parse(storedSession);
          
          // Check if session has expired
          if (employeeData.expires && employeeData.expires < Date.now()) {
            console.log('Session expired, logging out');
            localStorage.removeItem('employeeSession');
            setCurrentEmployee(null);
            // Only redirect to login if not already there
            if (window.location.pathname !== '/login') {
              navigate('/login');
            }
            return;
          }
          
          setCurrentEmployee(employeeData);
          
          // Fetch user preferences
          if (employeeData.id) {
            fetchUserPreferences(employeeData.id);
          }
        } catch (error) {
          console.error('Failed to parse stored session:', error);
          localStorage.removeItem('employeeSession');
        }
      }
    };
    
    // Fetch user preferences from database
    const fetchUserPreferences = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (error) throw error;
        
        if (data) {
          setUserPreferences({
            language: data.language as Language
          });
        } else {
          // Create default preferences if none exist
          const defaultPrefs = {
            language: 'en' as Language
          };
          setUserPreferences(defaultPrefs);
          
          // Save default preferences to database
          await supabase
            .from('user_preferences')
            .insert({
              user_id: userId,
              language: defaultPrefs.language
            });
        }
      } catch (error) {
        console.error('Error fetching user preferences:', error);
      }
    };
    
    // Check session immediately
    checkSession();
    
    // Set up interval to check session every minute
    const intervalId = setInterval(checkSession, 60000);
    
    return () => clearInterval(intervalId);
  }, [navigate]);
  
  const login = (employeeData: Employee) => {
    setCurrentEmployee(employeeData);
    // Fetch user preferences after successful login
    fetchUserPreferences(employeeData.id);
  };
  
  const fetchUserPreferences = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setUserPreferences({
          language: data.language as Language
        });
      } else {
        // Create default preferences
        const defaultPrefs = {
          language: 'en' as Language
        };
        setUserPreferences(defaultPrefs);
        
        // Save to database
        await supabase
          .from('user_preferences')
          .insert({
            user_id: userId,
            language: defaultPrefs.language
          });
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
    }
  };
  
  const updateUserPreference = async (key: keyof UserPreference, value: any) => {
    if (!currentEmployee) return;
    
    try {
      // Update local state
      setUserPreferences(prev => {
        if (!prev) return { [key]: value } as UserPreference;
        return { ...prev, [key]: value };
      });
      
      // Update in database
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: currentEmployee.id,
          [key]: value
        }, {
          onConflict: 'user_id'
        });
      
      if (error) throw error;
    } catch (error) {
      console.error(`Error updating user preference ${key}:`, error);
    }
  };
  
  const logout = () => {
    setCurrentEmployee(null);
    setUserPreferences(null);
    localStorage.removeItem('employeeSession');
    navigate('/login');
  };
  
  return (
    <AuthContext.Provider
      value={{
        currentEmployee,
        isAuthenticated: !!currentEmployee,
        login,
        logout,
        userPreferences,
        updateUserPreference
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
