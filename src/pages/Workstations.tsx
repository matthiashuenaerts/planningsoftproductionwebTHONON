
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import Navbar from '@/components/Navbar';
import WorkstationView from '@/components/WorkstationView';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { workstationService } from '@/services/workstationService';
import { 
  ArrowLeft, 
  Package, 
  FileText, 
  PackagePlus, 
  Edit, 
  ListCheck, 
  PackageX, 
  Calendar, 
  ListOrdered,
  CalendarArrowDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Define workstation with appropriate icon mapping
interface WorkstationWithIcon {
  id: string;
  name: string;
  description: string | null;
  icon: React.ReactNode;
  rushOrderCount?: number;
}

const Workstations: React.FC = () => {
  const [selectedWorkstation, setSelectedWorkstation] = useState<string | null>(null);
  const [workstations, setWorkstations] = useState<WorkstationWithIcon[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadWorkstations = async () => {
      try {
        const data = await workstationService.getAll();
        
        // Get rush order counts for each workstation
        const workstationsWithRushOrderCounts = await Promise.all(
          data.map(async ws => {
            // Query to get rush orders for this workstation
            const { data: rushOrders, error } = await supabase
              .from('rush_orders')
              .select('id')
              .eq('status', 'in_progress');
            
            let rushOrderCount = 0;
            
            if (rushOrders && rushOrders.length > 0) {
              // For each rush order, check if it has tasks for this workstation
              for (const order of rushOrders) {
                const { data: taskLinks, error: taskError } = await supabase
                  .from('rush_order_task_links')
                  .select('task_id')
                  .eq('rush_order_id', order.id);
                
                if (taskLinks && taskLinks.length > 0) {
                  // Check if any tasks are for this workstation
                  const taskIds = taskLinks.map(link => link.task_id);
                  
                  const { data: tasks, error: tasksError } = await supabase
                    .from('tasks')
                    .select('id')
                    .in('id', taskIds)
                    .eq('workstation', ws.name)
                    .neq('status', 'COMPLETED');
                  
                  if (tasks && tasks.length > 0) {
                    rushOrderCount++;
                    break; // Count the rush order once for this workstation
                  }
                }
              }
            }
            
            return {
              ...ws,
              icon: getWorkstationIcon(ws.name),
              rushOrderCount
            };
          })
        );
        
        setWorkstations(workstationsWithRushOrderCounts);
      } catch (error: any) {
        toast({
          title: "Error",
          description: `Failed to load workstations: ${error.message}`,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadWorkstations();
  }, [toast]);

  // Function to get icon based on workstation name
  const getWorkstationIcon = (name: string) => {
    const lowercaseName = name.toLowerCase();
    
    if (lowercaseName.includes('cnc')) return <FileText className="h-8 w-8" />;
    if (lowercaseName.includes('assembly')) return <Package className="h-8 w-8" />;
    if (lowercaseName.includes('warehouse')) return <PackagePlus className="h-8 w-8" />;
    if (lowercaseName.includes('cutting')) return <Edit className="h-8 w-8" />;
    if (lowercaseName.includes('quality')) return <ListCheck className="h-8 w-8" />;
    if (lowercaseName.includes('packaging')) return <PackageX className="h-8 w-8" />;
    if (lowercaseName.includes('planning')) return <Calendar className="h-8 w-8" />;
    if (lowercaseName.includes('production')) return <ListOrdered className="h-8 w-8" />;
    
    // Default icon
    return <CalendarArrowDown className="h-8 w-8" />;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <div className="w-64 bg-sidebar fixed top-0 bottom-0">
          <Navbar />
        </div>
        <div className="ml-64 w-full p-6 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
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
          {selectedWorkstation ? (
            <div>
              <Button 
                variant="outline" 
                className="mb-4"
                onClick={() => setSelectedWorkstation(null)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Workstations
              </Button>
              <WorkstationView 
                workstationId={selectedWorkstation} 
                onBack={() => setSelectedWorkstation(null)}
              />
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold mb-6">Workstations</h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {workstations.map((workstation) => (
                  <Card 
                    key={workstation.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedWorkstation(workstation.id)}
                  >
                    <CardContent className="p-6 flex flex-col items-center text-center relative">
                      <div className="bg-primary/10 p-4 rounded-full mb-4">
                        {workstation.icon}
                      </div>
                      <h3 className="text-lg font-medium mb-1">{workstation.name}</h3>
                      {workstation.description && (
                        <p className="text-sm text-muted-foreground">{workstation.description}</p>
                      )}
                      
                      {/* Display rush order badge if there are rush orders */}
                      {workstation.rushOrderCount && workstation.rushOrderCount > 0 && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                          {workstation.rushOrderCount}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Workstations;
