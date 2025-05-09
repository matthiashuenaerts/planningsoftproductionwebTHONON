import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Package, Clock, Check, Calendar, ArrowUpRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { workstationService } from '@/services/workstationService';

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
  const [workstationInfo, setWorkstationInfo] = useState<{id: string, name: string} | null>(null);
  const { toast } = useToast();

  // Add a clock that updates every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // First, find the workstation that corresponds to this employee
  useEffect(() => {
    const findWorkstation = async () => {
      if (!currentEmployee) return;
      
      try {
        setLoading(true);
        console.log("Finding workstation for:", currentEmployee.name);
        
        // Try to find by exact name match first
        const { data, error } = await workstationService.getByName(currentEmployee.name);
        
        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        
        if (data) {
          console.log("Found workstation by exact name match:", data);
          setWorkstationInfo({ id: data.id, name: data.name });
          return;
        }
        
        // If not found by exact match, try case-insensitive search
        const allWorkstations = await workstationService.getAll();
        console.log("Searching through all workstations:", allWorkstations.length);
        
        const match = allWorkstations.find(ws => 
          ws.name.toLowerCase() === currentEmployee.name.toLowerCase());
        
        if (match) {
          console.log("Found workstation by case-insensitive match:", match);
          setWorkstationInfo({ id: match.id, name: match.name });
          return;
        }
        
        // Still not found, show error
        toast({
          title: "Error",
          description: `No workstation found matching "${currentEmployee.name}"`,
          variant: "destructive"
        });
      } catch (error: any) {
        console.error('Error finding workstation:', error);
        toast({
          title: "Error",
          description: `Failed to find workstation: ${error.message}`,
          variant: "destructive"
        });
      }
    };
    
    findWorkstation();
  }, [currentEmployee, toast]);

  // Once we have the workstation info, fetch its tasks
  useEffect(() => {
    const fetchTasks = async () => {
      if (!workstationInfo) return;
      
      try {
        console.log("Fetching tasks for workstation:", workstationInfo);
        
        // First try to get tasks through standard task workstation links
        const { data: standardTaskLinks, error: standardLinksError } = await supabase
          .from('standard_task_workstation_links')
          .select('standard_task_id')
          .eq('workstation_id', workstationInfo.id);
          
        if (standardLinksError) {
          console.error("Error fetching standard task links:", standardLinksError);
          throw standardLinksError;
        }
        
        let allTasks: Task[] = [];
          
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
            
            // Search for active tasks containing this standard task number or name
            const { data: matchingTasks, error: matchingTasksError } = await supabase
              .from('tasks')
              .select('*')
              .not('status', 'eq', 'COMPLETED')
              .or(`title.ilike.%${standardTask.task_number}%,title.ilike.%${standardTask.task_name}%`);
              
            if (matchingTasksError) {
              console.error("Error fetching matching tasks:", matchingTasksError);
              continue;
            }
            
            if (matchingTasks && matchingTasks.length > 0) {
              console.log(`Found ${matchingTasks.length} tasks matching standard task ${standardTask.task_number}`);
              
              // Validate each task's status and priority
              const validatedTasks = matchingTasks.map(task => ({
                ...task,
                status: validateTaskStatus(task.status),
                priority: validatePriority(task.priority)
              })) as Task[];
              
              allTasks = [...allTasks, ...validatedTasks];
            }
          }
        }
        
        // If no tasks found via standard tasks, use direct task workstation links as fallback
        if (allTasks.length === 0) {
          console.log("No tasks found via standard tasks, checking direct task links");
          
          // Get direct task workstation links
          const { data: taskLinks, error: taskLinksError } = await supabase
            .from('task_workstation_links')
            .select('task_id')
            .eq('workstation_id', workstationInfo.id);
            
          if (taskLinksError) {
            console.error("Error fetching task workstation links:", taskLinksError);
            throw taskLinksError;
          }
          
          if (taskLinks && taskLinks.length > 0) {
            console.log("Found direct task links:", taskLinks.length);
            
            const taskIds = taskLinks.map(link => link.task_id);
            
            // Get the actual tasks
            const { data: linkedTasks, error: linkedTasksError } = await supabase
              .from('tasks')
              .select('*')
              .in('id', taskIds)
              .neq('status', 'COMPLETED');
              
            if (linkedTasksError) {
              console.error("Error fetching linked tasks:", linkedTasksError);
              throw linkedTasksError;
            }
            
            if (linkedTasks && linkedTasks.length > 0) {
              console.log("Found linked tasks:", linkedTasks.length);
              
              // Validate each task's status and priority
              const validatedTasks = linkedTasks.map(task => ({
                ...task,
                status: validateTaskStatus(task.status),
                priority: validatePriority(task.priority)
              })) as Task[];
              
              allTasks = [...allTasks, ...validatedTasks];
            }
          }
        }
        
        // Final fallback: check if tasks have workstation name directly
        if (allTasks.length === 0) {
          console.log("No tasks found via links, checking tasks with workstation name directly");
          
          const { data: directTasks, error: directTasksError } = await supabase
            .from('tasks')
            .select('*')
            .ilike('workstation', workstationInfo.name)
            .neq('status', 'COMPLETED');
            
          if (directTasksError) {
            console.error("Error fetching direct tasks:", directTasksError);
            throw directTasksError;
          }
          
          if (directTasks && directTasks.length > 0) {
            console.log("Found tasks with workstation directly:", directTasks.length);
            
            // Validate each task's status and priority
            const validatedTasks = directTasks.map(task => ({
              ...task,
              status: validateTaskStatus(task.status),
              priority: validatePriority(task.priority)
            })) as Task[];
            
            allTasks = [...allTasks, ...validatedTasks];
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
        setLoading(false);
      } catch (error: any) {
        console.error('Error fetching workstation tasks:', error);
        toast({
          title: "Error",
          description: `Failed to load tasks: ${error.message}`,
          variant: "destructive"
        });
        setLoading(false);
      }
    };

    if (workstationInfo) {
      fetchTasks();
    }
  }, [workstationInfo, toast]);

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
      
      // Get completed tasks for today's stats
      let completedToday = 0;
      
      if (workstationInfo) {
        const { data: completedTasks } = await supabase
          .from('tasks')
          .select('*')
          .ilike('workstation', workstationInfo.name)
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
        inProgress: tasksData.filter(t => t.status === 'IN_PROGRESS').length,
        dueToday
      });
    } catch (error) {
      console.error('Error updating task stats:', error);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    if (!currentEmployee) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to complete tasks.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Update task in Supabase
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'COMPLETED',
          completed_by: currentEmployee.id,
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);
      
      if (error) throw error;
      
      // Update local state
      setTasks(tasks.filter(task => task.id !== taskId));
      
      // Update stats
      setStats(prev => ({
        ...prev,
        completedToday: prev.completedToday + 1,
        totalTasks: prev.totalTasks - 1,
        inProgress: tasks.find(t => t.id === taskId)?.status === 'IN_PROGRESS' 
          ? prev.inProgress - 1 
          : prev.inProgress
      }));
      
      toast({
        title: "Task completed",
        description: "Task has been marked as completed."
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to complete task: ${error.message}`,
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
              {workstationInfo?.name || currentEmployee?.name} Workstation
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
                <p className="text-sm text-gray-500">Total Open Tasks</p>
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
              <div className="bg-purple-100 p-3 rounded-full mr-4">
                <ArrowUpRight className="text-purple-700 h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <h3 className="text-2xl font-bold">{stats.inProgress}</h3>
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
        </div>

        {/* Tasks Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Clock className="mr-2 h-5 w-5" /> Pending Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-8">
                <Check className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium">All caught up!</h3>
                <p className="text-muted-foreground">No pending tasks for this workstation.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => {
                      const isOverdue = new Date(task.due_date) < new Date();
                      const isDueToday = new Date(task.due_date).toDateString() === new Date().toDateString();
                      
                      return (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">{task.project_name}</TableCell>
                          <TableCell>{task.title}</TableCell>
                          <TableCell>
                            <span className={`${
                              isOverdue ? 'text-red-600 font-semibold' : 
                              isDueToday ? 'text-amber-600 font-semibold' : ''
                            }`}>
                              {format(new Date(task.due_date), 'MMM d, yyyy')}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                              task.priority === 'High' || task.priority === 'Urgent' 
                                ? 'bg-red-100 text-red-800' 
                                : task.priority === 'Medium'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {task.priority}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                              task.status === 'IN_PROGRESS' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {task.status === 'IN_PROGRESS' ? 'In Progress' : 'To Do'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              onClick={() => handleCompleteTask(task.id)}
                              className="bg-green-500 hover:bg-green-600"
                              size="sm"
                            >
                              <Check className="mr-1 h-4 w-4" /> Complete
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkstationDashboard;
