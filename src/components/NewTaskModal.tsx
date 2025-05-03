import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, parse, addHours, setHours, setMinutes } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { taskService } from '@/services/dataService';
import { planningService } from '@/services/planningService';
import { supabase } from '@/integrations/supabase/client';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
  timeSlot: string | null;
  date: Date;
  onTaskAdded: () => void;
}

const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  onClose,
  employee,
  timeSlot,
  date,
  onTaskAdded
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [duration, setDuration] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [availableTasks, setAvailableTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (timeSlot) {
      const parsedTime = parse(timeSlot, 'HH:mm', new Date());
      setStartTime(format(parsedTime, 'HH:mm'));
      setEndTime(format(addHours(parsedTime, 1), 'HH:mm'));
    }
  }, [timeSlot]);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!employee) return;
      
      try {
        // Fetch open tasks assigned to this employee or matching their workstation
        const tasks = await taskService.getOpenTasksByEmployeeOrWorkstation(
          employee.id,
          employee.workstation
        );
        setAvailableTasks(tasks);
      } catch (error) {
        console.error('Error fetching available tasks:', error);
      }
    };

    if (isOpen && employee) {
      fetchTasks();
    }
  }, [isOpen, employee]);

  const handleDurationChange = (newDuration: string) => {
    setDuration(newDuration);
    if (startTime && newDuration) {
      const start = parse(startTime, 'HH:mm', new Date());
      const end = addHours(start, parseInt(newDuration));
      setEndTime(format(end, 'HH:mm'));
    }
  };

  const handleSelectTask = (taskId: string) => {
    setSelectedTask(taskId);
    const task = availableTasks.find(t => t.id === taskId);
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
    }
  };

  const handleSubmit = async () => {
    if (!employee || !startTime || !endTime) {
      toast({
        title: "Error",
        description: "Missing required information",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Combine date and time
      const startDateTime = new Date(date);
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      startDateTime.setHours(startHours, startMinutes);
      
      const endDateTime = new Date(date);
      const [endHours, endMinutes] = endTime.split(':').map(Number);
      endDateTime.setHours(endHours, endMinutes);
      
      await planningService.createSchedule({
        employee_id: employee.id,
        task_id: selectedTask || undefined,
        title,
        description,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        is_auto_generated: false
      });
      
      onTaskAdded();
      onClose();
      
      // Reset form
      setTitle('');
      setDescription('');
      setSelectedTask('');
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to schedule task: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Task for {employee?.name}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {availableTasks.length > 0 && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="existingTask" className="text-right">
                Existing Task
              </Label>
              <div className="col-span-3">
                <Select
                  value={selectedTask}
                  onValueChange={handleSelectTask}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a task" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTasks.map(task => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startTime" className="text-right">
              Start Time
            </Label>
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="duration" className="text-right">
              Duration (hours)
            </Label>
            <Select
              value={duration}
              onValueChange={handleDurationChange}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">30 minutes</SelectItem>
                <SelectItem value="1">1 hour</SelectItem>
                <SelectItem value="1.5">1.5 hours</SelectItem>
                <SelectItem value="2">2 hours</SelectItem>
                <SelectItem value="3">3 hours</SelectItem>
                <SelectItem value="4">4 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="endTime" className="text-right">
              End Time
            </Label>
            <Input
              id="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit} 
            disabled={!title || !startTime || !endTime || isLoading}
          >
            {isLoading ? 'Scheduling...' : 'Schedule Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const fetchAvailablePhasesForDate = async (date: Date) => {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  const { data, error } = await supabase
    .from('phases')
    .select(`
      *,
      project:projects(id, name, status)
    `)
    .lt('progress', 100) // Only get incomplete phases
    .lte('start_date', dateStr) // Has already started or starts today
    .gte('end_date', dateStr);  // Hasn't ended yet
    
  if (error) {
    console.error('Error fetching phases:', error);
    throw error;
  }
  
  return data || [];
};

export default NewTaskModal;
