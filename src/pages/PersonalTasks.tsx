
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import TaskList from '@/components/TaskList';
import { useToast } from '@/hooks/use-toast';
import { Task } from '@/services/dataService';
import { supabase } from '@/integrations/supabase/client';

const PersonalTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentEmployee } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchPersonalTasks = async () => {
      if (!currentEmployee) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // First get the employee's workstation
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('workstation')
          .eq('id', currentEmployee.id)
          .single();
          
        if (employeeError) {
          throw employeeError;
        }
        
        if (!employeeData?.workstation) {
          // If no workstation is assigned, check workstation links
          const { data: links, error: linksError } = await supabase
            .from('employee_workstation_links')
            .select('workstations(name)')
            .eq('employee_id', currentEmployee.id);
            
          if (linksError) {
            throw linksError;
          }
          
          // Get tasks for all the employee's workstations
          if (links && links.length > 0) {
            const workstationNames = links.map(link => link.workstations.name);
            
            const { data: tasksData, error: tasksError } = await supabase
              .from('tasks')
              .select('*')
              .in('workstation', workstationNames)
              .order('due_date', { ascending: true });
              
            if (tasksError) {
              throw tasksError;
            }
            
            // Filter for tasks assigned to the current employee or unassigned
            const relevantTasks = tasksData.filter(task => 
              !task.assignee_id || task.assignee_id === currentEmployee.id
            );
            
            setTasks(relevantTasks);
          }
        } else {
          // If workstation is directly assigned
          const { data: tasksData, error: tasksError } = await supabase
            .from('tasks')
            .select('*')
            .eq('workstation', employeeData.workstation)
            .order('due_date', { ascending: true });
            
          if (tasksError) {
            throw tasksError;
          }
          
          // Filter for tasks assigned to the current employee or unassigned
          const relevantTasks = tasksData.filter(task => 
            !task.assignee_id || task.assignee_id === currentEmployee.id
          );
          
          setTasks(relevantTasks);
        }
      } catch (error: any) {
        console.error('Error fetching personal tasks:', error);
        toast({
          title: "Error",
          description: `Failed to load personal tasks: ${error.message}`,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPersonalTasks();
  }, [currentEmployee, toast]);

  const handleTaskStatusChange = async (taskId: string, status: Task['status']) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
          assignee_id: currentEmployee?.id // Assign to the current employee when updating
        })
        .eq('id', taskId);
        
      if (error) throw error;
      
      // Update local state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, status, assignee_id: currentEmployee?.id } : task
        )
      );
      
      toast({
        title: "Task Updated",
        description: `Task status changed to ${status}`,
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

  const getTasksByStatus = (status: Task['status']) => {
    return tasks.filter(task => task.status === status);
  };

  return (
    <div className="flex min-h-screen">
      <div className="w-64 bg-sidebar fixed top-0 bottom-0">
        <Navbar />
      </div>
      <div className="ml-64 w-full p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Personal Tasks at Workstation</h1>
            <p className="text-gray-500">
              {currentEmployee?.workstation 
                ? `Tasks for ${currentEmployee.workstation} workstation` 
                : 'Tasks assigned to your workstations'}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="space-y-8">
              <TaskList 
                tasks={getTasksByStatus('TODO')} 
                title="To Do" 
                onTaskStatusChange={handleTaskStatusChange}
              />
              <TaskList 
                tasks={getTasksByStatus('IN_PROGRESS')} 
                title="In Progress" 
                onTaskStatusChange={handleTaskStatusChange}
              />
              <TaskList 
                tasks={getTasksByStatus('COMPLETED')} 
                title="Completed" 
                onTaskStatusChange={handleTaskStatusChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalTasks;
