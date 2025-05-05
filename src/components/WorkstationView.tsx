
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TaskList from './TaskList';
import { taskService, Task } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { Package, LayoutGrid, Warehouse, Wrench, Scissors, Layers, Check, Monitor, Truck, Flag } from 'lucide-react';

interface WorkstationViewProps {
  workstation: string;
  workstationId: string;
}

const WorkstationView: React.FC<WorkstationViewProps> = ({ workstation, workstationId }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchWorkstationTasks = async () => {
      try {
        setLoading(true);
        
        // Fetch tasks directly using workstation ID
        const workstationTasks = await taskService.getByWorkstationId(workstationId);
        setTasks(workstationTasks);
      } catch (error: any) {
        console.error('Error fetching workstation tasks:', error);
        toast({
          title: "Error",
          description: `Failed to load ${workstation} tasks: ${error.message}`,
          variant: "destructive"
        });
        // Setting empty tasks to prevent UI errors
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkstationTasks();
  }, [workstation, workstationId, toast]);

  const getWorkstationIcon = (name: string) => {
    // Return appropriate icon based on workstation name
    const lowerCaseName = name.toLowerCase();
    if (lowerCaseName.includes('productievoor')) return <Package size={24} />;
    if (lowerCaseName.includes('productiestur')) return <LayoutGrid size={24} />;
    if (lowerCaseName.includes('stock') || lowerCaseName.includes('logistiek')) return <Warehouse size={24} />;
    if (lowerCaseName.includes('opdeelzaag 1')) return <Wrench size={24} />;
    if (lowerCaseName.includes('opdeelzaag 2')) return <Scissors size={24} />;
    if (lowerCaseName.includes('afplakken')) return <Layers size={24} />;
    if (lowerCaseName.includes('cnc')) return <Wrench size={24} />;
    if (lowerCaseName.includes('controle/opkuis')) return <Check size={24} />;
    if (lowerCaseName.includes('montage')) return <Layers size={24} />;
    if (lowerCaseName.includes('afwerking')) return <Wrench size={24} />;
    if (lowerCaseName.includes('controle e+s')) return <Monitor size={24} />;
    if (lowerCaseName.includes('eindcontrole')) return <Check size={24} />;
    if (lowerCaseName.includes('bufferzone')) return <Warehouse size={24} />;
    if (lowerCaseName.includes('laden') || lowerCaseName.includes('vrachtwagen')) return <Truck size={24} />;
    if (lowerCaseName.includes('plaatsen')) return <Package size={24} />;
    if (lowerCaseName.includes('afsluiten')) return <Flag size={24} />;
    
    // Default icon
    return <Wrench size={24} />;
  };

  const getWorkstationColor = (name: string): string => {
    // Create a consistent color mapping based on the workstation name
    const colorClasses = [
      'bg-blue-500',
      'bg-green-500',
      'bg-amber-500',
      'bg-red-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
    ];
    
    // Simple hash function to pick a consistent color for each workstation name
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colorClasses[hash % colorClasses.length];
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${getWorkstationColor(workstation)}`}>
            {getWorkstationIcon(workstation)}
          </div>
          <CardTitle>{workstation}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <TaskList 
            tasks={tasks} 
            title={`${workstation} Tasks`} 
            onTaskStatusChange={async (taskId, status) => {
              try {
                await taskService.update(taskId, { status });
                
                // Update local state
                setTasks(tasks.map(task => 
                  task.id === taskId ? { ...task, status } : task
                ));
                
                toast({
                  title: "Task updated",
                  description: "Task status has been successfully updated."
                });
              } catch (error: any) {
                toast({
                  title: "Error",
                  description: `Failed to update task: ${error.message}`,
                  variant: "destructive"
                });
              }
            }}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default WorkstationView;
