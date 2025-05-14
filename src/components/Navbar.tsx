
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import NotificationDropdown from './NotificationDropdown';

const Navbar = () => {
  const { currentEmployee, logout } = useAuth();
  const location = useLocation();
  
  // Check if the current path is active
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  // Role-based navigation display
  const canAccessDashboard = currentEmployee && ['admin', 'manager'].includes(currentEmployee.role);
  const canAccessWorkstations = currentEmployee && ['admin', 'manager', 'worker'].includes(currentEmployee.role);
  const canAccessSettings = currentEmployee && ['admin'].includes(currentEmployee.role);
  const canAccessRushOrders = currentEmployee && ['admin', 'manager', 'worker', 'installation_team'].includes(currentEmployee.role);
  
  return (
    <div className="h-full flex flex-col bg-blue-800 text-white">
      <div className="p-4 text-lg font-bold">
        CabinetFlow
      </div>
      
      <div className="flex-grow overflow-y-auto">
        <div className="px-2 py-4 space-y-1">
          {canAccessDashboard && (
            <Link
              to="/"
              className={`flex items-center rounded-md px-3 py-2 text-sm ${
                isActive('/') ? 'bg-blue-900 text-white' : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              <span>Dashboard</span>
            </Link>
          )}
          
          <Link
            to="/projects"
            className={`flex items-center rounded-md px-3 py-2 text-sm ${
              isActive('/projects') ? 'bg-blue-900 text-white' : 'text-blue-100 hover:bg-blue-700'
            }`}
          >
            <span>Projects</span>
          </Link>
          
          {canAccessWorkstations && (
            <Link
              to="/workstations"
              className={`flex items-center rounded-md px-3 py-2 text-sm ${
                isActive('/workstations') ? 'bg-blue-900 text-white' : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              <span>Workstations</span>
            </Link>
          )}
          
          <Link
            to="/planning"
            className={`flex items-center rounded-md px-3 py-2 text-sm ${
              isActive('/planning') ? 'bg-blue-900 text-white' : 'text-blue-100 hover:bg-blue-700'
            }`}
          >
            <span>Planning</span>
          </Link>

          <Link
            to="/daily-tasks"
            className={`flex items-center rounded-md px-3 py-2 text-sm ${
              isActive('/daily-tasks') ? 'bg-blue-900 text-white' : 'text-blue-100 hover:bg-blue-700'
            }`}
          >
            <span>Daily Tasks</span>
          </Link>
          
          {canAccessRushOrders && (
            <Link
              to="/rush-orders"
              className={`flex items-center rounded-md px-3 py-2 text-sm ${
                isActive('/rush-orders') ? 'bg-blue-900 text-white' : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              <span>Rush Orders</span>
            </Link>
          )}
          
          {canAccessSettings && (
            <Link
              to="/settings"
              className={`flex items-center rounded-md px-3 py-2 text-sm ${
                isActive('/settings') ? 'bg-blue-900 text-white' : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              <span>Settings</span>
            </Link>
          )}
        </div>
      </div>
      
      {/* Notification and User section */}
      <div className="p-4 border-t border-blue-700">
        <div className="flex items-center justify-between mb-2">
          <NotificationDropdown />
        </div>
        
        {currentEmployee && (
          <div className="flex flex-col">
            <div className="text-sm font-medium text-blue-100">{currentEmployee.name}</div>
            <div className="text-xs text-blue-300">{currentEmployee.role}</div>
            <button
              onClick={logout}
              className="mt-2 text-xs text-blue-300 hover:text-white"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;
