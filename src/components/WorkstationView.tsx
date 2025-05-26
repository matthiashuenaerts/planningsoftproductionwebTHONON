
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TaskList from './TaskList';
import { Task } from '@/services/dataService';
import { taskService } from '@/services/dataService';
import { rushOrderService } from '@/services/rushOrderService';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Clock } from 'lucide-react';

interface WorkstationViewProps {
  workstationName?: string;
  workstationId?: string;
  onBack?: () => void;
}

const WorkstationView: React.FC<WorkstationViewProps> = ({ workstationName, workstationId, onBack }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Use workstationName if provided, otherwise get it from workstationId
  const displayName = workstationName || 'Workstation';

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load regular tasks using the name
      const regularTasks = await taskService.getByWorkstation(displayName);
      
      // Load rush order tasks
      let workstationDbId = workstationId;
      if (!workstationDbId && workstationName) {
        const { data: workstationData, error: workstationError } = await supabase
          .from('workstations')
          .select('id')
          .eq('name', workstationName)
          .single();
        
        if (workstationError) throw workstationError;
        workstationDbId = workstationData.id;
      }
      
      let matchedTasks = [...regularTasks];
      
      if (workstationDbId) {
        const rushOrders = await rushOrderService.getRushOrdersForWorkstation(workstationDbId);
        
        // Process rush order tasks
        if (rushOrders.length > 0) {
          for (const rushOrder of rushOrders) {
            if (rushOrder.tasks && rushOrder.tasks.length > 0) {
              const tasksWithRushOrderInfo = await Promise.all(
                rushOrder.tasks.map(async (taskLink: any) => {
                  try {
                    const { data: task, error: taskError } = await supabase
                      .from('tasks')
                      .select('*')
                      .eq('id', taskLink.standard_task_id)
                      .single();
                    
                    if (taskError) throw taskError;
                    
                    const { data: rushOrderInfo, error: rushOrderError } = await supabase
                      .from('rush_orders')
                      .select('title')
                      .eq('id', taskLink.rush_order_id)
                      .neq('status', 'completed')
                      .single();
                    
                    if (rushOrderError) {
                      return null;
                    }
                    
                    const validateTaskStatus = (status: string): "TODO" | "IN_PROGRESS" | "COMPLETED" | "HOLD" => {
                      if (['TODO', 'IN_PROGRESS', 'COMPLETED', 'HOLD'].includes(status)) {
                        return status as "TODO" | "IN_PROGRESS" | "COMPLETED" | "HOLD";
                      }
                      return 'TODO';
                    };
                    
                    const status = validateTaskStatus(task.status);
                    
                    return {
                      ...task,
                      status,
                      is_rush_order: true,
                      rush_order_id: taskLink.rush_order_id,
                      title: `${rushOrderInfo.title} - ${task.title}`,
                      project_name: rushOrderInfo.title
                    } as Task;
                  } catch (error) {
                    console.error('Error processing rush order task:', error);
                    return null;
                  }
                })
              );
              
              const validRushOrderTasks = tasksWithRushOrderInfo.filter(task => task !== null) as Task[];
              matchedTasks = [...matchedTasks, ...validRushOrderTasks];
            }
          }
        }
      }
      
      // Filter to show only TODO tasks and rush order tasks
      const filteredTasks = matchedTasks.filter(task => 
        task.status === 'TODO' || task.is_rush_order
      );
      
      setTasks(filteredTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setError('Failed to load tasks');
      toast({
        title: 'Error',
        description: 'Failed to load tasks for this workstation',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [workstationName, workstationId]);

  const handleTaskUpdate = async (updatedTask: Task) => {
    try {
      await taskService.update(updatedTask.id, updatedTask);
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === updatedTask.id ? updatedTask : task
        )
      );
      toast({
        title: 'Success',
        description: 'Task updated successfully',
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{displayName} Workstation</h1>
        <div className="flex gap-2">
          {onBack && (
            <button onClick={onBack} className="text-blue-600 hover:underline">
              ← Back
            </button>
          )}
          <Badge variant="outline" className="text-lg px-3 py-1">
            {tasks.length} Tasks
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Tasks & Rush Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length > 0 ? (
            <TaskList 
              tasks={tasks} 
              onTaskUpdate={handleTaskUpdate}
              showRushOrderBadge={true}
            />
          ) : (
            <p className="text-gray-500 text-center py-4">No tasks available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkstationView;
