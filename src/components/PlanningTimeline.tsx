
import React from 'react';
import { format } from 'date-fns';
import { Schedule } from '@/services/planningService';
import TaskScheduleItem from './TaskScheduleItem';

interface PlanningTimelineProps {
  selectedDate: Date | undefined;
  schedules: Schedule[];
  isLoading: boolean;
}

const PlanningTimeline = ({ 
  selectedDate, 
  schedules, 
  isLoading 
}: PlanningTimelineProps) => {
  const formatTime = (time: string) => {
    return format(new Date(`2000-01-01T${time}`), 'HH:mm');
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading schedules...</div>;
  }

  if (!schedules || schedules.length === 0) {
    return <div className="text-center py-4">No schedules for this day.</div>;
  }

  const renderScheduleItem = (schedule: Schedule, index: number) => {
    // Default to false for isCompleted if task is not available
    const isCompleted = false;
    
    return (
      <div key={schedule.id || index} className="bg-white shadow rounded-lg p-4 mb-2">
        <div className="font-medium">{schedule.title}</div>
        <div className="text-sm text-gray-500">
          {`${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`}
        </div>
        {schedule.description && (
          <div className="text-sm mt-2">{schedule.description}</div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">
        {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Today'}
      </h2>
      
      {schedules.map((schedule, index) => (
        <div key={schedule.id || index} className="mb-4">
          <h3 className="font-semibold">
            {schedule.title || 'Unnamed Schedule'} 
          </h3>
          <div>
            {renderScheduleItem(schedule, index)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PlanningTimeline;
