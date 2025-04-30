
import React from 'react';
import Dashboard from '@/components/Dashboard';
import { useAuth } from '@/context/AuthContext';
import UserManagement from '@/components/UserManagement';

const Index = () => {
  const { currentEmployee } = useAuth();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">PhaseFlow Dashboard</h1>
      <Dashboard />
      {currentEmployee?.role === 'admin' && (
        <div className="mt-8 p-6 bg-slate-50 rounded-lg border border-slate-200">
          <h2 className="text-2xl font-semibold mb-4">User Management</h2>
          <p className="mb-4 text-slate-600">As an administrator, you can add and manage users in the system.</p>
          <UserManagement />
        </div>
      )}
    </div>
  );
};

export default Index;
