
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { notificationService } from '@/services/notificationService';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const Navbar = () => {
  const location = useLocation();
  const { currentEmployee, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unreadNotifications', currentEmployee?.id],
    queryFn: () => currentEmployee ? notificationService.getUnreadCount(currentEmployee.id) : Promise.resolve(0),
    enabled: !!currentEmployee,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', roles: ['admin', 'manager', 'worker', 'installation_team', 'workstation'] },
    { path: '/workstations', label: 'Workstations', roles: ['admin', 'manager', 'worker', 'installation_team'] },
    { path: '/tasks', label: 'Tasks', roles: ['admin', 'manager', 'worker', 'installation_team'] },
    { path: '/rush-orders', label: 'Rush Orders', roles: ['admin', 'manager', 'worker', 'installation_team'] },
    { path: '/employees', label: 'Employees', roles: ['admin', 'manager'] },
    { path: '/settings', label: 'Settings', roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(item => 
    currentEmployee && item.roles.includes(currentEmployee.role)
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center">
          <img src="/logo.png" alt="Logo" className="h-8 w-auto" />
          <span className="ml-2 text-lg font-bold text-white">Fabrication OS</span>
        </Link>
        
        <button 
          className="md:hidden text-white"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      
      <div className={cn(
        "flex-col flex-grow md:flex",
        isMobileMenuOpen ? "flex" : "hidden"
      )}>
        <nav className="flex-grow">
          <ul className="space-y-1 px-2">
            {filteredNavItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center px-4 py-2 text-sm rounded-md",
                    isActive(item.path)
                      ? "bg-primary text-primary-foreground"
                      : "text-white hover:bg-primary/10"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        {currentEmployee && (
          <div className="p-4 mt-auto">
            <div className="flex items-center justify-between bg-sidebar-light rounded-md p-2">
              <div className="flex items-center">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarFallback>{getInitials(currentEmployee.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-white">{currentEmployee.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{currentEmployee.role.replace('_', ' ')}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <Link to="/notifications" className="relative mr-2">
                  <Bell className="h-5 w-5 text-gray-300 hover:text-white" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-red-500">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Link>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 text-gray-300 hover:text-white">
                      <span className="sr-only">Open menu</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/profile">Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={logout}>
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;
