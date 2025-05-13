import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  HomeIcon,
  PackageIcon,
  ShoppingCartIcon,
  CalendarDaysIcon,
  ClipboardIcon,
  ListTodo as ListTodoIcon,
  Settings2 as Settings2Icon,
  CircuitBoard as CircuitBoardIcon,
  CalendarClock as CalendarClockIcon,
} from 'lucide-react';
import { Button } from "@/components/ui/button"

export default function Navbar() {
  const { currentEmployee, logout } = useAuth();
  const { t } = useLanguage();
  const { pathname } = useLocation();

  const isAdmin = currentEmployee?.role === 'admin';

  const menuItems = [
    { name: t.common.dashboard, path: '/', icon: <HomeIcon className="w-5 h-5" /> },
    { name: t.common.projects, path: '/projects', icon: <PackageIcon className="w-5 h-5" /> },
    { name: t.common.orders, path: '/orders', icon: <ShoppingCartIcon className="w-5 h-5" /> },
    { name: t.common.dailyTasks, path: '/daily-tasks', icon: <CalendarDaysIcon className="w-5 h-5" /> },
    { name: t.common.installationCalendar, path: '/install-calendar', icon: <CalendarClockIcon className="w-5 h-5" /> },
    { name: t.common.planning, path: '/planning', icon: <ClipboardIcon className="w-5 h-5" /> },
    { name: t.common.personalTasks, path: '/personal-tasks', icon: <ListTodoIcon className="w-5 h-5" /> },
    { name: t.common.workstations, path: '/workstations', icon: <CircuitBoardIcon className="w-5 h-5" /> },
    { name: t.common.settings, path: '/settings', icon: <Settings2Icon className="w-5 h-5" /> },
  ];

  return (
    <div className="flex flex-col h-full p-4 bg-sidebar">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">{t.common.companyName}</h1>
        <p className="text-sm text-muted-foreground">{t.common.navigation}</p>
      </div>
      <nav className="flex-grow">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 rounded-md text-sm font-medium
                  ${isActive
                      ? 'bg-secondary text-secondary-foreground'
                      : 'text-foreground hover:bg-secondary hover:text-secondary-foreground'
                  }`
                }
              >
                {item.icon}
                <span className="ml-3">{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto">
        <div className="border-t border-t-muted pt-4">
          <p className="text-sm text-muted-foreground mb-1">
            {currentEmployee?.name || 'User Name'}
          </p>
          <Button variant="ghost" className="w-full justify-start" onClick={logout}>
            {t.common.logout}
          </Button>
        </div>
      </div>
    </div>
  );
}
