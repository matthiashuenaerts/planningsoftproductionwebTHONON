
import React, { useEffect, useState } from 'react';
import Dashboard from '@/components/Dashboard';
import { useAuth } from '@/context/AuthContext';
import UserManagement from '@/components/UserManagement';
import Navbar from '@/components/Navbar';
import WorkstationDashboard from '@/components/WorkstationDashboard';
import { workstationService } from '@/services/workstationService';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { currentEmployee } = useAuth();
  const [loading, setLoading] = useState(true);
  const [validWorkstation, setValidWorkstation] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    const verifyWorkstation = async () => {
      if (currentEmployee?.role === 'workstation') {
        try {
          setLoading(true);
          
          // First check if there's a workstation with this exact name
          const { data, error } = await workstationService.getByName(currentEmployee.name);
          
          if (error) {
            console.error('Error finding workstation:', error);
            toast({
              title: "Error",
              description: `Could not verify workstation access: ${error.message}`,
              variant: "destructive"
            });
            setValidWorkstation(false);
          } else if (!data) {
            // If not found by exact match, try to find a case-insensitive match
            const allWorkstations = await workstationService.getAll();
            const match = allWorkstations.find(ws => 
              ws.name.toLowerCase() === currentEmployee.name.toLowerCase());
            
            if (!match) {
              console.error(`No workstation found matching "${currentEmployee.name}"`);
              toast({
                title: "Error",
                description: `No workstation found matching "${currentEmployee.name}"`,
                variant: "destructive"
              });
              setValidWorkstation(false);
            }
          }
        } catch (error) {
          console.error('Error in workstation verification:', error);
          setValidWorkstation(false);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    
    verifyWorkstation();
  }, [currentEmployee, toast]);
  
  if (loading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
    </div>;
  }
  
  // Display dedicated workstation dashboard for workstation role if it's valid
  if (currentEmployee?.role === 'workstation' && validWorkstation) {
    return <WorkstationDashboard />;
  }
  
  // Display error message if invalid workstation
  if (currentEmployee?.role === 'workstation' && !validWorkstation) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md w-full bg-red-500 text-white p-6 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-lg">No workstation found matching "{currentEmployee.name}"</p>
          <p className="mt-4">Please contact an administrator to set up this workstation.</p>
        </div>
      </div>
    );
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
