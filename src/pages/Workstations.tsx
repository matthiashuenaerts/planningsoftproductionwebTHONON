
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import WorkstationView from '@/components/WorkstationView';
import { useAppContext } from '@/context/AppContext';
import { workstationService, Workstation } from '@/services/workstationService';
import { useToast } from '@/hooks/use-toast';
import { Package, LayoutGrid, Warehouse, Wrench, Scissors, Layers, Check, Monitor, Truck, Flag, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Workstations: React.FC = () => {
  const { setViewingWorkstation } = useAppContext();
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [selectedWorkstation, setSelectedWorkstation] = useState<Workstation | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchWorkstations = async () => {
      try {
        setLoading(true);
        const data = await workstationService.getAll();
        setWorkstations(data);
        
        // Reset selected workstation when fetching new data
        setSelectedWorkstation(null);
        if (data.length > 0) {
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
  }, [setViewingWorkstation, toast]);

  const handleWorkstationClick = (workstation: Workstation) => {
    setSelectedWorkstation(workstation);
    setViewingWorkstation(workstation.name);
  };

  const getWorkstationIcon = (name: string) => {
    // Return appropriate icon based on workstation name
    const lowerCaseName = name.toLowerCase();
    if (lowerCaseName.includes('productievoor')) return <Package size={32} />;
    if (lowerCaseName.includes('productiestur')) return <LayoutGrid size={32} />;
    if (lowerCaseName.includes('stock') || lowerCaseName.includes('logistiek')) return <Warehouse size={32} />;
    if (lowerCaseName.includes('opdeelzaag 1')) return <Wrench size={32} />;
    if (lowerCaseName.includes('opdeelzaag 2')) return <Scissors size={32} />;
    if (lowerCaseName.includes('afplakken')) return <Layers size={32} />;
    if (lowerCaseName.includes('cnc')) return <Wrench size={32} />;
    if (lowerCaseName.includes('controle/opkuis')) return <Check size={32} />;
    if (lowerCaseName.includes('montage')) return <Layers size={32} />;
    if (lowerCaseName.includes('afwerking')) return <Wrench size={32} />;
    if (lowerCaseName.includes('controle e+s')) return <Monitor size={32} />;
    if (lowerCaseName.includes('eindcontrole')) return <Check size={32} />;
    if (lowerCaseName.includes('bufferzone')) return <Warehouse size={32} />;
    if (lowerCaseName.includes('laden') || lowerCaseName.includes('vrachtwagen')) return <Truck size={32} />;
    if (lowerCaseName.includes('plaatsen')) return <Package size={32} />;
    if (lowerCaseName.includes('afsluiten')) return <Flag size={32} />;
    
    // Default icon
    return <Wrench size={32} />;
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
      <div className="w-64 bg-sidebar fixed top-0 bottom-0 z-10">
        <Navbar />
      </div>
      <div className="ml-64 w-full p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Workstations</h1>
          
          {workstations.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-md">
              <p className="text-amber-700">
                No workstations found. Please create workstations in the Settings page.
              </p>
            </div>
          ) : (
            <div>
              {!selectedWorkstation ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {workstations.map((workstation) => (
                    <button 
                      key={workstation.id} 
                      className="flex flex-col items-center justify-center p-4 md:p-6 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-white cursor-pointer h-32 md:h-40"
                      onClick={() => handleWorkstationClick(workstation)}
                    >
                      <div className="bg-gray-600 p-4 rounded-full mb-3">
                        {getWorkstationIcon(workstation.name)}
                      </div>
                      <span className="text-center font-medium text-white text-sm md:text-base line-clamp-2">
                        {workstation.name}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div>
                  <Button 
                    className="mb-4 flex items-center hover:bg-gray-100 p-2 rounded text-gray-700 transition-colors"
                    variant="ghost"
                    onClick={() => setSelectedWorkstation(null)}
                  >
                    <ArrowLeft className="h-5 w-5 mr-1" />
                    <span>Back to all workstations</span>
                  </Button>
                  <div className="h-[calc(100vh-180px)] overflow-auto">
                    <WorkstationView workstation={selectedWorkstation.name} workstationId={selectedWorkstation.id} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Workstations;
