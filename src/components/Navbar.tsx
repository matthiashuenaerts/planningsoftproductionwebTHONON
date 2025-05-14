
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, LogOut, LayoutDashboard, List, Settings as SettingsIcon, Package, CalendarClock, CalendarCheck, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import NotificationDropdown from '@/components/NotificationDropdown';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { currentEmployee, logout } = useAuth();
  const isAdmin = currentEmployee?.role === 'admin';
  const isManager = currentEmployee?.role === 'manager';
  const isAdminOrManager = isAdmin || isManager;
  const isInstallationTeam = currentEmployee?.role === 'installation_team';
  
  // Show rush orders menu item to admin, manager, and installation team roles
  const canAccessRushOrders = isAdminOrManager || isInstallationTeam;
  
  return (
    <nav className="bg-sidebar text-sidebar-foreground p-4 flex flex-col h-full">
      <div className="flex items-center justify-center mb-8 mt-2">
        <h1 className="text-xl font-bold">PhaseFlow</h1>
      </div>
      
      <div className="flex flex-col space-y-2 flex-1">
        <NavItem 
          to="/" 
          icon={<LayoutDashboard className="w-5 h-5" />} 
          title="Dashboard" 
          active={location.pathname === '/'} 
        />
        <NavItem 
          to="/projects" 
          icon={<List className="w-5 h-5" />} 
          title="Projects" 
          active={location.pathname === '/projects' || location.pathname.includes('/projects/')} 
        />
        <NavItem 
          to="/workstations" 
          icon={<List className="w-5 h-5" />} 
          title="Workstations" 
          active={location.pathname === '/workstations'} 
        />
        <NavItem 
          to="/personal-tasks" 
          icon={<CalendarCheck className="w-5 h-5" />} 
          title="Personal Tasks" 
          active={location.pathname === '/personal-tasks'} 
        />
        <NavItem 
          to="/daily-tasks" 
          icon={<Calendar className="w-5 h-5" />} 
          title="Installation Calendar" 
          active={location.pathname === '/daily-tasks'} 
        />
        <NavItem 
          to="/planning" 
          icon={<CalendarClock className="w-5 h-5" />} 
          title="Day Planning" 
          active={location.pathname === '/planning'} 
        />
        <NavItem 
          to="/orders" 
          icon={<Package className="w-5 h-5" />} 
          title="Orders" 
          active={location.pathname === '/orders' || location.pathname.includes('/orders/')} 
        />
        
        {canAccessRushOrders && (
          <NavItem 
            to="/rush-orders" 
            icon={<AlertTriangle className="w-5 h-5 text-red-500" />} 
            title="Rush Orders" 
            active={location.pathname === '/rush-orders' || location.pathname.includes('/rush-orders/')} 
            className="text-red-500 font-medium"
          />
        )}
        
        {isAdmin && (
          <NavItem 
            to="/settings" 
            icon={<SettingsIcon className="w-5 h-5" />} 
            title="Settings" 
            active={location.pathname === '/settings'} 
          />
        )}
      </div>
      
      <div className="mt-auto">
        <div className="flex items-center gap-3 px-3 py-2 rounded-md">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-sm font-medium">
              {currentEmployee?.name.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{currentEmployee?.name || 'User'}</p>
            <p className="text-xs text-sidebar-foreground/70">{currentEmployee?.role || 'Employee'}</p>
          </div>
          
          <NotificationDropdown />
          
          <button 
            onClick={logout} 
            className="p-2 rounded-md hover:bg-sidebar-accent/50 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
  );
};

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  active: boolean;
  className?: string;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, title, active, className }) => {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
        active 
          ? "bg-sidebar-accent text-sidebar-accent-foreground" 
          : "hover:bg-sidebar-accent/50"
      } ${className || ''}`}
    >
      {icon}
      <span className="text-sm font-medium">{title}</span>
    </Link>
  );
};

export default Navbar;
