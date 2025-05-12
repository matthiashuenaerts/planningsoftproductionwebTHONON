import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TaskList from './TaskList';
import { taskService, Task, projectService } from '@/services/dataService';
import { standardTasksService } from '@/services/standardTasksService';
import { useToast } from '@/hooks/use-toast';
import { Package, LayoutGrid, Warehouse, Wrench, Scissors, Layers, Check, Monitor, Truck, Flag, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/context/AuthContext';
import { Progress } from '@/components/ui/progress';

// Helper function to validate and convert task status
const validateTaskStatus = (status: string): "TODO" | "IN_PROGRESS" | "COMPLETED" => {
  if (status === "TODO" || status === "IN_PROGRESS" || status === "COMPLETED") {
    return status;
  }
  // Default to TODO if invalid status
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

interface WorkstationViewProps {
  workstationId: string;
  onBack?: () => void; // Make onBack optional
}

const WorkstationView: React.FC<WorkstationViewProps> = ({ workstationId, onBack }) => {
  const [workstation, setWorkstation] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [assigneeNames, setAssigneeNames] = useState<Record<string, string>>({});
  const [progressValues, setProgressValues] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const { currentEmployee } = useAuth();

  // Add a clock that updates every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      
      // Update progress for in-progress tasks
      const updatedProgress: Record<string, number> = {};
      tasks.forEach(task => {
        if (task.status === 'IN_PROGRESS') {
          updatedProgress[task.id] = getTaskProgress(task);
        }
      });
      
      if (Object.keys(updatedProgress).length > 0) {
        setProgressValues(prev => ({...prev, ...updatedProgress}));
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [tasks]);

  useEffect(() => {
    const fetchWorkstationData = async () => {
      try {
        setLoading(true);
        
        // First fetch the workstation name
        const { data: workstationData, error: workstationError } = await supabase
          .from('workstations')
          .select('name')
          .eq('id', workstationId)
          .single();
        
        if (workstationError) throw workstationError;
        setWorkstation(workstationData?.name || "");
        
        // Step 1: Get all standard tasks linked to this workstation
        const { data: standardTaskLinks, error: linksError } = await supabase
          .from('standard_task_workstation_links')
          .select('standard_task_id')
          .eq('workstation_id', workstationId);
          
        if (linksError) throw linksError;
        
        let matchedTasks: Task[] = [];
        
        // If we have standard task links
        if (standardTaskLinks && standardTaskLinks.length > 0) {
          // Get the standard task details for these linked task IDs
          const standardTaskIds = standardTaskLinks.map(link => link.standard_task_id);
          
          // For each standard task ID, fetch the standard task details
          for (const standardTaskId of standardTaskIds) {
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
            const { data: activeTasks, error: tasksError } = await supabase
              .from('tasks')
              .select('*')
              .not('status', 'eq', 'COMPLETED')
              .or(`title.ilike.%${standardTask.task_number}%,title.ilike.%${standardTask.task_name}%`);
            
            if (tasksError) {
              console.error("Error fetching matching tasks:", tasksError);
              continue;
            }
            
            if (activeTasks && activeTasks.length > 0) {
              // Get project info for these tasks
              const tasksWithProjectInfo = await Promise.all(
                activeTasks.map(async (task) => {
                  try {
                    const { data: phaseData, error: phaseError } = await supabase
                      .from('phases')
                      .select('project_id, name')
                      .eq('id', task.phase_id)
                      .single();
                    
                    if (phaseError) throw phaseError;
                    
                    const { data: projectData, error: projectError } = await supabase
                      .from('projects')
                      .select('name')
                      .eq('id', phaseData.project_id)
                      .single();
                    
                    if (projectError) throw projectError;
                    
                    // Ensure the task status conforms to the expected type
                    const status = validateTaskStatus(task.status);
                    const priority = validatePriority(task.priority);
                    
                    // Return the task with the expected shape
                    return {
                      id: task.id,
                      phase_id: task.phase_id,
                      assignee_id: task.assignee_id,
                      title: task.title,
                      description: task.description || null,
                      workstation: task.workstation,
                      status: status,
                      priority: priority,
                      due_date: task.due_date,
                      created_at: task.created_at,
                      updated_at: task.updated_at,
                      project_name: projectData.name,
                      completed_at: task.completed_at,
                      completed_by: task.completed_by
                    } as Task;
                  } catch (error) {
                    console.error('Error fetching project info for task:', error);
                    return null;
                  }
                })
              );
              
              // Filter out any null tasks (from errors)
              const validTasks = tasksWithProjectInfo.filter(task => task !== null) as Task[];
              matchedTasks = [...matchedTasks, ...validTasks];
            }
          }
        }
        
        // If no tasks found via standard tasks, try direct task links
        if (matchedTasks.length === 0) {
          // Get task IDs linked to this workstation
          const { data: taskLinks, error: taskLinksError } = await supabase
            .from('task_workstation_links')
            .select('task_id')
            .eq('workstation_id', workstationId);
            
          if (taskLinksError) throw taskLinksError;
          
          if (taskLinks && taskLinks.length > 0) {
            const taskIds = taskLinks.map(link => link.task_id);
            
            // Get the actual tasks
            const { data: linkedTasks, error: linkedTasksError } = await supabase
              .from('tasks')
              .select('*')
              .in('id', taskIds)
              .neq('status', 'COMPLETED');
              
            if (linkedTasksError) throw linkedTasksError;
            
            if (linkedTasks && linkedTasks.length > 0) {
              // Process with project details
              const tasksWithDetails = await Promise.all(
                linkedTasks.map(async (task) => {
                  try {
                    // Get the phase to get the project_id
                    const { data: phaseData, error: phaseError } = await supabase
                      .from('phases')
                      .select('project_id, name')
                      .eq('id', task.phase_id)
                      .single();
                    
                    if (phaseError) throw phaseError;
                    
                    // Get the project name
                    const { data: projectData, error: projectError } = await supabase
                      .from('projects')
                      .select('name')
                      .eq('id', phaseData.project_id)
                      .single();
                    
                    if (projectError) throw projectError;
                    
                    return {
                      ...task,
                      project_name: projectData.name
                    } as Task;
                  } catch (error) {
                    console.error('Error fetching project info:', error);
                    return {
                      ...task,
                      project_name: 'Unknown Project'
                    } as Task;
                  }
                })
              );
              
              matchedTasks = [...matchedTasks, ...tasksWithDetails];
            }
          }
        }
        
        // Final fallback: If still no tasks, check direct workstation name in tasks
        if (matchedTasks.length === 0) {
          const workstationTasks = await taskService.getByWorkstation(workstationData?.name || "");
          
          // Filter out completed tasks
          const incompleteTasks = workstationTasks.filter(
            task => task.status !== 'COMPLETED'
          );
          
          // Fetch project information for each task's phase
          const tasksWithProjectInfo = await Promise.all(
            incompleteTasks.map(async (task) => {
              try {
                // Get the phase to get the project_id
                const { data: phaseData, error: phaseError } = await supabase
                  .from('phases')
                  .select('project_id, name')
                  .eq('id', task.phase_id)
                  .single();
                
                if (phaseError) throw phaseError;
                
                // Get the project name
                const { data: projectData, error: projectError } = await supabase
                  .from('projects')
                  .select('name')
                  .eq('id', phaseData.project_id)
                  .single();
                
                if (projectError) throw projectError;
                
                // Append project name to task
                return {
                  ...task,
                  project_name: projectData.name
                };
              } catch (error) {
                console.error('Error fetching project info for task:', error);
                return task;
              }
            })
          );
          
          matchedTasks = [...matchedTasks, ...tasksWithProjectInfo];
        }
        
        // Remove any duplicate tasks
        const uniqueTasks = Array.from(
          new Map(matchedTasks.map(task => [task.id, task])).values()
        );
        
        // Add code to fetch assignee names
        const assigneeIds = matchedTasks
          .filter(task => task.assignee_id)
          .map(task => task.assignee_id);
          
        // Remove duplicates
        const uniqueAssigneeIds = [...new Set(assigneeIds)];
        
        if (uniqueAssigneeIds.length > 0) {
          const namesMap: Record<string, string> = {};
          
          // Fetch employee names for assignees
          for (const assigneeId of uniqueAssigneeIds) {
            if (!assigneeId) continue;
            
            try {
              const { data, error } = await supabase
                .from('employees')
                .select('name')
                .eq('id', assigneeId)
                .single();
                
              if (error) throw error;
              
              if (data) {
                namesMap[assigneeId] = data.name;
              }
            } catch (error) {
              console.error(`Error fetching employee name for ID ${assigneeId}:`, error);
              namesMap[assigneeId] = 'Unknown';
            }
          }
          
          setAssigneeNames(namesMap);
        }
        
        setTasks(uniqueTasks);
      } catch (error: any) {
        console.error('Error fetching workstation data:', error);
        toast({
          title: "Error",
          description: `Failed to load workstation tasks: ${error.message}`,
          variant: "destructive"
        });
        // Setting empty tasks to prevent UI errors
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkstationData();
  }, [workstationId, toast]);

  // Function to handle completing a task
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
      // Update task with completion information
      await taskService.update(taskId, { 
        status: 'COMPLETED',
        completed_by: currentEmployee.id,
        completed_at: new Date().toISOString(),
        status_changed_at: new Date().toISOString()
      });
      
      // Update local state to remove the completed task
      setTasks(tasks.filter(task => task.id !== taskId));
      
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

  // Helper to get progress value for in-progress tasks
  const getTaskProgress = (task: Task): number => {
    // Only return progress for tasks explicitly marked as IN_PROGRESS
    if (task.status === 'IN_PROGRESS') {
      const now = new Date();
      
      // Use status_changed_at if available, otherwise fall back to updated_at
      const statusChangedAt = task.status_changed_at ? new Date(task.status_changed_at) : 
                              task.updated_at ? new Date(task.updated_at) : null;
      
      // If we don't know when the task was started, use a default progress (10%)
      if (!statusChangedAt) {
        return 10;
      }
      
      // If status_changed_at is somehow in the future, default to 10%
      if (statusChangedAt > now) {
        return 10;
      }
      
      // Extract task number from title to find the corresponding standard task
      const extractTaskNumber = (title: string): string | null => {
        const match = title.match(/^(\d{2})(?:\s*[-:]\s*|\s+)/);
        return match ? match[1] : null;
      };
      
      const taskNumber = extractTaskNumber(task.title);
      let taskDurationMs;
      
      // Attempt to get the standard task duration
      if (taskNumber) {
        // Use an immediately invoked async function to get the standard task
        (async () => {
          try {
            const standardTask = await standardTasksService.getByTaskNumber(taskNumber);
            if (standardTask && standardTask.time_coefficient > 0) {
              // We found a standard task with a valid time coefficient
              // This will be used in the next render cycle
              taskDurationMs = standardTask.time_coefficient * 60 * 1000;
            }
          } catch (error) {
            console.error("Error fetching standard task:", error);
          }
        })();
      }
      
      // For now, use a fixed duration until we implement a state to store the fetched durations
      // In a production app, we'd store these in state or context
      taskDurationMs = 48 * 60 * 60 * 1000; // 48 hours default
      
      // Calculate elapsed time since the task was marked as IN_PROGRESS
      const elapsedTime = now.getTime() - statusChangedAt.getTime();
      
      // Calculate progress percentage based on elapsed time and task duration
      const progressPercentage = Math.min(100, Math.floor((elapsedTime / taskDurationMs) * 100));
      
      // Ensure we show at least 10% progress for visibility
      return Math.max(10, progressPercentage);
    }
    return 0;
  };

  // Function to sort tasks with IN_PROGRESS first
  const sortTasks = (taskList: Task[]) => {
    return [...taskList].sort((a, b) => {
      // First prioritize IN_PROGRESS tasks
      if (a.status === 'IN_PROGRESS' && b.status !== 'IN_PROGRESS') return -1;
      if (a.status !== 'IN_PROGRESS' && b.status === 'IN_PROGRESS') return 1;
      
      // Then sort by priority
      const priorityOrder = { 'Urgent': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
      return (priorityOrder[a.priority] || 999) - (priorityOrder[b.priority] || 999);
    });
  };

  const getWorkstationIcon = (name: string) => {
    // Return appropriate icon based on workstation name
    const lowerCaseName = name.toLowerCase();
    if (lowerCaseName.includes('productievoor')) return <Package size={24} />;
    if (lowerCaseName.includes('productiestur')) return <LayoutGrid size={24} />;
    if (lowerCaseName.includes('stock') || lowerCaseName.includes('logistiek')) return <Warehouse size={24} />;
    if (lowerCaseName.includes('opdeelzaag 1')) return <Wrench size={24} />;
    if (lowerCaseName.includes('opdeelzaag 2')) return <Scissors size={24} />;
    if (lowerCaseName.includes('afplakken')) return <Layers size={24} />;
    if (lowerCaseName.includes('cnc')) return <Wrench size={24} />;
    if (lowerCaseName.includes('controle/opkuis')) return <Check size={24} />;
    if (lowerCaseName.includes('montage')) return <Layers size={24} />;
    if (lowerCaseName.includes('afwerking')) return <Wrench size={24} />;
    if (lowerCaseName.includes('controle e+s')) return <Monitor size={24} />;
    if (lowerCaseName.includes('eindcontrole')) return <Check size={24} />;
    if (lowerCaseName.includes('bufferzone')) return <Warehouse size={24} />;
    if (lowerCaseName.includes('laden') || lowerCaseName.includes('vrachtwagen')) return <Truck size={24} />;
    if (lowerCaseName.includes('plaatsen')) return <Package size={24} />;
    if (lowerCaseName.includes('afsluiten')) return <Flag size={24} />;
    
    // Default icon
    return <Wrench size={24} />;
  };

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
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${getWorkstationColor(workstation)}`}>
              {getWorkstationIcon(workstation)}
            </div>
            <CardTitle>{workstation}</CardTitle>
          </div>
          <div className="text-lg font-mono font-medium">
            <Clock className="inline-block mr-2 h-5 w-5 text-primary" />
            {currentTime.toLocaleTimeString()}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>
            {tasks.length === 0 ? (
              <div className="text-center p-8">
                <Check className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium mb-2">All caught up!</h3>
                <p className="text-muted-foreground">No pending tasks for this workstation.</p>
              </div>
            ) : (
              <div className="space-y-4 mt-2">
                {sortTasks(tasks).map((task) => {
                  // Get current progress value from state or calculate it
                  const progressValue = progressValues[task.id] || getTaskProgress(task);
                  
                  return (
                    <Card key={task.id} className="overflow-hidden relative">
                      <div className="border-l-4 border-l-blue-500 p-4 relative z-10">
                        {task.status === 'IN_PROGRESS' && (
                          <div className="absolute inset-0 left-0 top-0 bottom-0 z-0">
                            <div 
                              className="h-full bg-green-50 dark:bg-green-900/20" 
                              style={{ width: `${progressValue}%` }}
                            />
                          </div>
                        )}
                        <div className="relative z-10">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-lg">
                              {task.project_name ? `${task.project_name} - ${task.title}` : task.title}
                            </h4>
                            <div className="flex items-center gap-2">
                              <div className={`px-2 py-1 rounded text-xs font-medium ${
                                task.priority === 'High' || task.priority === 'Urgent' 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {task.priority}
                              </div>
                            </div>
                          </div>
                          
                          {/* Show assignee for IN_PROGRESS tasks */}
                          {task.status === 'IN_PROGRESS' && task.assignee_id && (
                            <div className="mb-2 text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded inline-flex items-center">
                              <span className="font-medium mr-1">Assigned to:</span> 
                              {assigneeNames[task.assignee_id] || 'Unknown user'}
                            </div>
                          )}
                          
                          {task.description && (
                            <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                          )}
                          
                          {/* Add visible progress bar for IN_PROGRESS tasks */}
                          {task.status === 'IN_PROGRESS' && (
                            <div className="mb-4">
                              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>Progress</span>
                                <span>{progressValue}%</span>
                              </div>
                              <Progress 
                                value={progressValue} 
                                className="h-2" 
                                indicatorClassName={progressValue >= 100 ? "bg-green-500" : ""}
                              />
                            </div>
                          )}
                          
                          <div className="flex justify-between items-center mt-4">
                            <div className="text-sm text-muted-foreground">
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </div>
                            <Button 
                              onClick={() => handleCompleteTask(task.id)}
                              className="bg-green-500 hover:bg-green-600"
                              size="sm"
                            >
                              <Check className="mr-1 h-4 w-4" /> Complete Task
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkstationView;
