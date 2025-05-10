import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Package, Clock, Check, Calendar, ArrowUpRight } from 'lucide-react';
import TaskList from '@/components/TaskList';
import { workstationService } from '@/services/workstationService';
import { Workstation } from '@/services/workstationService';

// Helper function to validate and convert task status
const validateTaskStatus = (status: string): "TODO" | "IN_PROGRESS" | "COMPLETED" => {
  if (status === "TODO" || status === "IN_PROGRESS" || status === "COMPLETED") {
    return status;
  }
  // Default to TODO if an invalid status is provided
  console.warn(`Invalid task status: ${status}, defaulting to TODO`);
  return "TODO";
};

// Helper function to validate priority
const validatePriority = (priority: string): "Low" | "Medium" | "High" | "Urgent" => {
  if (priority === "Low" || priority === "Medium" || priority === "High" || priority === "Urgent") {
    return priority;
  }
  console.warn(`Invalid task priority: ${priority}, defaulting to Medium`);
  return "Medium";
};

const WorkstationDashboard = () => {
  const { currentEmployee } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedToday: 0,
    inProgress: 0,
    dueToday: 0
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();
  const [userWorkstations, setUserWorkstations] = useState<Workstation[]>([]);

  // Add a clock that updates every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Fetch the workstations assigned to this user
  useEffect(() => {
    const fetchUserWorkstations = async () => {
      if (!currentEmployee) {
        toast({
          title: "Error",
          description: "No employee information found",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // First check employee_workstation_links table
        const { data: workstationLinks, error: linksError } = await supabase
          .from('employee_workstation_links')
          .select('workstation_id')
          .eq('employee_id', currentEmployee.id);
        
        if (linksError) {
          console.error("Error fetching employee workstation links:", linksError);
          throw linksError;
        }
        
        const workstations: Workstation[] = [];
        
        // If there are workstation links, fetch each workstation
        if (workstationLinks && workstationLinks.length > 0) {
          console.log(`Found ${workstationLinks.length} workstation links for employee ${currentEmployee.id}`);
          
          for (const link of workstationLinks) {
            const { data: workstationData, error: workstationError } = await supabase
              .from('workstations')
              .select('id, name, description, created_at, updated_at')
              .eq('id', link.workstation_id)
              .single();
              
            if (workstationError) {
              console.error(`Error fetching workstation ${link.workstation_id}:`, workstationError);
              continue;
            }
            
            if (workstationData) {
              workstations.push(workstationData as Workstation);
            }
          }
        } else {
          // Fallback to legacy workstation field in employees table
          if (currentEmployee.workstation) {
            const { data: workstationData, error: workstationError } = await supabase
              .from('workstations')
              .select('id, name, description, created_at, updated_at')
              .ilike('name', currentEmployee.workstation)
              .maybeSingle();
              
            if (workstationError && workstationError.code !== 'PGRST116') {
              console.error('Error fetching workstation by name:', workstationError);
            } else if (workstationData) {
              workstations.push(workstationData as Workstation);
            } else {
              // Try to find workstation case-insensitively
              const { data: allWorkstations, error: listError } = await supabase
                .from('workstations')
                .select('id, name, description, created_at, updated_at');
                
              if (listError) {
                console.error('Error fetching all workstations:', listError);
              } else if (allWorkstations) {
                const matchingWorkstation = allWorkstations.find(ws => 
                  ws.name.toLowerCase() === currentEmployee.workstation?.toLowerCase()
                );
                
                if (matchingWorkstation) {
                  workstations.push(matchingWorkstation as Workstation);
                }
              }
            }
          }
        }
        
        // Special handling for workstation account type
        if (currentEmployee.role === 'workstation') {
          // For workstation accounts, use the name to find the matching workstation
          const { data: matchByName, error: matchError } = await supabase
            .from('workstations')
            .select('id, name, description, created_at, updated_at')
            .ilike('name', currentEmployee.name)
            .maybeSingle();
            
          if (matchError && matchError.code !== 'PGRST116') {
            console.error('Error finding workstation by employee name:', matchError);
          } else if (matchByName) {
            // Check if this workstation is already in our list
            const exists = workstations.some(ws => ws.id === matchByName.id);
            if (!exists) {
              workstations.push(matchByName as Workstation);
            }
          }
        }
        
        if (workstations.length > 0) {
          console.log(`Found ${workstations.length} workstations for user:`, workstations.map(ws => ws.name));
          setUserWorkstations(workstations);
        } else {
          console.warn("No workstations found for this user");
          toast({
            title: "Warning",
            description: "No workstations assigned to this account",
            variant: "destructive"
          });
        }
      } catch (error: any) {
        console.error('Error fetching workstations:', error);
        toast({
          title: "Error",
          description: `Failed to load workstation information: ${error.message}`,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserWorkstations();
  }, [currentEmployee, toast]);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!userWorkstations.length) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const allTasks: Task[] = [];
        
        // For each workstation, get the tasks
        for (const workstation of userWorkstations) {
          // First try to get tasks through standard task workstation links
          const { data: standardTaskLinks, error: standardLinksError } = await supabase
            .from('standard_task_workstation_links')
            .select('standard_task_id')
            .eq('workstation_id', workstation.id);
            
          if (standardLinksError) {
            console.error("Error fetching standard task links:", standardLinksError);
            continue;
          }
            
          if (standardTaskLinks && standardTaskLinks.length > 0) {
            console.log("Found standard task links:", standardTaskLinks.length);
            
            // Get the standard task details for these linked task IDs
            const standardTaskIds = standardTaskLinks.map(link => link.standard_task_id);
            
            // For each standard task, get tasks that contain its number in the title
            for (const standardTaskId of standardTaskIds) {
              // Get the standard task details
              const { data: standardTask, error: standardTaskError } = await supabase
                .from('standard_tasks')
                .select('task_number, task_name')
                .eq('id', standardTaskId)
                .single();
                
              if (standardTaskError) {
                console.error("Error fetching standard task:", standardTaskError);
                continue;
              }
              
              if (!standardTask) continue;
              
              try {
                // Search for active tasks containing this standard task number or name
                // Use proper OR syntax for PostgreSQL to avoid SQL injection
                const { data: matchingTasks, error: matchingTasksError } = await supabase
                  .from('tasks')
                  .select('*')
                  .or(`title.ilike.%${standardTask.task_number}%`)
                  .eq('status', 'TODO'); // Only fetch TODO tasks
                  
                if (matchingTasksError) {
                  console.error("Error fetching matching tasks:", matchingTasksError);
                  continue;
                }
                
                if (matchingTasks && matchingTasks.length > 0) {
                  console.log(`Found ${matchingTasks.length} tasks matching standard task ${standardTask.task_number}`);
                  
                  // Convert each task to the correct type with validated status
                  const validatedTasks: Task[] = matchingTasks.map(task => ({
                    ...task,
                    status: validateTaskStatus(task.status),
                    priority: validatePriority(task.priority)
                  }));
                  
                  allTasks.push(...validatedTasks);
                }
              } catch (error) {
                console.error(`Error querying tasks for standard task ${standardTask.task_number}:`, error);
              }

              // Try a second query for the task name if needed
              try {
                const { data: matchingNameTasks, error: matchingNameTasksError } = await supabase
                  .from('tasks')
                  .select('*')
                  .ilike('title', `%${standardTask.task_name}%`)
                  .eq('status', 'TODO'); // Only fetch TODO tasks
                  
                if (matchingNameTasksError) {
                  console.error("Error fetching tasks by name:", matchingNameTasksError);
                  continue;
                }
                
                if (matchingNameTasks && matchingNameTasks.length > 0) {
                  // Convert each task to the correct type with validated status
                  const validatedTasks: Task[] = matchingNameTasks.map(task => ({
                    ...task,
                    status: validateTaskStatus(task.status),
                    priority: validatePriority(task.priority)
                  }));
                  
                  allTasks.push(...validatedTasks);
                }
              } catch (error) {
                console.error(`Error querying tasks by name for standard task ${standardTask.task_name}:`, error);
              }
            }
          }
          
          // Check direct task workstation links
          console.log("Checking direct task links for workstation", workstation.name);
          
          // Get direct task workstation links
          const { data: taskLinks, error: taskLinksError } = await supabase
            .from('task_workstation_links')
            .select('task_id')
            .eq('workstation_id', workstation.id);
            
          if (taskLinksError) {
            console.error("Error fetching task workstation links:", taskLinksError);
            continue;
          }
          
          if (taskLinks && taskLinks.length > 0) {
            console.log("Found direct task links:", taskLinks.length);
            
            const taskIds = taskLinks.map(link => link.task_id);
            
            // Get the actual tasks
            const { data: linkedTasks, error: linkedTasksError } = await supabase
              .from('tasks')
              .select('*')
              .in('id', taskIds)
              .eq('status', 'TODO'); // Only fetch TODO tasks
              
            if (linkedTasksError) {
              console.error("Error fetching linked tasks:", linkedTasksError);
              continue;
            }
            
            if (linkedTasks && linkedTasks.length > 0) {
              console.log("Found linked tasks:", linkedTasks.length);
              
              // Convert each task to the correct type with validated status
              const validatedTasks: Task[] = linkedTasks.map(task => ({
                ...task,
                status: validateTaskStatus(task.status),
                priority: validatePriority(task.priority)
              }));
              
              allTasks.push(...validatedTasks);
            }
          }
          
          // Final fallback: check if tasks have workstation name directly
          console.log("Checking for tasks with workstation name:", workstation.name);
          
          const { data: directTasks, error: directTasksError } = await supabase
            .from('tasks')
            .select('*')
            .ilike('workstation', workstation.name)
            .eq('status', 'TODO'); // Only fetch TODO tasks
            
          if (directTasksError) {
            console.error("Error fetching direct tasks:", directTasksError);
            continue;
          }
          
          if (directTasks && directTasks.length > 0) {
            console.log("Found tasks with workstation directly:", directTasks.length);
            
            // Convert each task to the correct type with validated status
            const validatedTasks: Task[] = directTasks.map(task => ({
              ...task,
              status: validateTaskStatus(task.status),
              priority: validatePriority(task.priority)
            }));
            
            allTasks.push(...validatedTasks);
          }
        }
        
        // Remove any duplicate tasks
        const uniqueTasks = Array.from(
          new Map(allTasks.map(task => [task.id, task])).values()
        );
        
        console.log("Total unique tasks found:", uniqueTasks.length);
        
        // Get project and phase info for each task
        const tasksWithDetails = await enrichTasksWithProjectInfo(uniqueTasks);
        setTasks(tasksWithDetails);
        
        // Update stats based on these tasks
        updateStats(tasksWithDetails);
      } catch (error: any) {
        console.error('Error fetching workstation tasks:', error);
        toast({
          title: "Error",
          description: `Failed to load tasks: ${error.message}`,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (userWorkstations.length > 0) {
      fetchTasks();
    }
  }, [userWorkstations, toast]);

  // Helper function to enrich tasks with project info
  const enrichTasksWithProjectInfo = async (tasksData: Task[]): Promise<Task[]> => {
    return await Promise.all(tasksData.map(async (task) => {
      try {
        // Get the phase to find the project
        const { data: phaseData } = await supabase
          .from('phases')
          .select('project_id, name')
          .eq('id', task.phase_id)
          .single();
          
        // Get the project name
        const { data: projectData } = await supabase
          .from('projects')
          .select('name')
          .eq('id', phaseData.project_id)
          .single();
          
        // Form the task with additional info - status is already validated
        return {
          ...task,
          project_name: projectData?.name || 'Unknown Project',
          phase_name: phaseData?.name || 'Unknown Phase'
        } as Task;
      } catch (error) {
        console.error('Error enriching task with project info:', error);
        return {
          ...task,
          project_name: 'Unknown Project',
          phase_name: 'Unknown Phase'
        } as Task;
      }
    }));
  };

  // Helper function to update task statistics
  const updateStats = async (tasksData: Task[]) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Count completed tasks for today
      let completedToday = 0;
      
      if (userWorkstations.length > 0) {
        const workstationNames = userWorkstations.map(ws => ws.name);
        const { data: completedTasks } = await supabase
          .from('tasks')
          .select('*')
          .in('workstation', workstationNames)
          .eq('status', 'COMPLETED')
          .gte('completed_at', today.toISOString());
            
        completedToday = completedTasks?.length || 0;
      }

      // Calculate due today
      const dueToday = tasksData.filter(task => {
        const taskDate = new Date(task.due_date);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === today.getTime();
      }).length;
      
      setStats({
        totalTasks: tasksData.length,
        completedToday,
        inProgress: 0, // We're only showing TODO tasks, so inProgress is always 0
        dueToday
      });
    } catch (error) {
      console.error('Error updating task stats:', error);
    }
  };

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
      // Update task in Supabase
      const updateData: Partial<Task> = { 
        status,
        updated_at: new Date().toISOString()
      };
      
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
      
      // Update local state - if task is no longer TODO, remove it from the list
      if (status !== 'TODO') {
        setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
        
        // Update stats
        setStats(prev => ({
          ...prev,
          totalTasks: prev.totalTasks - 1,
          completedToday: status === 'COMPLETED' ? prev.completedToday + 1 : prev.completedToday
        }));
      } else {
        // Just update the status but keep the task in the list
        setTasks(prevTasks => prevTasks.map(task => 
          task.id === taskId ? { ...task, status } : task
        ));
      }
      
      toast({
        title: "Task Updated",
        description: `Task status changed to ${status}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update task: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {userWorkstations.length > 0 
                ? userWorkstations.map(ws => ws.name).join(', ')
                : 'Workstation'} Dashboard
            </h1>
            <p className="text-gray-600 text-lg">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-semibold">
              <Clock className="inline-block mr-2 h-6 w-6 text-primary" />
              {currentTime.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6 flex items-center">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <Package className="text-blue-700 h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">TODO Tasks</p>
                <h3 className="text-2xl font-bold">{stats.totalTasks}</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 flex items-center">
              <div className="bg-green-100 p-3 rounded-full mr-4">
                <Check className="text-green-700 h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Completed Today</p>
                <h3 className="text-2xl font-bold">{stats.completedToday}</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 flex items-center">
              <div className="bg-amber-100 p-3 rounded-full mr-4">
                <Calendar className="text-amber-700 h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Due Today</p>
                <h3 className="text-2xl font-bold">{stats.dueToday}</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 flex items-center">
              <div className="bg-purple-100 p-3 rounded-full mr-4">
                <ArrowUpRight className="text-purple-700 h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Workstations</p>
                <h3 className="text-2xl font-bold">{userWorkstations.length}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks List - Only TODO tasks */}
        {userWorkstations.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Workstations Assigned</CardTitle>
            </CardHeader>
            <CardContent>
              <p>No workstations are assigned to this account. Please contact an administrator to assign workstations.</p>
            </CardContent>
          </Card>
        ) : tasks.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <p>There are no pending tasks assigned to your workstation(s).</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            <TaskList 
              tasks={tasks} 
              title="To Do Tasks" 
              onTaskStatusChange={handleTaskStatusChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkstationDashboard;
