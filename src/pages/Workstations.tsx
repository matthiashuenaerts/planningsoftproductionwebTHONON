
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import WorkstationView from '@/components/WorkstationView';
import { useAppContext } from '@/context/AppContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { workstationService, Workstation } from '@/services/workstationService';
import { useToast } from '@/hooks/use-toast';

const Workstations: React.FC = () => {
  const { setViewingWorkstation } = useAppContext();
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [selectedWorkstation, setSelectedWorkstation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchWorkstations = async () => {
      try {
        setLoading(true);
        const data = await workstationService.getAll();
        setWorkstations(data);
        
        // Set default selected workstation if available
        if (data.length > 0 && !selectedWorkstation) {
          setSelectedWorkstation(data[0].name);
          setViewingWorkstation(data[0].name);
        }
      } catch (error: any) {
        console.error('Error fetching workstations:', error);
        toast({
          title: "Error",
          description: `Failed to load workstations: ${error.message}`,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWorkstations();
  }, [selectedWorkstation, setViewingWorkstation, toast]);

  const handleWorkstationChange = (workstationName: string) => {
    setSelectedWorkstation(workstationName);
    setViewingWorkstation(workstationName);
  };

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

  return (
    <div className="flex min-h-screen">
      <div className="w-64 bg-sidebar fixed top-0 bottom-0">
        <Navbar />
      </div>
      <div className="ml-64 w-full p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Workstations</h1>
          
          {workstations.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-md">
              <p className="text-amber-700">
                No workstations found. Please create workstations in the Settings page.
              </p>
            </div>
          ) : (
            <Tabs 
              value={selectedWorkstation || undefined} 
              onValueChange={handleWorkstationChange}
            >
              <TabsList className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                {workstations.map((workstation) => (
                  <TabsTrigger key={workstation.id} value={workstation.name}>
                    {workstation.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {workstations.map((workstation) => (
                <TabsContent key={workstation.id} value={workstation.name} className="mt-4">
                  <WorkstationView workstation={workstation.name} workstationId={workstation.id} />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
};

export default Workstations;
