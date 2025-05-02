
import React from 'react';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Grip } from 'lucide-react';

interface TaskScheduleItemProps {
  schedule: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    task_id?: string;
    is_auto_generated: boolean;
  };
  isAdmin: boolean;
  isDraggable?: boolean;
}

const TaskScheduleItem: React.FC<TaskScheduleItemProps> = ({ 
  schedule, 
  isAdmin,
  isDraggable = false
}) => {
  const startTime = new Date(schedule.start_time);
  const endTime = new Date(schedule.end_time);
  
  const formattedStartTime = format(startTime, 'h:mm a');
  const formattedEndTime = format(endTime, 'h:mm a');
  
  return (
    <Card className={cn(
      "mb-1 p-2 text-xs",
      schedule.is_auto_generated ? "bg-blue-50" : "bg-green-50",
      isAdmin ? "cursor-pointer hover:shadow-md" : ""
    )}>
      <div className="flex justify-between items-center">
        <div className="font-medium truncate">{schedule.title}</div>
        {isDraggable && <Grip size={12} className="text-gray-500" />}
      </div>
      <div className="text-slate-500">{formattedStartTime} - {formattedEndTime}</div>
    </Card>
  );
};

export default TaskScheduleItem;
