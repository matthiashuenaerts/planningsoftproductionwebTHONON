import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  editingSchedule?: any;
}

const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  onClose,
  employee,
  timeSlot,
  date,
  onTaskAdded,
  editingSchedule
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [duration, setDuration] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [availableTasks, setAvailableTasks] = useState<any[]>([]);
  const [availablePhases, setAvailablePhases] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [selectedPhase, setSelectedPhase] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    // If we have an existing schedule to edit, populate the form with its data
    if (editingSchedule) {
      setTitle(editingSchedule.title || '');
      setDescription(editingSchedule.description || '');
      
      const startDate = new Date(editingSchedule.start_time);
      const endDate = new Date(editingSchedule.end_time);
      
      setStartTime(format(startDate, 'HH:mm'));
      setEndTime(format(endDate, 'HH:mm'));
      
      // Calculate duration in hours
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(1);
      setDuration(durationHours);
      
      // Set task or phase if available
      if (editingSchedule.task_id) {
        setSelectedTask(editingSchedule.task_id);
        setSelectedPhase('');
      } else if (editingSchedule.phase_id) {
        setSelectedPhase(editingSchedule.phase_id);
        setSelectedTask('');
      } else {
        setSelectedTask('');
        setSelectedPhase('');
      }
    } else if (timeSlot) {
      // If it's a new task with a timeSlot, set the start and end times
      const parsedTime = parse(timeSlot, 'HH:mm', new Date());
      setStartTime(format(parsedTime, 'HH:mm'));
      setEndTime(format(addHours(parsedTime, 1), 'HH:mm'));
      setDuration('1');
      
      // Clear fields for new task
      setTitle('');
      setDescription('');
      setSelectedTask('');
      setSelectedPhase('');
    }
  }, [timeSlot, editingSchedule]);

  useEffect(() => {
    const fetchData = async () => {
      if (!employee) return;
      
      try {
        // Fetch open tasks assigned to this employee or matching their workstation
        const tasks = await taskService.getOpenTasksByEmployeeOrWorkstation(
          employee.id,
          employee.workstation
        );
        setAvailableTasks(tasks);
        
        // Fetch available phases for today
        const phases = await fetchAvailablePhasesForDate(date);
        setAvailablePhases(phases);
      } catch (error) {
        console.error('Error fetching planning data:', error);
      }
    };

    if (isOpen && employee) {
      fetchData();
    }
  }, [isOpen, employee, date]);

  const handleDurationChange = (newDuration: string) => {
    setDuration(newDuration);
    if (startTime && newDuration) {
      const start = parse(startTime, 'HH:mm', new Date());
      const end = addHours(start, parseFloat(newDuration));
      setEndTime(format(end, 'HH:mm'));
    }
  };

  const handleSelectTask = (taskId: string) => {
    setSelectedTask(taskId);
    setSelectedPhase(''); // Clear phase selection when task is selected
    
    if (taskId === 'none') {
      // Do not change title and description if "none" is selected
      return;
    }
    
    const task = availableTasks.find(t => t.id === taskId);
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
    }
  };
  
  const handleSelectPhase = (phaseId: string) => {
    setSelectedPhase(phaseId);
    setSelectedTask(''); // Clear task selection when phase is selected
    
    if (phaseId === 'none') {
      // Do not change title and description if "none" is selected
      return;
    }
    
    const phase = availablePhases.find(p => p.id === phaseId);
    if (phase) {
      setTitle(`Phase: ${phase.name}`);
      setDescription(`Project: ${phase.project?.name || 'Unknown'}`);
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

      // Data to save/update
      const scheduleData = {
        employee_id: employee.id,
        task_id: selectedTask && selectedTask !== 'none' ? selectedTask : undefined,
        phase_id: selectedPhase && selectedPhase !== 'none' ? selectedPhase : undefined,
        title,
        description,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        is_auto_generated: false
      };
      
      // If editing existing schedule, update it
      if (editingSchedule) {
        await planningService.updateSchedule(editingSchedule.id, scheduleData);
      } else {
        // Otherwise create a new one
        await planningService.createSchedule(scheduleData);
      }
      
      onTaskAdded();
      onClose();
      
      // Reset form
      setTitle('');
      setDescription('');
      setSelectedTask('');
      setSelectedPhase('');
      
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
          <DialogTitle>
            {editingSchedule ? 'Edit Task' : 'Schedule Task'} for {employee?.name}
          </DialogTitle>
          <DialogDescription>
            {editingSchedule 
              ? 'Update the details for this scheduled task.' 
              : 'Add a new task to the schedule.'}
          </DialogDescription>
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
                  disabled={!!selectedPhase && selectedPhase !== 'none'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a task" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
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
          
          {availablePhases.length > 0 && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="existingPhase" className="text-right">
                Project Phase
              </Label>
              <div className="col-span-3">
                <Select
                  value={selectedPhase}
                  onValueChange={handleSelectPhase}
                  disabled={!!selectedTask && selectedTask !== 'none'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a phase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {availablePhases.map(phase => (
                      <SelectItem key={phase.id} value={phase.id}>
                        {phase.name} ({phase.project?.name})
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
            {isLoading 
              ? (editingSchedule ? 'Updating...' : 'Scheduling...') 
              : (editingSchedule ? 'Update Task' : 'Schedule Task')
            }
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
