
import React from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { Schedule } from '@/services/planningService';
import TaskScheduleItem from './TaskScheduleItem';

interface PlanningTimelineProps {
  selectedDate: Date | undefined;
  schedules: Schedule[];
  isLoading: boolean;
  employees?: any[]; // Add employees prop
  isAdmin?: boolean; // Add isAdmin prop
}

const PlanningTimeline = ({ 
  selectedDate, 
  schedules, 
  isLoading,
  employees = [], // Default to empty array
  isAdmin = false // Default to false
}: PlanningTimelineProps) => {
  const formatTime = (time: string) => {
    try {
      // Check if time is a valid time string first
      if (!time || typeof time !== 'string') {
        console.error('Invalid time provided to formatTime:', time);
        return 'Invalid time';
      }
      
      // If the time string doesn't include date info, prepend a date
      const timeWithDate = time.includes('T') 
        ? time 
        : `2000-01-01T${time}`;
      
      const date = parseISO(timeWithDate);
      
      if (!isValid(date)) {
        console.error('Invalid date produced from time:', time);
        return 'Invalid time';
      }
      
      return format(date, 'HH:mm');
    } catch (error) {
      console.error('Error formatting time:', error, time);
      return 'Invalid time';
    }
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
