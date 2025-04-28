
import React from 'react';
import Dashboard from '@/components/Dashboard';
import { useAuth } from '@/context/AuthContext';
import UserManagement from '@/components/UserManagement';

const Index = () => {
  const { currentEmployee } = useAuth();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <Dashboard />
      {currentEmployee?.role === 'admin' && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">User Management</h2>
          <UserManagement />
        </div>
      )}
    </div>
  );
};

export default Index;
