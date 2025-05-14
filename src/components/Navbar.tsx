
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Home, ListChecks, LayoutDashboard, Settings, Users, PackagePlus, Truck } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const Navbar = () => {
  const { currentEmployee, logout } = useAuth();
  
  const isAdminOrManager = currentEmployee && (currentEmployee.role === 'admin' || currentEmployee.role === 'manager' || currentEmployee.role === 'installation_team');
  
  return (
    <div className="h-full px-3 py-4 overflow-y-auto bg-gray-50 dark:bg-gray-800">
      <ul className="space-y-2 font-medium">
        <li>
          <NavLink to="/" className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group">
            <Home className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
            <span className="ml-3">Dashboard</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/projects" className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group">
            <LayoutDashboard className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
            <span className="ml-3">Projects</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/workstations" className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group">
            <Truck className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
            <span className="ml-3">Workstations</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/personal-tasks" className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group">
            <ListChecks className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
            <span className="ml-3">Personal Tasks</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/daily-tasks" className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group">
            <ListChecks className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
            <span className="ml-3">Daily Tasks</span>
          </NavLink>
        </li>
        {isAdminOrManager && (
          <li>
            <NavLink to="/planning" className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group">
              <Users className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
              <span className="ml-3">Planning</span>
            </NavLink>
          </li>
        )}
        {isAdminOrManager && (
          <li>
            <NavLink to="/orders" className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group">
              <PackagePlus className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
              <span className="ml-3">Orders</span>
            </NavLink>
          </li>
        )}
        {isAdminOrManager && (
          <li>
            <NavLink to="/rush-orders" className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group">
              <PackagePlus className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
              <span className="ml-3">Rush Orders</span>
            </NavLink>
          </li>
        )}
        <li>
          <NavLink to="/settings" className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group">
            <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
            <span className="ml-3">Settings</span>
          </NavLink>
        </li>
        <li>
          <button onClick={logout} className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group">
            <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
            <span className="ml-3">Logout</span>
          </button>
        </li>
      </ul>
    </div>
  );
};

export default Navbar;
