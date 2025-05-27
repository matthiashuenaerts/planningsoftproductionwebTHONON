
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Calendar, Package, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface Task {
  project_name: string;
  id: string;
  phase_id: string;
  assignee_id?: string;
  title: string;
  description?: string;
  workstation: string;
  status: "TODO" | "IN_PROGRESS" | "COMPLETED" | "HOLD";
  priority: "Low" | "Medium" | "High" | "Urgent";
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  completed_by?: string;
  standard_task_id?: string;
}

interface RushOrder {
  id: string;
  title: string;
  description?: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  workstation_id?: string;
  status: "TODO" | "IN_PROGRESS" | "COMPLETED";
  created_at: string;
  due_date?: string;
  assignee_id?: string;
  assignee?: {
    name: string;
  };
}

interface WorkstationViewProps {
  workstationId: string;
  workstationName: string;
}

const WorkstationView: React.FC<WorkstationViewProps> = ({ workstationId, workstationName }) => {
  const [inProgressTasks, setInProgressTasks] = useState<Task[]>([]);
  const [todoTasks, setTodoTasks] = useState<Task[]>([]);
  const [rushOrders, setRushOrders] = useState<RushOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { currentEmployee } = useAuth();

  useEffect(() => {
    fetchWorkstationData();
  }, [workstationId]);

  const fetchWorkstationData = async () => {
    try {
      setLoading(true);
      
      // Fetch tasks linked to this workstation
      const { data: taskLinks, error: taskLinksError } = await supabase
        .from('task_workstation_links')
        .select(`
          tasks (
            id,
            phase_id,
            assignee_id,
            title,
            description,
            status,
            priority,
            estimated_hours,
            actual_hours,
            due_date,
            created_at,
            updated_at,
            completed_at,
            completed_by,
            standard_task_id
          )
        `)
        .eq('workstation_id', workstationId);

      if (taskLinksError) throw taskLinksError;

      // Fetch rush orders for this workstation
      const { data: rushOrdersData, error: rushOrdersError } = await supabase
        .from('rush_orders')
        .select(`
          *,
          assignee:employees(name)
        `)
        .eq('workstation_id', workstationId)
        .in('status', ['TODO', 'IN_PROGRESS']);

      if (rushOrdersError) throw rushOrdersError;

      // Process tasks and add project names
      const allTasks = await Promise.all(
        (taskLinks || [])
          .filter(link => link.tasks && ['TODO', 'IN_PROGRESS'].includes(link.tasks.status))
          .map(async (link) => {
            const task = link.tasks;
            
            try {
              // Get phase data to get project id
              const { data: phaseData, error: phaseError } = await supabase
                .from('phases')
                .select('project_id, name')
                .eq('id', task.phase_id)
                .single();
              
              if (phaseError) throw phaseError;
              
              // Get project name
              const { data: projectData, error: projectError } = await supabase
                .from('projects')
                .select('name')
                .eq('id', phaseData.project_id)
                .single();
              
              if (projectError) throw projectError;
              
              return {
                ...task,
                project_name: projectData.name,
                workstation: workstationName
              } as Task;
            } catch (error) {
              console.error('Error fetching project info for task:', error);
              return {
                ...task,
                project_name: 'Unknown Project',
                workstation: workstationName
              } as Task;
            }
          })
      );

      // Separate tasks by status
      const inProgress = allTasks.filter(task => task.status === 'IN_PROGRESS');
      const todo = allTasks.filter(task => task.status === 'TODO');

      setInProgressTasks(inProgress);
      setTodoTasks(todo);
      setRushOrders(rushOrdersData || []);

    } catch (error: any) {
      console.error('Error fetching workstation data:', error);
      toast({
        title: "Error",
        description: `Failed to load workstation data: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: Task['status']) => {
    if (!currentEmployee) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to update tasks.",
        variant: "destructive"
      });
      return;
    }

    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        status_changed_at: new Date().toISOString()
      };

      // Set assignee when changing to IN_PROGRESS
      if (newStatus === 'IN_PROGRESS') {
        updateData.assignee_id = currentEmployee.id;
      }

      // Add completion info if task is being marked as completed
      if (newStatus === 'COMPLETED') {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = currentEmployee.id;
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;

      // Update local state
      if (newStatus === 'IN_PROGRESS') {
        const task = todoTasks.find(t => t.id === taskId);
        if (task) {
          setTodoTasks(prev => prev.filter(t => t.id !== taskId));
          setInProgressTasks(prev => [...prev, { ...task, status: 'IN_PROGRESS', assignee_id: currentEmployee.id }]);
        }
      } else if (newStatus === 'TODO') {
        const task = inProgressTasks.find(t => t.id === taskId);
        if (task) {
          setInProgressTasks(prev => prev.filter(t => t.id !== taskId));
          setTodoTasks(prev => [...prev, { ...task, status: 'TODO' }]);
        }
      } else if (newStatus === 'COMPLETED') {
        // Remove from both lists since we don't show completed tasks
        setTodoTasks(prev => prev.filter(t => t.id !== taskId));
        setInProgressTasks(prev => prev.filter(t => t.id !== taskId));
      }

      toast({
        title: "Task Updated",
        description: `Task status changed to ${newStatus}`,
      });

    } catch (error: any) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: `Failed to update task: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const handleRushOrderStatusChange = async (rushOrderId: string, newStatus: RushOrder['status']) => {
    if (!currentEmployee) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to update rush orders.",
        variant: "destructive"
      });
      return;
    }

    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Set assignee when changing to IN_PROGRESS
      if (newStatus === 'IN_PROGRESS') {
        updateData.assignee_id = currentEmployee.id;
      }

      const { error } = await supabase
        .from('rush_orders')
        .update(updateData)
        .eq('id', rushOrderId);

      if (error) throw error;

      // Update local state or remove if completed
      if (newStatus === 'COMPLETED') {
        setRushOrders(prev => prev.filter(ro => ro.id !== rushOrderId));
      } else {
        setRushOrders(prev => prev.map(ro => 
          ro.id === rushOrderId 
            ? { ...ro, status: newStatus, assignee_id: newStatus === 'IN_PROGRESS' ? currentEmployee.id : ro.assignee_id }
            : ro
        ));
      }

      toast({
        title: "Rush Order Updated",
        description: `Rush order status changed to ${newStatus}`,
      });

    } catch (error: any) {
      console.error('Error updating rush order:', error);
      toast({
        title: "Error",
        description: `Failed to update rush order: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-800 border-red-300';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'TODO': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-300';
      case 'HOLD': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const TaskCard = ({ task, showStatusControls = true }: { task: Task; showStatusControls?: boolean }) => (
    <Card className="mb-4 hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
              {task.project_name}
            </CardTitle>
            <div className="text-base text-gray-700 mb-2">{task.title}</div>
            {task.description && (
              <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
            )}
          </div>
          <div className="flex flex-col gap-2 ml-4">
            <Badge className={getPriorityColor(task.priority)}>
              {task.priority}
            </Badge>
            <Badge className={getStatusColor(task.status)}>
              {task.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
          {task.estimated_hours && (
            <div className="flex items-center">
              <Clock className="mr-1 h-4 w-4" />
              <span>{task.estimated_hours}h estimated</span>
            </div>
          )}
          {task.assignee_id && (
            <div className="flex items-center">
              <User className="mr-1 h-4 w-4" />
              <span>Assigned</span>
            </div>
          )}
          {task.due_date && (
            <div className="flex items-center">
              <Calendar className="mr-1 h-4 w-4" />
              <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        
        {showStatusControls && (
          <div className="flex gap-2">
            {task.status === 'TODO' && (
              <Button
                size="sm"
                onClick={() => handleTaskStatusChange(task.id, 'IN_PROGRESS')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Start Task
              </Button>
            )}
            {task.status === 'IN_PROGRESS' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTaskStatusChange(task.id, 'TODO')}
                >
                  Move to TODO
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleTaskStatusChange(task.id, 'COMPLETED')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Complete
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const RushOrderCard = ({ rushOrder }: { rushOrder: RushOrder }) => (
    <Card className="mb-4 hover:shadow-md transition-shadow border-l-4 border-l-red-500">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-red-700 mb-1 flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" />
              RUSH ORDER: {rushOrder.title}
            </CardTitle>
            {rushOrder.description && (
              <p className="text-sm text-gray-600 line-clamp-2">{rushOrder.description}</p>
            )}
          </div>
          <div className="flex flex-col gap-2 ml-4">
            <Badge className={getPriorityColor(rushOrder.priority)}>
              {rushOrder.priority}
            </Badge>
            <Badge className={getStatusColor(rushOrder.status)}>
              {rushOrder.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
          {rushOrder.assignee && (
            <div className="flex items-center">
              <User className="mr-1 h-4 w-4" />
              <span>{rushOrder.assignee.name}</span>
            </div>
          )}
          {rushOrder.due_date && (
            <div className="flex items-center">
              <Calendar className="mr-1 h-4 w-4" />
              <span>Due: {new Date(rushOrder.due_date).toLocaleDateString()}</span>
            </div>
          )}
          <div className="flex items-center">
            <Clock className="mr-1 h-4 w-4" />
            <span>Created: {new Date(rushOrder.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          {rushOrder.status === 'TODO' && (
            <Button
              size="sm"
              onClick={() => handleRushOrderStatusChange(rushOrder.id, 'IN_PROGRESS')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Start Rush Order
            </Button>
          )}
          {rushOrder.status === 'IN_PROGRESS' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRushOrderStatusChange(rushOrder.id, 'TODO')}
              >
                Move to TODO
              </Button>
              <Button
                size="sm"
                onClick={() => handleRushOrderStatusChange(rushOrder.id, 'COMPLETED')}
                className="bg-green-600 hover:bg-green-700"
              >
                Complete
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rush Orders Section */}
      {rushOrders.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 text-red-700 flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Rush Orders ({rushOrders.length})
          </h3>
          {rushOrders.map(rushOrder => (
            <RushOrderCard key={rushOrder.id} rushOrder={rushOrder} />
          ))}
        </div>
      )}

      {/* In Progress Tasks Section */}
      {inProgressTasks.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 text-blue-700 flex items-center">
            <Package className="mr-2 h-5 w-5" />
            In Progress Tasks ({inProgressTasks.length})
          </h3>
          {inProgressTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      {/* TODO Tasks Section */}
      {todoTasks.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 text-gray-700 flex items-center">
            <Package className="mr-2 h-5 w-5" />
            TODO Tasks ({todoTasks.length})
          </h3>
          {todoTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      {/* No tasks message */}
      {inProgressTasks.length === 0 && todoTasks.length === 0 && rushOrders.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Tasks</h3>
            <p className="text-gray-600">There are no active tasks for this workstation.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WorkstationView;
