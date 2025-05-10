import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { Package, Clock, Check, Calendar, ArrowUpRight } from 'lucide-react';
import TaskList from '@/components/TaskList';
import { Workstation } from '@/services/workstationService';

// Helper function to validate and convert task status
const validateTaskStatus = (status: string): "TODO" | "IN_PROGRESS" | "COMPLETED" => {
  if (status === "TODO" || status === "IN_PROGRESS" || status === "COMPLETED") {
    return status;
  }
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

const AUTO_REFRESH_INTERVAL = 60000; // Refresh every 60 seconds

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
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Add a clock that updates every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Auto-refresh data at regular intervals for TV display
  useEffect(() => {
    // Initial fetch
    fetchUserWorkstations();
    
    // Set up auto-refresh
    const refreshTimer = setInterval(() => {
      console.log(`Auto-refreshing data at ${new Date().toLocaleTimeString()}`);
      fetchUserWorkstations();
      setLastUpdated(new Date());
    }, AUTO_REFRESH_INTERVAL);
    
    return () => clearInterval(refreshTimer);
  }, []);

  // Fetch the workstations assigned to this user
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
        fetchTasks(workstations);
      } else {
        console.warn("No workstations found for this user");
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Error fetching workstations:', error);
      setLoading(false);
    }
  };

  const fetchTasks = async (workstations: Workstation[]) => {
    if (!workstations.length) {
      setLoading(false);
      return;
    }

    try {
      const allTasks: Task[] = [];
      
      // For each workstation, get the tasks
      for (const workstation of workstations) {
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
              const { data: matchingTasks, error: matchingTasksError } = await supabase
                .from('tasks')
                .select('*')
                .ilike('title', `%${standardTask.task_number}%`)
                .eq('status', 'TODO');
                
              if (matchingTasksError) {
                console.error("Error fetching matching tasks:", matchingTasksError);
                continue;
              }
              
              if (matchingTasks && matchingTasks.length > 0) {
                console.log(`Found ${matchingTasks.length} tasks matching standard task ${standardTask.task_number}`);
                
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
                .eq('status', 'TODO');
                
              if (matchingNameTasksError) {
                console.error("Error fetching tasks by name:", matchingNameTasksError);
                continue;
              }
              
              if (matchingNameTasks && matchingNameTasks.length > 0) {
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
            .eq('status', 'TODO');
            
          if (linkedTasksError) {
            console.error("Error fetching linked tasks:", linkedTasksError);
            continue;
          }
          
          if (linkedTasks && linkedTasks.length > 0) {
            console.log("Found linked tasks:", linkedTasks.length);
            
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
          .eq('status', 'TODO');
          
        if (directTasksError) {
          console.error("Error fetching direct tasks:", directTasksError);
          continue;
        }
        
        if (directTasks && directTasks.length > 0) {
          console.log("Found tasks with workstation directly:", directTasks.length);
          
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
      
      // Sort tasks by due date (earliest first)
      const sortedTasks = tasksWithDetails.sort((a, b) => {
        const dateA = new Date(a.due_date);
        const dateB = new Date(b.due_date);
        return dateA.getTime() - dateB.getTime();
      });
      
      setTasks(sortedTasks);
      
      // Update stats based on these tasks
      updateStats(sortedTasks);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching workstation tasks:', error);
      setLoading(false);
    }
  };

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
      
      // Calculate due today
      const dueToday = tasksData.filter(task => {
        const taskDate = new Date(task.due_date);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === today.getTime();
      }).length;
      
      // Count completed tasks for today by checking the completed_at field
      let completedToday = 0;
      let todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      if (userWorkstations.length > 0) {
        // Get workstation IDs and names for queries
        const workstationIds = userWorkstations.map(ws => ws.id);
        const workstationNames = userWorkstations.map(ws => ws.name);
        
        // Tasks completed today via task_workstation_links
        const { data: completedLinkedTasks, error: linkError } = await supabase
          .from('task_workstation_links')
          .select(`
            task_id,
            tasks!inner (id, completed_at, status)
          `)
          .in('workstation_id', workstationIds)
          .gte('tasks.completed_at', todayStart.toISOString())
          .eq('tasks.status', 'COMPLETED');
          
        if (linkError) {
          console.error("Error fetching completed linked tasks:", linkError);
        } else {
          console.log("Completed linked tasks:", completedLinkedTasks?.length || 0);
          // Count unique tasks from the linked results
          if (completedLinkedTasks) {
            const uniqueCompletedIds = new Set<string>();
            completedLinkedTasks.forEach(item => {
              if (item.tasks && item.task_id) {
                uniqueCompletedIds.add(item.task_id);
              }
            });
            completedToday += uniqueCompletedIds.size;
          }
        }
        
        // Tasks completed today via workstation name
        const { data: completedNamedTasks, error: namedError } = await supabase
          .from('tasks')
          .select('id')
          .in('workstation', workstationNames)
          .eq('status', 'COMPLETED')
          .gte('completed_at', todayStart.toISOString());
          
        if (namedError) {
          console.error("Error fetching completed tasks by name:", namedError);
        } else {
          console.log("Completed tasks by workstation name:", completedNamedTasks?.length || 0);
          // Add to our count, accounting for any potential overlap with the previous query
          const completedNamedIds = new Set(completedNamedTasks?.map(task => task.id) || []);
          const linkTaskIds = new Set(completedLinkedTasks?.map(item => item.task_id) || []);
          
          // Count tasks that are in completedNamedIds but not in linkTaskIds
          if (completedNamedTasks) {
            completedNamedTasks.forEach(task => {
              if (!linkTaskIds.has(task.id)) {
                completedToday++;
              }
            });
          }
        }
      }
      
      console.log(`Stats update: ${tasksData.length} total tasks, ${completedToday} completed today, ${dueToday} due today`);
      
      setStats({
        totalTasks: tasksData.length,
        completedToday,
        inProgress: 0,
        dueToday
      });
    } catch (error) {
      console.error('Error updating task stats:', error);
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
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-full mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Workstation Screen: {currentEmployee?.name || 'Unknown'}
            </h1>
            <p className="text-gray-600 text-lg">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()} (auto-refreshes every minute)
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-semibold">
              <Clock className="inline-block mr-2 h-6 w-6 text-primary" />
              {currentTime.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Main content - two column layout */}
        {userWorkstations.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Workstations Assigned</CardTitle>
            </CardHeader>
            <CardContent>
              <p>No workstations are assigned to this account. Please contact an administrator to assign workstations.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {/* Tasks column - takes up 3/4 of the space */}
            <div className="col-span-3">
              {tasks.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>No Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>There are no pending tasks assigned to your workstation(s).</p>
                  </CardContent>
                </Card>
              ) : (
                <TaskList 
                  tasks={tasks} 
                  title="To Do Tasks" 
                />
              )}
            </div>
            
            {/* Stats column - takes up 1/4 of the space */}
            <div className="space-y-4">
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

              {userWorkstations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Assigned Workstations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {userWorkstations.map(ws => (
                        <li key={ws.id} className="text-sm font-medium text-gray-700">{ws.name}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkstationDashboard;
