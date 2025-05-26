
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import TaskList from '@/components/TaskList';
import { useToast } from '@/hooks/use-toast';
import { Task } from '@/services/dataService';
import { supabase } from '@/integrations/supabase/client';
import { workstationService } from '@/services/workstationService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Workstation } from '@/services/workstationService';
import { useIsMobile } from '@/hooks/use-mobile';

const PersonalTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [userWorkstations, setUserWorkstations] = useState<Workstation[]>([]);
  const { currentEmployee } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchUserWorkstations = async () => {
      if (!currentEmployee) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Get all workstations assigned to the employee
        const workstations = await workstationService.getWorkstationsForEmployee(currentEmployee.id);
        setUserWorkstations(workstations);
        
        if (workstations.length === 0) {
          // If no linked workstations, check direct workstation assignment (legacy)
          const { data: employeeData } = await supabase
            .from('employees')
            .select('workstation')
            .eq('id', currentEmployee.id)
            .single();
            
          if (employeeData?.workstation) {
            // Try to find the workstation by name
            const workstationByName = await workstationService.getByName(employeeData.workstation);
            if (workstationByName) {
              setUserWorkstations([workstationByName]);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching workstations:', error);
      }
    };

    fetchUserWorkstations();
  }, [currentEmployee]);

  useEffect(() => {
    const fetchPersonalTasks = async () => {
      if (!currentEmployee || userWorkstations.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const allTasks: Task[] = [];
        
        // For each workstation, get the tasks
        for (const workstation of userWorkstations) {
          // First try to get tasks via standard task links
          const { data: standardTaskLinks, error: linksError } = await supabase
            .from('standard_task_workstation_links')
            .select('standard_task_id')
            .eq('workstation_id', workstation.id);
          
          if (linksError) {
            console.error('Error fetching standard task links:', linksError);
            continue;
          }
          
          if (standardTaskLinks && standardTaskLinks.length > 0) {
            // Get all the standard tasks for this workstation
            const standardTaskIds = standardTaskLinks.map(link => link.standard_task_id);
            const standardTasks = await Promise.all(
              standardTaskIds.map(id => supabase
                .from('standard_tasks')
                .select('*')
                .eq('id', id)
                .single()
                .then(res => res.data)
              )
            );
            
            // For each standard task, find actual tasks that match
            for (const standardTask of standardTasks) {
              if (!standardTask) continue;
              
              const taskNumber = standardTask.task_number;
              const taskName = standardTask.task_name;
              
              // Find tasks that match this standard task and are TODO
              const { data: matchingTasks, error: tasksError } = await supabase
                .from('tasks')
                .select('*')
                .eq('status', 'TODO')
                .or(`title.ilike.%${taskNumber}%,title.ilike.%${taskName}%`);
                
              if (tasksError) {
                console.error('Error fetching matching tasks:', tasksError);
                continue;
              }
              
              if (matchingTasks && matchingTasks.length > 0) {
                // Filter for tasks assigned to current user or unassigned
                const relevantTasks = matchingTasks.filter(task => 
                  !task.assignee_id || task.assignee_id === currentEmployee.id
                );
                
                // Get project info for each task
                const tasksWithProjectInfo = await Promise.all(
                  relevantTasks.map(async (task) => {
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
                      
                      // Cast task to the required Task type
                      return {
                        ...task,
                        project_name: projectData.name,
                        priority: task.priority as "Low" | "Medium" | "High" | "Urgent",
                        status: task.status as "TODO" | "IN_PROGRESS" | "COMPLETED" | "HOLD"
                      } as Task;
                    } catch (error) {
                      console.error('Error fetching project info for task:', error);
                      return {
                        ...task,
                        priority: task.priority as "Low" | "Medium" | "High" | "Urgent",
                        status: task.status as "TODO" | "IN_PROGRESS" | "COMPLETED" | "HOLD"
                      } as Task;
                    }
                  })
                );
                
                allTasks.push(...tasksWithProjectInfo);
              }
            }
          } else {
            // Fall back to traditional task-workstation links if no standard tasks are linked
            const workstationTasks = await supabase
              .from('task_workstation_links')
              .select('tasks (*)')
              .eq('workstation_id', workstation.id);
              
            if (workstationTasks.error) {
              console.error('Error fetching workstation tasks:', workstationTasks.error);
              continue;
            }
            
            if (workstationTasks.data && workstationTasks.data.length > 0) {
              const filteredTasks = workstationTasks.data
                .filter(item => item.tasks && item.tasks.status === 'TODO')
                .map(item => ({
                  ...item.tasks,
                  priority: item.tasks.priority as "Low" | "Medium" | "High" | "Urgent",
                  status: item.tasks.status as "TODO" | "IN_PROGRESS" | "COMPLETED" | "HOLD"
                })) as Task[];
                
              // Filter for tasks assigned to current user or unassigned
              const relevantTasks = filteredTasks.filter(task => 
                !task.assignee_id || task.assignee_id === currentEmployee.id
              );
              
              allTasks.push(...relevantTasks);
            }
          }
        }

        // Remove duplicates (a task might be linked to multiple workstations)
        const uniqueTasks = Array.from(
          new Map(allTasks.map(task => [task.id, task])).values()
        );
        
        setTasks(uniqueTasks);
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

    if (userWorkstations.length > 0) {
      fetchPersonalTasks();
    }
  }, [currentEmployee, userWorkstations, toast]);

  const handleTaskStatusChange = async (taskId: string, status: Task['status']) => {
    if (!currentEmployee) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to update tasks.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const updateData: Partial<Task> = { 
        status,
        updated_at: new Date().toISOString(),
        status_changed_at: new Date().toISOString()
      };
      
      // Set assignee when changing to IN_PROGRESS
      if (status === 'IN_PROGRESS') {
        updateData.assignee_id = currentEmployee?.id;
      }
      
      // Add completion info if task is being marked as completed
      if (status === 'COMPLETED') {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = currentEmployee.id;
      }
      
      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);
        
      if (error) throw error;
      
      // Remove task from list since we only show TODO tasks
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      
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

  return (
    <div className="flex min-h-screen">
      {!isMobile && (
        <div className="w-64 bg-sidebar fixed top-0 bottom-0">
          <Navbar />
        </div>
      )}
      {isMobile && <Navbar />}
      <div className={`${isMobile ? 'pt-16' : 'ml-64'} w-full p-6`}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Personal Tasks</h1>
            <p className="text-gray-500">
              TODO tasks assigned to you at your workstations
            </p>
          </div>
          
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : userWorkstations.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Workstations Assigned</CardTitle>
              </CardHeader>
              <CardContent>
                <p>You don't have any workstations assigned. Please contact an administrator to assign you to workstations.</p>
              </CardContent>
            </Card>
          ) : tasks.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No TODO Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <p>There are no pending TODO tasks assigned to your workstations or to you directly.</p>
              </CardContent>
            </Card>
          ) : (
            <TaskList 
              tasks={tasks} 
              title="TODO Tasks" 
              onTaskStatusChange={handleTaskStatusChange}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalTasks;
