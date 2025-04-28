
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface Employee {
  id: string;
  name: string;
  role: 'admin' | 'manager' | 'worker';
  workstation?: string;
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
  
  // Check for existing session on component mount
  useEffect(() => {
    const storedSession = localStorage.getItem('employeeSession');
    if (storedSession) {
      try {
        const employeeData = JSON.parse(storedSession);
        setCurrentEmployee(employeeData);
      } catch (error) {
        console.error('Failed to parse stored session:', error);
        localStorage.removeItem('employeeSession');
      }
    }
  }, []);
  
  const login = (employeeData: Employee) => {
    setCurrentEmployee(employeeData);
    localStorage.setItem('employeeSession', JSON.stringify(employeeData));
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
