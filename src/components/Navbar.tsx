
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import NotificationDropdown from './NotificationDropdown';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const Navbar: React.FC = () => {
  const { currentEmployee } = useAuth();
  const location = useLocation();
  
  // Check if the current location is active
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };
  
  // Check if the user can access rush orders
  const canAccessRushOrders = currentEmployee && ['admin', 'manager', 'installation_team'].includes(currentEmployee.role);

  return (
    <div className="h-screen flex flex-col border-r border-gray-200 bg-white px-1">
      <div className="px-3 py-4 space-y-1">
        {/* Logo or Name here */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-800">
            Production
            <span className="text-blue-500">OS</span>
          </h2>
        </div>
        
        <nav className="space-y-1">
          {/* Dashboard link */}
          <Link 
            to="/" 
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-md",
              isActive('/') 
                ? "bg-gray-100 text-gray-900" 
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </Link>
          
          {/* Projects link */}
          <Link 
            to="/projects" 
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-md",
              isActive('/projects') 
                ? "bg-gray-100 text-gray-900" 
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Projects
          </Link>
          
          {/* Planning link */}
          <Link 
            to="/planning" 
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-md",
              isActive('/planning') 
                ? "bg-gray-100 text-gray-900" 
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Planning
          </Link>
          
          {/* Workstations link */}
          <Link 
            to="/workstations" 
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-md",
              isActive('/workstations') 
                ? "bg-gray-100 text-gray-900" 
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
            Workstations
          </Link>
          
          {/* Orders link */}
          <Link 
            to="/orders" 
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-md",
              isActive('/orders') 
                ? "bg-gray-100 text-gray-900" 
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Orders
          </Link>
          
          {/* Daily Tasks link */}
          <Link 
            to="/daily-tasks" 
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-md",
              isActive('/daily-tasks') 
                ? "bg-gray-100 text-gray-900" 
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Daily Tasks
          </Link>

          {/* Rush Orders link - only for admin, manager, and installation_team */}
          {canAccessRushOrders && (
            <Link 
              to="/rush-orders" 
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                isActive('/rush-orders') 
                  ? "bg-red-100 text-red-700" 
                  : "text-red-600 hover:bg-red-50"
              )}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Rush Orders
            </Link>
          )}

          {/* Settings link - only for admin */}
          {currentEmployee && currentEmployee.role === 'admin' && (
            <Link 
              to="/settings" 
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                isActive('/settings') 
                  ? "bg-gray-100 text-gray-900" 
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </Link>
          )}
        </nav>
      </div>
      
      {/* User profile and notification section */}
      <div className="mt-auto p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
              {currentEmployee && currentEmployee.name ? currentEmployee.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">
                {currentEmployee ? currentEmployee.name : 'User'}
              </p>
              <p className="text-xs font-medium text-gray-500">
                {currentEmployee ? currentEmployee.role : 'No role'}
              </p>
            </div>
          </div>
          
          {/* Notifications */}
          {currentEmployee && (
            <div>
              <NotificationDropdown />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
