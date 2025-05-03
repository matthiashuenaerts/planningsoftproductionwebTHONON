
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';

interface TaskScheduleItemProps {
  schedule: any;
  isAdmin: boolean;
  isDraggable?: boolean;
}

const TaskScheduleItem: React.FC<TaskScheduleItemProps> = ({ 
  schedule,
  isAdmin,
  isDraggable = false
}) => {
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

  return (
    <Card className={`mb-1 w-full cursor-${isDraggable ? 'grab' : 'default'} overflow-hidden border ${
      isAdmin ? 'hover:border-primary' : ''
    }`}>
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
};

export default TaskScheduleItem;
