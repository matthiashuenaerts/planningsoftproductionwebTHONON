
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface Employee {
  id: string;
  name: string;
  role: 'admin' | 'manager' | 'worker' | 'workstation';
  workstation?: string;
  expires?: number;
}

interface AuthContextType {
  currentEmployee: Employee | null;
  isAuthenticated: boolean;
  login: (employeeData: Employee) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
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
        } catch (error) {
          console.error('Failed to parse stored session:', error);
          localStorage.removeItem('employeeSession');
        }
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
    // Session storage is handled in the login component
  };
  
  const logout = () => {
    setCurrentEmployee(null);
    localStorage.removeItem('employeeSession');
    navigate('/login');
  };
  
  return (
    <AuthContext.Provider
      value={{
        currentEmployee,
        isAuthenticated: !!currentEmployee,
        login,
        logout
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
