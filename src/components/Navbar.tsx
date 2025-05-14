
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Home, ListChecks, LayoutDashboard, Settings, Users, PackagePlus, Truck, LogOut, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const Navbar = () => {
  const { currentEmployee, logout } = useAuth();
  
  const isAdminOrManager = currentEmployee && (currentEmployee.role === 'admin' || currentEmployee.role === 'manager' || currentEmployee.role === 'installation_team');
  
  return (
    <div className="h-full px-3 py-4 overflow-y-auto bg-sky-800 text-white">
      <div className="flex flex-col h-full justify-between">
        <div>
          <h2 className="px-2 py-3 text-lg font-semibold mb-2">PhaseFlow</h2>
          <ul className="space-y-2 font-medium">
            <li>
              <NavLink to="/" className="flex items-center p-2 rounded-lg hover:bg-bg-sky-600 group">
                <Home className="w-5 h-5 text-white group-hover:text-white" />
                <span className="ml-3">Dashboard</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/projects" className="flex items-center p-2 rounded-lg hover:bg-bg-sky-600 group">
                <LayoutDashboard className="w-5 h-5 text-white group-hover:text-white" />
                <span className="ml-3">Projects</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/workstations" className="flex items-center p-2 rounded-lg hover:bg-bg-sky-600 group">
                <Truck className="w-5 h-5 text-white group-hover:text-white" />
                <span className="ml-3">Workstations</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/personal-tasks" className="flex items-center p-2 rounded-lg hover:bg-bg-sky-600 group">
                <ListChecks className="w-5 h-5 text-white group-hover:text-white" />
                <span className="ml-3">Personal Tasks</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/daily-tasks" className="flex items-center p-2 rounded-lg hover:bg-bg-sky-600 group">
                <ListChecks className="w-5 h-5 text-white group-hover:text-white" />
                <span className="ml-3">Daily Tasks</span>
              </NavLink>
            </li>
            {isAdminOrManager && (
              <li>
                <NavLink to="/planning" className="flex items-center p-2 rounded-lg hover:bg-bg-sky-600 group">
                  <Users className="w-5 h-5 text-white group-hover:text-white" />
                  <span className="ml-3">Planning</span>
                </NavLink>
              </li>
            )}
            {isAdminOrManager && (
              <li>
                <NavLink to="/orders" className="flex items-center p-2 rounded-lg hover:bg-bg-sky-600 group">
                  <PackagePlus className="w-5 h-5 text-white group-hover:text-white" />
                  <span className="ml-3">Orders</span>
                </NavLink>
              </li>
            )}
            {isAdminOrManager && (
              <li>
                <NavLink to="/rush-orders" className="flex items-center p-2 rounded-lg hover:bg-bg-sky-600 group">
                  <PackagePlus className="w-5 h-5 text-white group-hover:text-white" />
                  <span className="ml-3">Rush Orders</span>
                </NavLink>
              </li>
            )}
            <li>
              <NavLink to="/settings" className="flex items-center p-2 rounded-lg hover:bg-bg-sky-600 group">
                <Settings className="w-5 h-5 text-white group-hover:text-white" />
                <span className="ml-3">Settings</span>
              </NavLink>
            </li>
          </ul>
        </div>
        
        {/* User profile at bottom */}
        <div className="mt-auto border-t border-blue-600 pt-2">
          {currentEmployee && (
            <div className="flex items-center p-2 mb-2">
              <User className="w-5 h-5 text-white" />
              <span className="ml-3 text-sm">{currentEmployee.name}</span>
            </div>
          )}
          <button 
            onClick={logout} 
            className="flex w-full items-center p-2 rounded-lg hover:bg-bg-sky-600 group text-white"
          >
            <LogOut className="w-5 h-5 text-white" />
            <span className="ml-3">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
