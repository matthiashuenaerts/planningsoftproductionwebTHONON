
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WorkstationSettings from '@/components/settings/WorkstationSettings';
import EmployeeSettings from '@/components/settings/EmployeeSettings';
import StandardTasksSettings from '@/components/settings/StandardTasksSettings';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const Settings: React.FC = () => {
  const { currentEmployee } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const isAdmin = currentEmployee?.role === 'admin';

  // Redirect non-admin users
  useEffect(() => {
    if (currentEmployee && currentEmployee.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the settings page",
        variant: "destructive"
      });
    }
    setLoading(false);
  }, [currentEmployee, toast]);

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <div className="w-64 bg-sidebar fixed top-0 bottom-0">
          <Navbar />
        </div>
        <div className="ml-64 w-full p-6 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen">
        <div className="w-64 bg-sidebar fixed top-0 bottom-0">
          <Navbar />
        </div>
        <div className="ml-64 w-full p-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-12">
              <SettingsIcon className="mx-auto h-16 w-16 text-gray-400" />
              <h1 className="mt-4 text-2xl font-bold text-gray-900">Access Denied</h1>
              <p className="mt-2 text-gray-600">You don't have permission to access the settings page</p>
              <Button
                className="mt-6"
                onClick={() => window.history.back()}
              >
                {t.common.cancel}
              </Button>
            </div>
          </div>
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
          <h1 className="text-2xl font-bold mb-6">{t.settings.title}</h1>
          
          <Tabs defaultValue="workstations">
            <TabsList className="mb-4">
              <TabsTrigger value="workstations">{t.settings.workstations}</TabsTrigger>
              <TabsTrigger value="employees">{t.settings.employees}</TabsTrigger>
              <TabsTrigger value="standard-tasks">{t.settings.standardTasks}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="workstations">
              <WorkstationSettings />
            </TabsContent>
            
            <TabsContent value="employees">
              <EmployeeSettings />
            </TabsContent>

            <TabsContent value="standard-tasks">
              <StandardTasksSettings />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Settings;
