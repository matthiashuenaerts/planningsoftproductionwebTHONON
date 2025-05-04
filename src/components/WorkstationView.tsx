
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TaskList from './TaskList';
import { WorkstationType } from '@/lib/mockData';
import { taskService, Task } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { workstationService } from '@/services/workstationService';

interface WorkstationViewProps {
  workstation: WorkstationType;
}

const WorkstationView: React.FC<WorkstationViewProps> = ({ workstation }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchWorkstationTasks = async () => {
      try {
        setLoading(true);
        
        // First get the workstation ID by name
        const { data } = await workstationService.getByName(workstation);
        
        if (!data) {
          console.log(`No workstation found with name: ${workstation}`);
          setTasks([]);
          return;
        }
        
        // Then get tasks for this workstation ID
        const workstationTasks = await taskService.getByWorkstationId(data.id);
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
  }, [workstation, toast]);

  const getWorkstationColor = (workstation: WorkstationType): string => {
    switch (workstation) {
      case WorkstationType.CUTTING:
        return 'bg-workstation-cutting';
      case WorkstationType.WELDING:
        return 'bg-workstation-welding';
      case WorkstationType.PAINTING:
        return 'bg-workstation-painting';
      case WorkstationType.ASSEMBLY:
        return 'bg-workstation-assembly';
      case WorkstationType.PACKAGING:
        return 'bg-workstation-packaging';
      case WorkstationType.SHIPPING:
        return 'bg-workstation-shipping';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${getWorkstationColor(workstation)}`}></div>
          <CardTitle>{workstation} Workstation</CardTitle>
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
