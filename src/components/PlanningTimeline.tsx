
import React, { useState, useEffect } from 'react';
import { format, parse, addHours } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import TaskScheduleItem from './TaskScheduleItem';
import NewTaskModal from './NewTaskModal';
import { planningService } from '@/services/planningService';

interface PlanningTimelineProps {
  selectedDate: Date;
  employees: any[];
  isAdmin: boolean;
}

interface TimeSlot {
  time: string;
  label: string;
}

const HOURS = ['07:00', '08:00', '09:00', '10:00', '10:15', '11:00', '12:00', '12:30',
  '13:00', '14:00', '15:00', '16:00'];

const PlanningTimeline: React.FC<PlanningTimelineProps> = ({ selectedDate, employees, isAdmin }) => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const { toast } = useToast();

  // Generate time slots for the timeline
  const timeSlots: TimeSlot[] = HOURS.map(hour => ({
    time: hour,
    label: format(parse(hour, 'HH:mm', new Date()), 'h:mm a')
  }));

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setIsLoading(true);
        const schedulesData = await planningService.getSchedulesByDate(selectedDate);
        setSchedules(schedulesData);
      } catch (error) {
        console.error('Error fetching schedules:', error);
        toast({
          title: "Error",
          description: "Failed to load schedule data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedules();
  }, [selectedDate, toast]);

  const handleCellClick = (employeeId: string, timeSlot: string) => {
    if (!isAdmin) return;
    
    setSelectedEmployee(employees.find(emp => emp.id === employeeId));
    setSelectedTimeSlot(timeSlot);
    setIsModalOpen(true);
  };

  const handleTaskAdded = () => {
    // Refetch schedules after a task is added
    planningService.getSchedulesByDate(selectedDate)
      .then(schedulesData => {
        setSchedules(schedulesData);
        toast({
          title: "Success",
          description: "Task has been scheduled",
        });
      })
      .catch(error => {
        toast({
          title: "Error",
          description: "Failed to refresh schedule data",
          variant: "destructive"
        });
      });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Group schedules by employee
  const schedulesByEmployee = employees.reduce((acc, employee) => {
    acc[employee.id] = schedules.filter(schedule => schedule.employee_id === employee.id);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="mt-6">
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 table-fixed">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-40 p-4 text-left text-sm font-medium text-gray-500">
                        Employee
                      </th>
                      {timeSlots.map((slot) => (
                        <th
                          key={slot.time}
                          className="p-4 text-left text-sm font-medium text-gray-500 border-l"
                          style={{ minWidth: '120px' }}
                        >
                          {slot.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {employees.map(employee => (
                      <tr key={employee.id}>
                        <td className="p-4 text-sm font-medium text-gray-900">
                          {employee.name}
                          <div className="text-xs text-gray-500">
                            {employee.workstation || 'No workstation'}
                          </div>
                        </td>
                        
                        {timeSlots.map(slot => {
                          const employeeSchedules = schedulesByEmployee[employee.id] || [];
                          const schedulesInSlot = employeeSchedules.filter(schedule => {
                            const slotTime = parse(slot.time, 'HH:mm', new Date());
                            const nextSlotIndex = timeSlots.indexOf(slot) + 1;
                            const nextSlotTime = nextSlotIndex < timeSlots.length 
                              ? parse(timeSlots[nextSlotIndex].time, 'HH:mm', new Date())
                              : addHours(slotTime, 1);
                            
                            const scheduleStart = new Date(schedule.start_time);
                            return scheduleStart >= slotTime && scheduleStart < nextSlotTime;
                          });
                          
                          return (
                            <td 
                              key={`${employee.id}-${slot.time}`}
                              className="p-2 text-sm text-gray-500 border-l hover:bg-gray-50 cursor-pointer"
                              onClick={() => handleCellClick(employee.id, slot.time)}
                            >
                              {schedulesInSlot.map(schedule => (
                                <TaskScheduleItem
                                  key={schedule.id}
                                  schedule={schedule}
                                  isAdmin={isAdmin}
                                />
                              ))}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <NewTaskModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          employee={selectedEmployee}
          timeSlot={selectedTimeSlot}
          date={selectedDate}
          onTaskAdded={handleTaskAdded}
        />
      )}
    </div>
  );
};

export default PlanningTimeline;
