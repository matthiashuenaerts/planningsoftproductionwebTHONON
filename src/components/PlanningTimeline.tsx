
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
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
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
        setIsError(false);
        setErrorMessage("");
        
        // Make sure the date is properly formatted
        const formattedDate = new Date(selectedDate);
        
        // Add a console log to debug
        console.log("Fetching schedules for date:", formattedDate);
        
        const schedulesData = await planningService.getSchedulesByDate(formattedDate);
        
        // Add a console log to see what was returned
        console.log("Schedules fetched:", schedulesData);
        
        setSchedules(schedulesData);
      } catch (error: any) {
        console.error('Error fetching schedules:', error);
        setIsError(true);
        setErrorMessage(error.message || "Failed to load schedule data");
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

  const handleRetry = () => {
    setIsError(false);
    setIsLoading(true);
    planningService.getSchedulesByDate(selectedDate)
      .then(data => {
        setSchedules(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsError(true);
        setErrorMessage(err.message || "Failed to load schedule data");
        setIsLoading(false);
      });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-2" />
          <span className="text-gray-500">Loading schedule...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center h-64">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {errorMessage || "Failed to load schedule data"}
          </AlertDescription>
          <Button 
            variant="outline"
            className="mt-4 bg-white text-red-500 hover:bg-gray-100" 
            onClick={handleRetry}
          >
            Try Again
          </Button>
        </Alert>
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
        <CardContent className="p-0 overflow-auto">
          <div className="p-4">
            <DndProvider backend={HTML5Backend}>
              <div className="flex flex-col space-y-6">
                {WORK_PERIODS.map((period, periodIndex) => (
                  <div key={period.label} className="border rounded-lg">
                    <div className="bg-gray-100 p-3 font-medium border-b">
                      {period.label}: {format(parse(period.start, 'HH:mm', new Date()), 'h:mm a')} - 
                      {format(parse(period.end, 'HH:mm', new Date()), 'h:mm a')}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {employees.map((employee) => (
                              <th
                                key={employee.id}
                                className="p-4 text-left text-sm font-medium text-gray-500 border-r last:border-r-0"
                                style={{ minWidth: '180px' }}
                              >
                                {employee.name}
                                <div className="text-xs text-gray-500">
                                  {employee.workstation || 'No workstation'}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {/* Generate rows for each time slot in this period */}
                          {timeSlots
                            .filter(slot => {
                              const slotTime = parse(slot.time, 'HH:mm', new Date());
                              const periodStart = parse(period.start, 'HH:mm', new Date());
                              const periodEnd = parse(period.end, 'HH:mm', new Date());
                              return slotTime >= periodStart && slotTime < periodEnd;
                            })
                            .map(slot => (
                              <tr key={slot.time} className="hover:bg-gray-50">
                                {employees.map(employee => {
                                  const employeeSchedules = schedulesByEmployee[employee.id] || [];
                                  const schedulesInSlot = employeeSchedules.filter(schedule => {
                                    const slotTime = parse(slot.time, 'HH:mm', selectedDate);
                                    const slotEndTime = addHours(slotTime, 0.5);
                                    const scheduleStart = new Date(schedule.start_time);
                                    
                                    return scheduleStart >= slotTime && scheduleStart < slotEndTime;
                                  });
                                  
                                  return (
                                    <DroppableCell
                                      key={`${employee.id}-${slot.time}`}
                                      employeeId={employee.id}
                                      timeSlot={slot.time}
                                      onDrop={handleTaskDrop}
                                      handleCellClick={handleCellClick}
                                    >
                                      <div className="p-1 flex items-center">
                                        <div className="text-xs text-gray-500 w-16 flex-shrink-0">
                                          {slot.label}
                                        </div>
                                        <div className="flex-grow">
                                          {schedulesInSlot.map(schedule => (
                                            <DraggableTask
                                              key={schedule.id}
                                              schedule={schedule}
                                              isAdmin={isAdmin}
                                              onDrop={handleTaskDrop}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    </DroppableCell>
                                  );
                                })}
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </DndProvider>
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
