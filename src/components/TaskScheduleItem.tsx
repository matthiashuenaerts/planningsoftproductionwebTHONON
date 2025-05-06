
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { planningService } from '@/services/planningService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TaskScheduleItemProps {
  schedule: any;
  isAdmin: boolean;
  isDraggable?: boolean;
  onTaskUpdated?: () => void;
}

const TaskScheduleItem: React.FC<TaskScheduleItemProps> = ({ 
  schedule,
  isAdmin,
  isDraggable = false,
  onTaskUpdated
}) => {
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const formatTime = (timeString: string) => {
    try {
      return format(parseISO(timeString), 'h:mm a');
    } catch (e) {
      return 'Invalid time';
    }
  };

  const hasTask = schedule.task && schedule.task.id;
  const hasPhase = schedule.phase && schedule.phase.id;
  
  // Determine what type of item this is
  const itemType = hasTask ? 'task' : hasPhase ? 'phase' : 'general';
  
  // Get colors based on type and priority/progress
  const getBadgeVariant = () => {
    if (hasTask) {
      switch (schedule.task.priority) {
        case 'Urgent': return 'destructive';
        case 'High': return 'destructive'; // Changed from 'orange' to 'destructive'
        case 'Medium': return 'secondary'; // Changed from 'amber' to 'secondary'
        case 'Low': return 'outline';
        default: return 'secondary';
      }
    } else if (hasPhase) {
      if (schedule.phase.progress < 25) return 'destructive';
      if (schedule.phase.progress < 50) return 'destructive'; // Changed from 'orange' to 'destructive'
      if (schedule.phase.progress < 75) return 'secondary'; // Changed from 'amber' to 'secondary'
      return 'default'; // Changed from 'green' to 'default'
    }
    return 'secondary';
  };

  const handleEditClick = () => {
    // We'll pass this task to the parent component for editing
    if (onTaskUpdated) {
      window.dispatchEvent(new CustomEvent('editTask', { detail: schedule }));
    }
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await planningService.deleteSchedule(schedule.id);
      toast({
        title: "Success",
        description: "Task has been deleted",
      });
      if (onTaskUpdated) {
        onTaskUpdated();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to delete task: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  // Render a regular card if not admin or a context menu if admin
  if (!isAdmin) {
    return (
      <Card className={`mb-1 w-full cursor-default overflow-hidden border`}>
        <CardContent className="p-2">
          <div className="text-sm font-medium">{schedule.title}</div>
          
          <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="truncate max-w-[150px]">
              {schedule.description || (hasTask ? schedule.task.description : '') || 'No description'}
            </div>
            
            <div className="flex items-center gap-1 whitespace-nowrap">
              {hasTask && (
                <Badge variant={getBadgeVariant()} className="text-[0.65rem]">
                  {schedule.task.priority}
                </Badge>
              )}
              
              {hasPhase && (
                <Badge variant={getBadgeVariant()} className="text-[0.65rem]">
                  {schedule.phase.progress}%
                </Badge>
              )}
              
              {!hasTask && !hasPhase && (
                <Badge variant="secondary" className="text-[0.65rem]">
                  General
                </Badge>
              )}
            </div>
          </div>
          
          <div className="mt-1 text-xs text-muted-foreground">
            {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          <Card className={`mb-1 w-full cursor-${isDraggable ? 'grab' : 'pointer'} overflow-hidden border hover:border-primary`}>
            <CardContent className="p-2">
              <div className="text-sm font-medium">{schedule.title}</div>
              
              <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="truncate max-w-[150px]">
                  {schedule.description || (hasTask ? schedule.task.description : '') || 'No description'}
                </div>
                
                <div className="flex items-center gap-1 whitespace-nowrap">
                  {hasTask && (
                    <Badge variant={getBadgeVariant()} className="text-[0.65rem]">
                      {schedule.task.priority}
                    </Badge>
                  )}
                  
                  {hasPhase && (
                    <Badge variant={getBadgeVariant()} className="text-[0.65rem]">
                      {schedule.phase.progress}%
                    </Badge>
                  )}
                  
                  {!hasTask && !hasPhase && (
                    <Badge variant="secondary" className="text-[0.65rem]">
                      General
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="mt-1 text-xs text-muted-foreground">
                {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
              </div>
            </CardContent>
          </Card>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={handleEditClick}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Task
          </ContextMenuItem>
          <ContextMenuItem onClick={handleDeleteClick} className="text-red-600 focus:text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Task
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this scheduled task.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TaskScheduleItem;
