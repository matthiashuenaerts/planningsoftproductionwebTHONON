
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TaskList from './TaskList';
import { taskService, Task, projectService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { Package, LayoutGrid, Warehouse, Wrench, Scissors, Layers, Check, Monitor, Truck, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';

interface WorkstationViewProps {
  workstationId: string;
  onBack?: () => void; // Make onBack optional
}

const WorkstationView: React.FC<WorkstationViewProps> = ({ workstationId, onBack }) => {
  const [workstation, setWorkstation] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { currentEmployee } = useAuth();

  useEffect(() => {
    const fetchWorkstationData = async () => {
      try {
        setLoading(true);
        
        // First fetch the workstation name
        const { data: workstationData, error: workstationError } = await supabase
          .from('workstations')
          .select('name')
          .eq('id', workstationId)
          .single();
        
        if (workstationError) throw workstationError;
        setWorkstation(workstationData?.name || "");
        
        // Fetch tasks for this workstation - use taskService directly
        const workstationTasks = await taskService.getByWorkstationId(workstationId);
        
        // Filter out completed tasks
        const incompleteTasks = workstationTasks.filter(
          task => task.status !== 'COMPLETED'
        );
        
        // Fetch project information for each task's phase
        const tasksWithProjectInfo = await Promise.all(
          incompleteTasks.map(async (task) => {
            try {
              // Get the phase to get the project_id
              const { data: phaseData, error: phaseError } = await supabase
                .from('phases')
                .select('project_id, name')
                .eq('id', task.phase_id)
                .single();
              
              if (phaseError) throw phaseError;
              
              // Get the project name
              const { data: projectData, error: projectError } = await supabase
                .from('projects')
                .select('name')
                .eq('id', phaseData.project_id)
                .single();
              
              if (projectError) throw projectError;
              
              // Append project name to task
              return {
                ...task,
                project_name: projectData.name
              };
            } catch (error) {
              console.error('Error fetching project info for task:', error);
              return task;
            }
          })
        );
        
        setTasks(tasksWithProjectInfo);
      } catch (error: any) {
        console.error('Error fetching workstation data:', error);
        toast({
          title: "Error",
          description: `Failed to load workstation tasks: ${error.message}`,
          variant: "destructive"
        });
        // Setting empty tasks to prevent UI errors
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkstationData();
  }, [workstationId, toast]);

  // Function to handle completing a task
  const handleCompleteTask = async (taskId: string) => {
    try {
      if (!currentEmployee) {
        toast({
          title: "Authentication required",
          description: "You must be logged in to complete tasks.",
          variant: "destructive"
        });
        return;
      }
      
      const completedAt = new Date();
      
      // Update the task with completion information
      await taskService.update(taskId, { 
        status: 'COMPLETED',
        completed_by: currentEmployee.id,
        completed_at: completedAt.toISOString()
      });
      
      // Update local state to remove the completed task
      setTasks(tasks.filter(task => task.id !== taskId));
      
      toast({
        title: "Task completed",
        description: `Task has been marked as completed by ${currentEmployee.name} at ${format(completedAt, 'PPpp')}`
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to complete task: ${error.message}`,
        variant: "destructive"
      });
    }
  };

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
    <Card className="h-full">
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
          <>
            {tasks.length === 0 ? (
              <div className="text-center p-8">
                <Check className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium mb-2">All caught up!</h3>
                <p className="text-muted-foreground">No pending tasks for this workstation.</p>
              </div>
            ) : (
              <div className="space-y-4 mt-2">
                {tasks.map((task) => (
                  <Card key={task.id} className="overflow-hidden">
                    <div className="border-l-4 border-l-blue-500 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-lg">
                          {task.project_name ? `${task.project_name} - ${task.title}` : task.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            task.priority === 'High' || task.priority === 'Urgent' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {task.priority}
                          </div>
                        </div>
                      </div>
                      
                      {task.description && (
                        <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                      )}
                      
                      <div className="flex justify-between items-center mt-4">
                        <div className="text-sm text-muted-foreground">
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </div>
                        <Button 
                          onClick={() => handleCompleteTask(task.id)}
                          className="bg-green-500 hover:bg-green-600"
                          size="sm"
                        >
                          <Check className="mr-1 h-4 w-4" /> Complete Task
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkstationView;
