import React, { useState, useEffect } from 'react';
import {
  CheckboxCard
} from '@/components/settings/CheckboxCard';
import { useToast } from '@/hooks/use-toast';
import { taskService, Task } from '@/services/dataService';
import { workstationService, Workstation } from '@/services/workstationService';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WorkstationTasksManagerProps {
  workstationId: string;
  workstationName: string;
}

interface TaskWorkstationsManagerProps {
  taskId: string;
  onClose?: () => void;
}

// Component for managing workstation assignments to tasks
export const TaskWorkstationsManager: React.FC<TaskWorkstationsManagerProps> = ({ 
  taskId,
  onClose 
}) => {
  const [loading, setLoading] = useState(true);
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [workstationLinks, setWorkstationLinks] = useState<Record<string, boolean>>({});
  const [processingWorkstation, setProcessingWorkstation] = useState<string | null>(null);
  const { toast } = useToast();

  // Load all workstations and the linked workstations for this task
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Get all workstations
        const allWorkstations = await workstationService.getAll();
        setWorkstations(allWorkstations);
        
        // Get all task-workstation links for this task
        const { data: links, error: linksError } = await supabase
          .from('task_workstation_links')
          .select('workstation_id')
          .eq('task_id', taskId);
        
        if (linksError) throw linksError;
        
        // Create a map of workstation IDs to boolean (true if linked)
        const linkMap: Record<string, boolean> = {};
        if (links) {
          links.forEach((link: any) => {
            linkMap[link.workstation_id] = true;
          });
        }
        
        setWorkstationLinks(linkMap);
      } catch (error: any) {
        console.error('Error loading task workstation data:', error);
        toast({
          title: "Error",
          description: `Failed to load data: ${error.message}`,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [taskId]);
  
  const handleToggleWorkstation = async (workstationId: string, checked: boolean) => {
    try {
      setProcessingWorkstation(workstationId);
      
      if (checked) {
        // Link task to workstation
        const { error } = await supabase
          .from('task_workstation_links')
          .insert({ task_id: taskId, workstation_id: workstationId });
          
        if (error) throw error;
        
        setWorkstationLinks(prev => ({ ...prev, [workstationId]: true }));
      } else {
        // Unlink task from workstation
        const { error } = await supabase
          .from('task_workstation_links')
          .delete()
          .eq('task_id', taskId)
          .eq('workstation_id', workstationId);
          
        if (error) throw error;
        
        setWorkstationLinks(prev => ({ ...prev, [workstationId]: false }));
      }
      
      toast({
        title: "Success",
        description: checked 
          ? `Task assigned to workstation` 
          : `Task removed from workstation`
      });
    } catch (error: any) {
      console.error('Error updating task workstation:', error);
      toast({
        title: "Error",
        description: `Failed to update: ${error.message}`,
        variant: "destructive"
      });
      // Revert UI change
      setWorkstationLinks(prev => ({ ...prev, [workstationId]: !checked }));
    } finally {
      setProcessingWorkstation(null);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="py-4">
      <ScrollArea className="h-[400px] pr-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workstations.length === 0 ? (
            <p className="col-span-full text-center text-muted-foreground py-8">
              No workstations found in the system
            </p>
          ) : (
            workstations.map((workstation) => (
              <CheckboxCard
                key={workstation.id}
                id={workstation.id}
                title={workstation.name}
                description={workstation.description || 'No description'}
                checked={!!workstationLinks[workstation.id]}
                onCheckedChange={(checked) => handleToggleWorkstation(workstation.id, checked)}
                disabled={processingWorkstation === workstation.id}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

// Component for managing task assignments to workstations
export const WorkstationTasksManager: React.FC<WorkstationTasksManagerProps> = ({ 
  workstationId,
  workstationName
}) => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskLinks, setTaskLinks] = useState<Record<string, boolean>>({});
  const [processingTask, setProcessingTask] = useState<string | null>(null);
  const { toast } = useToast();

  // Load all tasks and the linked tasks for this workstation
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Get all tasks
        const allTasks = await taskService.getAll();
        setTasks(allTasks);
        
        // Get all task-workstation links for this workstation
        const links = await supabase
          .from('task_workstation_links')
          .select('task_id')
          .eq('workstation_id', workstationId);
        
        if (links.error) throw links.error;
        
        // Create a map of task IDs to boolean (true if linked)
        const linkMap: Record<string, boolean> = {};
        links.data.forEach(link => {
          linkMap[link.task_id] = true;
        });
        
        setTaskLinks(linkMap);
      } catch (error: any) {
        console.error('Error loading task workstation data:', error);
        toast({
          title: "Error",
          description: `Failed to load data: ${error.message}`,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [workstationId]);
  
  const handleToggleTask = async (taskId: string, checked: boolean) => {
    try {
      setProcessingTask(taskId);
      
      if (checked) {
        // Link task to workstation
        await workstationService.linkTaskToWorkstation(taskId, workstationId);
        setTaskLinks(prev => ({ ...prev, [taskId]: true }));
      } else {
        // Unlink task from workstation
        await workstationService.unlinkTaskFromWorkstation(taskId, workstationId);
        setTaskLinks(prev => ({ ...prev, [taskId]: false }));
      }
      
      toast({
        title: "Success",
        description: checked 
          ? `Task assigned to ${workstationName} workstation` 
          : `Task removed from ${workstationName} workstation`
      });
    } catch (error: any) {
      console.error('Error updating task workstation:', error);
      toast({
        title: "Error",
        description: `Failed to update: ${error.message}`,
        variant: "destructive"
      });
      // Revert UI change
      setTaskLinks(prev => ({ ...prev, [taskId]: !checked }));
    } finally {
      setProcessingTask(null);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="py-4">
      <ScrollArea className="h-[400px] pr-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.length === 0 ? (
            <p className="col-span-full text-center text-muted-foreground py-8">
              No tasks found in the system
            </p>
          ) : (
            tasks.map(task => (
              <CheckboxCard
                key={task.id}
                id={task.id}
                title={task.title}
                description={task.description || 'No description'}
                checked={!!taskLinks[task.id]}
                onCheckedChange={(checked) => handleToggleTask(task.id, checked)}
                disabled={processingTask === task.id}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
