
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, LayoutDashboard, List } from 'lucide-react';

const Navbar: React.FC = () => {
  const location = useLocation();

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
          active={location.pathname === '/projects'} 
        />
        <NavItem 
          to="/workstations" 
          icon={<List className="w-5 h-5" />} 
          title="Workstations" 
          active={location.pathname === '/workstations'} 
        />
        <NavItem 
          to="/daily-tasks" 
          icon={<Calendar className="w-5 h-5" />} 
          title="Daily Tasks" 
          active={location.pathname === '/daily-tasks'} 
        />
      </div>
      
      <div className="mt-auto">
        <div className="flex items-center gap-3 px-3 py-2 rounded-md">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-sm font-medium">AJ</span>
          </div>
          <div>
            <p className="text-sm font-medium">Alex Johnson</p>
            <p className="text-xs text-sidebar-foreground/70">Production Manager</p>
          </div>
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
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, title, active }) => {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
        active 
          ? "bg-sidebar-accent text-sidebar-accent-foreground" 
          : "hover:bg-sidebar-accent/50"
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{title}</span>
    </Link>
  );
};

export default Navbar;
