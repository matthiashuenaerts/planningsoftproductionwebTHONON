import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, PlayCircle, AlertCircle, Clock3 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Task } from '@/services/workstationService';
import { standardTasksService } from '@/services/standardTasksService';
import { supabase } from '@/integrations/supabase/client';

interface WorkstationInfo {
  id: string;
  name: string;
  description: string | null;
}

const PersonalTasks: React.FC = () => {
  const { currentEmployee } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employeeWorkstations, setEmployeeWorkstations] = useState<WorkstationInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const employeeId = currentEmployee?.id;

  useEffect(() => {
    if (!employeeId) {
      toast({
        title: "Error",
        description: "Employee ID not found. Please log in again.",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        await loadWorkstations();
        await loadTasks(employeeId);
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Error",
          description: "Failed to load tasks. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [employeeId, toast]);

  const loadWorkstations = async () => {
    try {
      // Get employee's assigned workstations using direct Supabase query
      const { data: links, error: linksError } = await supabase
        .from('employee_workstation_links')
        .select('workstation_id')
        .eq('employee_id', employeeId);
      
      if (linksError) throw linksError;
      
      if (links && links.length > 0) {
        const workstationIds = links.map(link => link.workstation_id);
        
        // Get workstation details
        const { data: workstations, error: workstationsError } = await supabase
          .from('workstations')
          .select('*')
          .in('id', workstationIds);
        
        if (workstationsError) throw workstationsError;
        
        setEmployeeWorkstations(workstations);
      }
    } catch (error) {
      console.error('Error loading employee workstations:', error);
    }
  };

  const loadTasks = async (employeeId: string) => {
    try {
      // Fetch tasks for all assigned workstations
      let allTasks: Task[] = [];
      for (const workstation of employeeWorkstations) {
        const { data: workstationTasks, error: tasksError } = await supabase
          .from('tasks')
          .select(`
            id,
            title,
            description,
            status,
            priority,
            due_date,
            workstation,
            phase:phase_id(id, name, project_id),
            project:phase!inner(id:project_id, name:projects!inner(name), client:projects!inner(client))
          `)
          .eq('workstation', workstation.id)
          .order('due_date');

        if (tasksError) throw tasksError;

        if (workstationTasks) {
          allTasks = allTasks.concat(workstationTasks.map((task: any) => ({
            ...task,
            project: {
              id: task.project?.id || '',
              name: task.project?.name || 'Unknown Project',
              client: task.project?.client || 'Unknown Client'
            }
          })));
        }
      }

      // Get all standard tasks to check limit phases
      const standardTasks = await standardTasksService.getAll();

      // Check limit phases for each task
      const tasksWithLimitPhaseInfo = await Promise.all(allTasks.map(async (task) => {
        if (!task.phase) return task; // Skip if no phase info

        // For each task, find its corresponding standard task by name or identifier
        const standardTask = standardTasks.find(st =>
          st.task_name.toLowerCase().includes(task.title.toLowerCase()) ||
          st.task_number.includes(task.title)
        );

        if (standardTask) {
          // Check if this task has limit phases
          const limitPhases = await standardTasksService.getLimitPhases(standardTask.id);

          // If it has limit phases, check if all required phases are completed
          if (limitPhases.length > 0) {
            // Get project phases
            const projectPhases = await supabase
              .from('phases')
              .select('*')
              .eq('project_id', task.phase.project_id)
              .then(res => res.data || []);

            // Find phases that are not completed
            const incompletePhases = limitPhases.filter(limitPhase => {
              const projectPhase = projectPhases.find(pp => pp.name === limitPhase.phase_name);
              return !projectPhase || (projectPhase as any).progress < 100;
            });

            return {
              ...task,
              limitPhasesComplete: incompletePhases.length === 0,
              incompletePhases: incompletePhases.map(p => p.phase_name)
            };
          }
        }

        // If no standard task match or no limit phases, consider it ready
        return {
          ...task,
          limitPhasesComplete: true,
          incompletePhases: []
        };
      }));

      setTasks(tasksWithLimitPhaseInfo);
    } catch (error) {
      console.error("Error loading tasks:", error);
      throw error;
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      // Update local state
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );

      toast({
        title: "Success",
        description: `Task marked as ${newStatus.toLowerCase()}`,
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive"
      });
    }
  };

  const getWorkstationNameById = (workstationId: string) => {
    const workstation = employeeWorkstations.find(w => w.id === workstationId);
    return workstation?.name || 'Unknown Workstation';
  };

  // Filter tasks by status
  const pendingTasks = tasks.filter(t => t.status === 'TODO' && t.limitPhasesComplete);
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS');
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
  const onHoldTasks = tasks.filter(t => t.status === 'TODO' && !t.limitPhasesComplete);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Personal Tasks</h2>
      {employeeWorkstations.length === 0 ? (
        <div className="text-center p-8 text-muted-foreground">
          No workstations assigned to you. Contact your administrator.
        </div>
      ) : (
        <>
          {pendingTasks.length === 0 && inProgressTasks.length === 0 && completedTasks.length === 0 && onHoldTasks.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No tasks assigned to you.
            </div>
          ) : (
            <>
              {pendingTasks.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">To Do</h3>
                  <div className="space-y-2">
                    {pendingTasks.map((task) => (
                      <Card key={task.id}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-base">{task.title}</CardTitle>
                              <CardDescription className="text-xs">
                                Project: {task.project?.name} • Client: {task.project?.client}
                              </CardDescription>
                            </div>
                            <Badge variant={
                              task.priority === 'HIGH' ? 'destructive' :
                                task.priority === 'MEDIUM' ? 'default' : 'secondary'
                            }>
                              {task.priority}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="py-2">
                          {task.description && <p className="text-sm">{task.description}</p>}
                          <div className="flex items-center gap-2 mt-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          </div>
                        </CardContent>
                        <CardFooter className="pt-2">
                          <div className="flex gap-2 w-full">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center"
                              onClick={() => handleUpdateTaskStatus(task.id, 'IN_PROGRESS')}
                            >
                              <PlayCircle className="h-4 w-4 mr-1" /> Start
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {inProgressTasks.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">In Progress</h3>
                  <div className="space-y-2">
                    {inProgressTasks.map((task) => (
                      <Card key={task.id}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-base">{task.title}</CardTitle>
                              <CardDescription className="text-xs">
                                Project: {task.project?.name} • Client: {task.project?.client}
                              </CardDescription>
                            </div>
                            <Badge variant={
                              task.priority === 'HIGH' ? 'destructive' :
                                task.priority === 'MEDIUM' ? 'default' : 'secondary'
                            }>
                              {task.priority}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="py-2">
                          {task.description && <p className="text-sm">{task.description}</p>}
                          <div className="flex items-center gap-2 mt-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          </div>
                        </CardContent>
                        <CardFooter className="pt-2">
                          <div className="flex gap-2 w-full">
                            <Button
                              variant="default"
                              size="sm"
                              className="flex items-center"
                              onClick={() => handleUpdateTaskStatus(task.id, 'COMPLETED')}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" /> Complete
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {completedTasks.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">Completed</h3>
                  <div className="space-y-2">
                    {completedTasks.map((task) => (
                      <Card key={task.id}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-base">{task.title}</CardTitle>
                              <CardDescription className="text-xs">
                                Project: {task.project?.name} • Client: {task.project?.client}
                              </CardDescription>
                            </div>
                            <Badge variant={
                              task.priority === 'HIGH' ? 'destructive' :
                                task.priority === 'MEDIUM' ? 'default' : 'secondary'
                            }>
                              {task.priority}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="py-2">
                          {task.description && <p className="text-sm">{task.description}</p>}
                          <div className="flex items-center gap-2 mt-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          </div>
                        </CardContent>
                        <CardFooter className="pt-2">
                          <Badge variant="outline">
                            Completed
                          </Badge>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {onHoldTasks.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">On Hold</h3>
                  <div className="space-y-2">
                    {onHoldTasks.map((task) => (
                      <Card key={task.id}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-base">{task.title}</CardTitle>
                              <CardDescription className="text-xs">
                                Project: {task.project?.name} • Client: {task.project?.client}
                              </CardDescription>
                            </div>
                            <Badge variant={
                              task.priority === 'HIGH' ? 'destructive' :
                                task.priority === 'MEDIUM' ? 'default' : 'secondary'
                            }>
                              {task.priority}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="py-2">
                          {task.description && <p className="text-sm">{task.description}</p>}
                          <div className="flex items-center gap-2 mt-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          </div>
                          {task.incompletePhases && task.incompletePhases.length > 0 && (
                            <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                              <div className="flex items-start gap-2">
                                <Clock3 className="h-4 w-4 text-amber-500 mt-0.5" />
                                <div>
                                  <p className="text-xs font-medium text-amber-800">Waiting for phases to complete:</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {task.incompletePhases.map((phase, i) => (
                                      <Badge key={i} variant="outline" className="text-xs bg-amber-100 border-amber-300">
                                        {phase}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                        <CardFooter className="pt-2">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          On Hold
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default PersonalTasks;
