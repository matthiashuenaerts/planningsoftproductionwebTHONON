
import React, { useState, useEffect } from 'react';
import { format, parse, addHours } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import TaskScheduleItem from './TaskScheduleItem';
import NewTaskModal from './NewTaskModal';
import { planningService } from '@/services/planningService';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface PlanningTimelineProps {
  selectedDate: Date;
  employees: any[];
  isAdmin: boolean;
}

interface TimeSlot {
  time: string;
  label: string;
}

// Define type for dragged item
interface DragItem {
  id: string;
  employeeId: string;
}

// Define standard working hours
const WORK_PERIODS = [
  { start: '07:00', end: '10:00', label: 'Morning' },
  { start: '10:15', end: '12:30', label: 'Mid-day' },
  { start: '13:00', end: '16:00', label: 'Afternoon' },
];

// Generate time slots based on work periods
const generateTimeSlots = () => {
  const slots: TimeSlot[] = [];
  WORK_PERIODS.forEach(period => {
    let currentTime = period.start;
    while (currentTime < period.end) {
      slots.push({
        time: currentTime,
        label: format(parse(currentTime, 'HH:mm', new Date()), 'h:mm a')
      });
      
      // Add 30-minute increments
      const parsedTime = parse(currentTime, 'HH:mm', new Date());
      const nextTime = addHours(parsedTime, 0.5);
      currentTime = format(nextTime, 'HH:mm');
    }
  });
  return slots;
};

const HOURS = generateTimeSlots();

// Define DraggableTask component
const DraggableTask = ({ schedule, isAdmin, onDrop }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'TASK',
    item: { id: schedule.id, employeeId: schedule.employee_id } as DragItem,
    canDrag: isAdmin,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div 
      ref={isAdmin ? drag : null}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <TaskScheduleItem
        key={schedule.id}
        schedule={schedule}
        isAdmin={isAdmin}
        isDraggable={isAdmin}
      />
    </div>
  );
};

// Define DroppableCell component
const DroppableCell = ({ employeeId, timeSlot, onDrop, children, handleCellClick }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'TASK',
    drop: (item: DragItem) => onDrop(item.id, employeeId, timeSlot),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  return (
    <td 
      ref={drop}
      className={`p-2 text-sm text-gray-500 border-l hover:bg-gray-50 cursor-pointer ${isOver ? 'bg-blue-50' : ''}`}
      onClick={() => handleCellClick(employeeId, timeSlot)}
    >
      {children}
    </td>
  );
};

const PlanningTimeline: React.FC<PlanningTimelineProps> = ({ selectedDate, employees, isAdmin }) => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const { toast } = useToast();

  // Generate time slots for the timeline
  const timeSlots: TimeSlot[] = HOURS;

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

  const handleTaskDrop = async (taskId: string, newEmployeeId: string, newTimeSlot: string) => {
    if (!isAdmin) return;
    
    try {
      const task = schedules.find(s => s.id === taskId);
      if (!task) return;
      
      const parsedTime = parse(newTimeSlot, 'HH:mm', selectedDate);
      
      // Calculate new end time based on original duration
      const originalStart = new Date(task.start_time);
      const originalEnd = new Date(task.end_time);
      const durationMs = originalEnd.getTime() - originalStart.getTime();
      
      const newStartDate = new Date(selectedDate);
      newStartDate.setHours(parsedTime.getHours(), parsedTime.getMinutes());
      
      const newEndDate = new Date(newStartDate.getTime() + durationMs);
      
      await planningService.updateSchedule(taskId, {
        employee_id: newEmployeeId,
        start_time: newStartDate.toISOString(),
        end_time: newEndDate.toISOString()
      });
      
      // Refresh schedules
      const updatedSchedules = await planningService.getSchedulesByDate(selectedDate);
      setSchedules(updatedSchedules);
      
      toast({
        title: "Success",
        description: "Task has been rescheduled",
      });
    } catch (error) {
      console.error('Error moving task:', error);
      toast({
        title: "Error",
        description: "Failed to move task",
        variant: "destructive"
      });
    }
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
                <DndProvider backend={HTML5Backend}>
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
                                : addHours(slotTime, 0.5);
                              
                              const scheduleStart = new Date(schedule.start_time);
                              return scheduleStart >= slotTime && scheduleStart < nextSlotTime;
                            });
                            
                            return (
                              <DroppableCell
                                key={`${employee.id}-${slot.time}`}
                                employeeId={employee.id}
                                timeSlot={slot.time}
                                onDrop={handleTaskDrop}
                                handleCellClick={handleCellClick}
                              >
                                {schedulesInSlot.map(schedule => (
                                  <DraggableTask
                                    key={schedule.id}
                                    schedule={schedule}
                                    isAdmin={isAdmin}
                                    onDrop={handleTaskDrop}
                                  />
                                ))}
                              </DroppableCell>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </DndProvider>
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
