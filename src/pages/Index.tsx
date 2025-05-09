
import React, { useState, useEffect } from 'react';
import Dashboard from '@/components/Dashboard';
import { useAuth } from '@/context/AuthContext';
import UserManagement from '@/components/UserManagement';
import Navbar from '@/components/Navbar';
import WorkstationDashboard from '@/components/WorkstationDashboard';
import { workstationService } from '@/services/workstationService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { currentEmployee } = useAuth();
  const [isWorkstationUser, setIsWorkstationUser] = useState(false);
  const { toast } = useToast();
  
  // Check if user has workstation role or is assigned to workstations
  useEffect(() => {
    const checkWorkstationStatus = async () => {
      if (currentEmployee?.role === 'workstation') {
        setIsWorkstationUser(true);
        return;
      }
      
      // Also check if user is assigned to any workstations
      if (currentEmployee?.id) {
        try {
          const { data: links, error } = await supabase
            .from('employee_workstation_links')
            .select('workstation_id')
            .eq('employee_id', currentEmployee.id);
          
          if (error) throw error;
          
          // If user has workstation assignments, show workstation dashboard
          if (links && links.length > 0) {
            setIsWorkstationUser(true);
          }
        } catch (error) {
          console.error("Error checking workstation assignments:", error);
        }
      }
    };
    
    checkWorkstationStatus();
  }, [currentEmployee]);
  
  // Display dedicated workstation dashboard for workstation role or assigned users
  if (isWorkstationUser) {
    return <WorkstationDashboard />;
  }

  return (
    <div className="flex min-h-screen">
      <div className="w-64 bg-sidebar fixed top-0 bottom-0">
        <Navbar />
      </div>
      <div className="ml-64 w-full p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">PhaseFlow Dashboard</h1>
          <Dashboard />
          {currentEmployee?.role === 'admin' && (
            <div className="mt-8 p-6 bg-slate-50 rounded-lg border border-slate-200">
              <h2 className="text-2xl font-semibold mb-4">User Management</h2>
              <p className="mb-4 text-slate-600">As an administrator, you can add and manage users in the system.</p>
              <UserManagement />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
