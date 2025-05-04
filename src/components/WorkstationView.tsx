
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TaskList from './TaskList';
import { taskService, Task } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';

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
