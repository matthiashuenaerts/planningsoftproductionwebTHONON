
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, 
  Clock, 
  PlayCircle, 
  AlertCircle,
  Clock3,
  ArrowLeft
} from 'lucide-react';
import { standardTasksService } from '@/services/standardTasksService';
import { workstationService } from '@/services/workstationService';
import { rushOrderService } from '@/services/rushOrderService';
import { useAuth } from '@/context/AuthContext';
import WorkstationRushOrdersDisplay from './WorkstationRushOrdersDisplay';

// Define interfaces for the data
interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string;
  workstation: string;
  phase: {
    id: string;
    name: string;
    project_id: string;
  };
  project: {
    id: string;
    name: string;
    client: string;
  };
  isRushOrderTask?: boolean;
  rushOrderId?: string;
  limitPhasesComplete?: boolean;
  incompletePhases?: string[];
}

interface WorkstationInfo {
  id: string;
  name: string;
  description: string | null;
}

interface WorkstationViewProps {
  workstationId: string;
  onBack?: () => void;
}

const WorkstationView: React.FC<WorkstationViewProps> = ({ workstationId, onBack }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rushOrderTasks, setRushOrderTasks] = useState<Task[]>([]);
  const [workstation, setWorkstation] = useState<WorkstationInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { currentEmployee } = useAuth();
  const { toast } = useToast();

  // Fetch tasks and workstation info
  useEffect(() => {
    const fetchWorkstationData = async () => {
      try {
        const workstationInfo = await workstationService.getById(workstationId);
        setWorkstation(workstationInfo);

        // Get regular tasks for this workstation
        const workstationTasks = await workstationService.getTasksForWorkstation(workstationId);
        
        // Get rush order tasks for this workstation
        const rushOrderTasksData = await workstationService.getRushOrderTasksForWorkstation(workstationId);
        
        // Get all standard tasks to check limit phases
        const standardTasks = await standardTasksService.getAll();
        
        // Check limit phases for each task
        const tasksWithLimitPhaseInfo = await Promise.all(workstationTasks.map(async (task) => {
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
              const projectPhases = await workstationService.getPhasesForProject(task.phase.project_id);
              
              // Find phases that are not completed
              const incompletePhases = limitPhases.filter(limitPhase => {
                const projectPhase = projectPhases.find(pp => pp.name === limitPhase.phase_name);
                return !projectPhase || projectPhase.progress < 100;
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
        setRushOrderTasks(rushOrderTasksData);
      } catch (error) {
        console.error('Error loading workstation data:', error);
        toast({
          title: "Error",
          description: "Failed to load workstation data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWorkstationData();
  }, [workstationId, toast]);

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string, isRushOrderTask: boolean, rushOrderId?: string) => {
    try {
      if (isRushOrderTask && rushOrderId) {
        // Update rush order task status
        await workstationService.updateRushOrderTaskStatus(rushOrderId, taskId, newStatus);
        
        // Update local state
        setRushOrderTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === taskId ? { ...task, status: newStatus } : task
          )
        );
      } else {
        // Update regular task status
        await workstationService.updateTaskStatus(taskId, newStatus);
        
        // Update local state
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === taskId ? { ...task, status: newStatus } : task
          )
        );
      }
      
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

  // Filter tasks by status
  const pendingTasks = [...tasks.filter(t => t.status === 'TODO' && t.limitPhasesComplete), 
                        ...rushOrderTasks.filter(t => t.status === 'TODO')];
  const inProgressTasks = [...tasks.filter(t => t.status === 'IN_PROGRESS'), 
                          ...rushOrderTasks.filter(t => t.status === 'IN_PROGRESS')];
  const completedTasks = [...tasks.filter(t => t.status === 'COMPLETED'), 
                         ...rushOrderTasks.filter(t => t.status === 'COMPLETED')];
  const onHoldTasks = tasks.filter(t => t.status === 'TODO' && !t.limitPhasesComplete);

  // Sort tasks by priority and due date
  const sortedPendingTasks = pendingTasks.sort((a, b) => {
    // Rush order tasks first
    if (a.isRushOrderTask && !b.isRushOrderTask) return -1;
    if (!a.isRushOrderTask && b.isRushOrderTask) return 1;
    
    // Then by priority
    if (a.priority === 'HIGH' && b.priority !== 'HIGH') return -1;
    if (a.priority !== 'HIGH' && b.priority === 'HIGH') return 1;
    
    // Then by due date
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!workstation) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
        <h2 className="text-xl font-semibold mt-4">Workstation not found</h2>
      </div>
    );
  }

  const renderTaskCard = (task: Task, index: number) => {
    const isRushOrder = task.isRushOrderTask;
    
    // Determine if the employee is assigned to this workstation
    const canUpdateStatus = currentEmployee?.role === 'admin' || true; // TODO: Check if employee is assigned to this workstation
    
    return (
      <Card 
        key={task.id} 
        className={`mb-4 ${isRushOrder ? 'border-red-300 border-2' : ''}`}
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-base">
                {task.title}
                {isRushOrder && (
                  <Badge variant="destructive" className="ml-2">Rush</Badge>
                )}
              </CardTitle>
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
          {!task.limitPhasesComplete && task.incompletePhases && task.incompletePhases.length > 0 && (
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
          {canUpdateStatus && (
            <div className="flex gap-2 w-full">
              {task.status === 'TODO' && task.limitPhasesComplete && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center"
                  onClick={() => handleUpdateTaskStatus(task.id, 'IN_PROGRESS', isRushOrder || false, task.rushOrderId)}
                >
                  <PlayCircle className="h-4 w-4 mr-1" /> Start
                </Button>
              )}
              {task.status === 'IN_PROGRESS' && (
                <Button 
                  variant="default" 
                  size="sm" 
                  className="flex items-center"
                  onClick={() => handleUpdateTaskStatus(task.id, 'COMPLETED', isRushOrder || false, task.rushOrderId)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Complete
                </Button>
              )}
            </div>
          )}
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {onBack && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={onBack}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      )}
      
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold">{workstation.name}</h1>
          {workstation.description && (
            <p className="text-muted-foreground">{workstation.description}</p>
          )}
        </div>
      </div>

      <WorkstationRushOrdersDisplay workstationId={workstationId} />

      <Tabs defaultValue="todo">
        <TabsList>
          <TabsTrigger value="todo" className="relative">
            To Do
            {sortedPendingTasks.length > 0 && (
              <Badge variant="secondary" className="ml-2">{sortedPendingTasks.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="in-progress" className="relative">
            In Progress
            {inProgressTasks.length > 0 && (
              <Badge variant="secondary" className="ml-2">{inProgressTasks.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="on-hold" className="relative">
            On Hold
            {onHoldTasks.length > 0 && (
              <Badge variant="secondary" className="ml-2">{onHoldTasks.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="todo" className="mt-4">
          {sortedPendingTasks.length > 0 ? (
            sortedPendingTasks.map((task, index) => renderTaskCard(task, index))
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              No tasks to do
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="in-progress" className="mt-4">
          {inProgressTasks.length > 0 ? (
            inProgressTasks.map((task, index) => renderTaskCard(task, index))
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              No tasks in progress
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="completed" className="mt-4">
          {completedTasks.length > 0 ? (
            completedTasks.map((task, index) => renderTaskCard(task, index))
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              No completed tasks
            </div>
          )}
        </TabsContent>

        <TabsContent value="on-hold" className="mt-4">
          {onHoldTasks.length > 0 ? (
            onHoldTasks.map((task, index) => renderTaskCard(task, index))
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              No tasks on hold
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WorkstationView;
