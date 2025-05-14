
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Home, ListChecks, LayoutDashboard, Settings, Users, PackagePlus, Truck, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const Navbar = () => {
  const { currentEmployee, logout } = useAuth();
  
  const isAdminOrManager = currentEmployee && (currentEmployee.role === 'admin' || currentEmployee.role === 'manager' || currentEmployee.role === 'installation_team');
  
  return (
    <div className="h-full px-3 py-4 overflow-y-auto bg-sidebar text-sidebar-foreground">
      <div className="mb-6 px-2">
        <h2 className="text-xl font-bold text-white tracking-tight">PhaseFlow</h2>
        <p className="text-xs text-gray-300 mt-1">Manufacturing Management</p>
      </div>
      
      <ul className="space-y-1 font-medium">
        <NavItem to="/" icon={Home} label="Dashboard" />
        <NavItem to="/projects" icon={LayoutDashboard} label="Projects" />
        <NavItem to="/workstations" icon={Truck} label="Workstations" />
        <NavItem to="/personal-tasks" icon={ListChecks} label="Personal Tasks" />
        <NavItem to="/daily-tasks" icon={ListChecks} label="Daily Tasks" />
        
        {isAdminOrManager && (
          <>
            <li className="mt-6 mb-2">
              <div className="px-2">
                <p className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">Admin</p>
              </div>
            </li>
            <NavItem to="/planning" icon={Users} label="Planning" />
            <NavItem to="/orders" icon={PackagePlus} label="Orders" />
            <NavItem to="/rush-orders" icon={PackagePlus} label="Rush Orders" />
          </>
        )}
        
        <li className="mt-6 mb-2">
          <div className="px-2">
            <p className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">Account</p>
          </div>
        </li>
        <NavItem to="/settings" icon={Settings} label="Settings" />
        <li>
          <button 
            onClick={logout} 
            className="flex w-full items-center p-2 text-gray-300 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-150 group"
          >
            <LogOut className="w-5 h-5 text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground" />
            <span className="ml-3">Logout</span>
          </button>
        </li>
      </ul>
    </div>
  );
};

const NavItem = ({ to, icon: Icon, label }) => {
  return (
    <li>
      <NavLink 
        to={to} 
        className={({ isActive }) => cn(
          "flex items-center p-2 rounded-lg transition-colors duration-150 group",
          isActive 
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
            : "text-gray-300 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Icon className={cn(
          "w-5 h-5",
          "text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground"
        )} />
        <span className="ml-3">{label}</span>
      </NavLink>
    </li>
  );
};

export default Navbar;
