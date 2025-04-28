
import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import WorkstationView from '@/components/WorkstationView';
import { WorkstationType } from '@/lib/mockData';
import { useAppContext } from '@/context/AppContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Workstations: React.FC = () => {
  const { setViewingWorkstation } = useAppContext();
  const [selectedWorkstation, setSelectedWorkstation] = useState<WorkstationType>(WorkstationType.CUTTING);
  
  const handleWorkstationChange = (workstation: WorkstationType) => {
    setSelectedWorkstation(workstation);
    setViewingWorkstation(workstation);
  };

  return (
    <div className="flex min-h-screen">
      <div className="w-64 bg-sidebar fixed top-0 bottom-0">
        <Navbar />
      </div>
      <div className="ml-64 w-full p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Workstations</h1>
          
          <Tabs 
            defaultValue={WorkstationType.CUTTING} 
            onValueChange={(value) => handleWorkstationChange(value as WorkstationType)}
          >
            <TabsList className="w-full grid grid-cols-3 md:grid-cols-6">
              {Object.values(WorkstationType).map((workstation) => (
                <TabsTrigger key={workstation} value={workstation}>
                  {workstation}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {Object.values(WorkstationType).map((workstation) => (
              <TabsContent key={workstation} value={workstation} className="mt-4">
                <WorkstationView workstation={workstation} />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Workstations;
