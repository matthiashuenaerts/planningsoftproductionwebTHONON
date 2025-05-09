
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

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchTasks = async () => {
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
        
        // First check if we have a workstation name directly on the employee
        let workstationId: string | null = null;
        
        if (currentEmployee.workstation) {
          // Get workstation ID from the name
          const { data: workstationData, error: workstationError } = await supabase
            .from('workstations')
            .select('id')
            .eq('name', currentEmployee.workstation)
            .single();
            
          if (workstationError) {
            console.error("Error fetching workstation by name:", workstationError);
          } else if (workstationData) {
            workstationId = workstationData.id;
          }
        }
        
        // If no workstation found from name, try to get it from employee_workstation_links
        if (!workstationId) {
          const { data: workstationLinks, error: linksError } = await supabase
            .from('employee_workstation_links')
            .select('workstation_id')
            .eq('employee_id', currentEmployee.id);
            
          if (linksError) {
            console.error("Error fetching employee workstation links:", linksError);
          } else if (workstationLinks && workstationLinks.length > 0) {
            workstationId = workstationLinks[0].workstation_id;
          }
        }
        
        if (!workstationId) {
          toast({
            title: "Error",
            description: "No workstation assigned to this account",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
        
        // Fetch the workstation name for display
        const { data: workstationData } = await supabase
          .from('workstations')
          .select('name')
          .eq('id', workstationId)
          .single();
        
        const workstationName = workstationData?.name || "Unknown workstation";
        
        // Approach 1: Try standard task workstation links first
        const { data: standardTaskLinks, error: standardLinksError } = await supabase
          .from('standard_task_workstation_links')
          .select('standard_task_id')
          .eq('workstation_id', workstationId);
          
        if (!standardLinksError && standardTaskLinks && standardTaskLinks.length > 0) {
          // Get standard tasks
          const standardTaskIds = standardTaskLinks.map(link => link.standard_task_id);
          const { data: standardTasks } = await supabase
            .from('standard_tasks')
            .select('*')
            .in('id', standardTaskIds);
          
          if (standardTasks && standardTasks.length > 0) {
            // Find tasks that match these standard tasks
            let allMatchingTasks: Task[] = [];
            
            for (const stdTask of standardTasks) {
              // Search for tasks that contain this standard task number or name
              const { data: matchingTasks, error: tasksError } = await supabase
                .from('tasks')
                .select('*')
                .not('status', 'eq', 'COMPLETED')
                .or(`title.ilike.%${stdTask.task_number}%,title.ilike.%${stdTask.task_name}%`);
              
              if (!tasksError && matchingTasks && matchingTasks.length > 0) {
                // Get project info for each task
                const tasksWithDetails = await Promise.all(matchingTasks.map(async (task) => {
                  try {
                    // Get phase to find project
                    const { data: phaseData } = await supabase
                      .from('phases')
                      .select('project_id, name')
                      .eq('id', task.phase_id)
                      .single();
                    
                    // Get project name
                    const { data: projectData } = await supabase
                      .from('projects')
                      .select('name')
                      .eq('id', phaseData?.project_id)
                      .maybeSingle();
                    
                    return {
                      ...task,
                      project_name: projectData?.name || 'Unknown Project',
                      status: task.status as "TODO" | "IN_PROGRESS" | "COMPLETED",
                      priority: task.priority as "Low" | "Medium" | "High" | "Urgent"
                    } as Task;
                  } catch (error) {
                    console.error('Error getting project info:', error);
                    return {
                      ...task,
                      project_name: 'Unknown Project',
                      status: task.status as "TODO" | "IN_PROGRESS" | "COMPLETED",
                      priority: task.priority as "Low" | "Medium" | "High" | "Urgent"
                    } as Task;
                  }
                }));
                
                allMatchingTasks = [...allMatchingTasks, ...tasksWithDetails];
              }
            }
            
            // Remove duplicates
            const uniqueTasks = Array.from(
              new Map(allMatchingTasks.map(task => [task.id, task])).values()
            );
            
            setTasks(uniqueTasks);
            
            // Calculate stats
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const dueToday = uniqueTasks.filter(task => {
              const taskDate = new Date(task.due_date);
              taskDate.setHours(0, 0, 0, 0);
              return taskDate.getTime() === today.getTime();
            }).length;
            
            setStats({
              totalTasks: uniqueTasks.length,
              completedToday: 0, // Need to fetch this separately
              inProgress: uniqueTasks.filter(t => t.status === 'IN_PROGRESS').length,
              dueToday
            });
            
            setLoading(false);
            return;
          }
        }
        
        // Approach 2: Fall back to direct task workstation links
        const { data: taskLinks, error: taskLinksError } = await supabase
          .from('task_workstation_links')
          .select('task_id')
          .eq('workstation_id', workstationId);
          
        if (taskLinksError) throw taskLinksError;
        
        if (!taskLinks || taskLinks.length === 0) {
          // As a last resort, try the workstation field on tasks
          const { data: directTasks, error: directTasksError } = await supabase
            .from('tasks')
            .select('*')
            .eq('workstation', workstationName)
            .neq('status', 'COMPLETED');
            
          if (!directTasksError && directTasks && directTasks.length > 0) {
            // Get project info
            const tasksWithDetails = await Promise.all(directTasks.map(async (task) => {
              try {
                const { data: phaseData } = await supabase
                  .from('phases')
                  .select('project_id, name')
                  .eq('id', task.phase_id)
                  .maybeSingle();
                
                const { data: projectData } = await supabase
                  .from('projects')
                  .select('name')
                  .eq('id', phaseData?.project_id)
                  .maybeSingle();
                
                return {
                  ...task,
                  project_name: projectData?.name || 'Unknown Project',
                  status: task.status as "TODO" | "IN_PROGRESS" | "COMPLETED",
                  priority: task.priority as "Low" | "Medium" | "High" | "Urgent"
                } as Task;
              } catch (error) {
                return {
                  ...task,
                  project_name: 'Unknown Project',
                  status: task.status as "TODO" | "IN_PROGRESS" | "COMPLETED",
                  priority: task.priority as "Low" | "Medium" | "High" | "Urgent"
                } as Task;
              }
            }));
            
            setTasks(tasksWithDetails);
            
            // Calculate stats for direct tasks
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const dueToday = tasksWithDetails.filter(task => {
              const taskDate = new Date(task.due_date);
              taskDate.setHours(0, 0, 0, 0);
              return taskDate.getTime() === today.getTime();
            }).length;
            
            setStats({
              totalTasks: tasksWithDetails.length,
              completedToday: 0,
              inProgress: tasksWithDetails.filter(t => t.status === 'IN_PROGRESS').length,
              dueToday
            });
            
            setLoading(false);
            return;
          }
          
          // If we get here, no tasks were found
          setTasks([]);
          setStats({
            totalTasks: 0,
            completedToday: 0,
            inProgress: 0,
            dueToday: 0
          });
          setLoading(false);
          return;
        }
        
        // Get tasks from links
        const taskIds = taskLinks.map(link => link.task_id);
        
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .in('id', taskIds)
          .neq('status', 'COMPLETED')
          .order('due_date', { ascending: true });
          
        if (tasksError) throw tasksError;
        
        // Get project info for each task
        const tasksWithDetails = await Promise.all((tasksData || []).map(async (task) => {
          try {
            // Get phase to find project
            const { data: phaseData } = await supabase
              .from('phases')
              .select('project_id, name')
              .eq('id', task.phase_id)
              .maybeSingle();
              
            // Get project name
            const { data: projectData } = await supabase
              .from('projects')
              .select('name')
              .eq('id', phaseData?.project_id)
              .maybeSingle();
              
            return {
              ...task,
              project_name: projectData?.name || 'Unknown Project',
              phase_name: phaseData?.name || 'Unknown Phase',
              status: task.status as "TODO" | "IN_PROGRESS" | "COMPLETED",
              priority: task.priority as "Low" | "Medium" | "High" | "Urgent"
            } as Task;
          } catch (error) {
            console.error('Error fetching project info:', error);
            return {
              ...task,
              project_name: 'Unknown Project',
              status: task.status as "TODO" | "IN_PROGRESS" | "COMPLETED",
              priority: task.priority as "Low" | "Medium" | "High" | "Urgent"
            } as Task;
          }
        }));
        
        setTasks(tasksWithDetails);

        // Calculate stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get completed tasks for today's stats
        const { data: completedToday, error: completedError } = await supabase
          .from('tasks')
          .select('*')
          .in('id', taskIds)
          .eq('status', 'COMPLETED')
          .gte('completed_at', today.toISOString());
          
        if (completedError) throw completedError;

        // Calculate due today
        const dueToday = tasksWithDetails.filter(task => {
          const taskDate = new Date(task.due_date);
          taskDate.setHours(0, 0, 0, 0);
          return taskDate.getTime() === today.getTime();
        }).length;

        setStats({
          totalTasks: tasksWithDetails.length,
          completedToday: completedToday?.length || 0,
          inProgress: tasksWithDetails.filter(t => t.status === 'IN_PROGRESS').length,
          dueToday
        });
      } catch (error: any) {
        console.error('Error fetching workstation tasks:', error);
        toast({
          title: "Error",
          description: `Failed to load tasks: ${error.message}`,
          variant: "destructive"
        });
        
        // Set empty state to prevent UI errors
        setTasks([]);
        setStats({
          totalTasks: 0,
          completedToday: 0,
          inProgress: 0,
          dueToday: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [currentEmployee, toast]);

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
              {currentEmployee?.workstation || "Workstation Dashboard"} 
            </h1>
            <div className="flex items-center space-x-2 text-gray-600 text-lg">
              <span>
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
              <span className="text-gray-400">|</span>
              <div className="flex items-center text-blue-600 font-medium">
                <Clock className="h-5 w-5 mr-1" />
                <span>{currentTime.toLocaleTimeString()}</span>
              </div>
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
