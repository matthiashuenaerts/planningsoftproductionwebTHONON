import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Trash } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { projectService, phaseService, taskService, Task } from '@/services/dataService';
import { workstationService } from '@/services/workstationService';
import { standardTasksService, StandardTask } from '@/services/standardTasksService';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const formSchema = z.object({
  name: z.string().min(1, { message: 'Project name is required' }),
  client: z.string().min(1, { message: 'Client name is required' }),
  description: z.string().optional(),
  start_date: z.date({ required_error: 'Start date is required' }),
  installation_date: z.date({ required_error: 'Installation date is required' }),
  project_value: z.number()
    .min(1, { message: 'Project value must be at least 1' })
    .max(100, { message: 'Project value must be at most 100' })
}).refine(
  (data) => {
    return data.installation_date >= data.start_date;
  },
  {
    message: 'Installation date must be after start date',
    path: ['installation_date'],
  }
);

type FormValues = z.infer<typeof formSchema>;

interface NewProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface TaskItem {
  id: string;
  name: string;
  workstation: string;
  selected?: boolean;
  task_number?: string;
  standard_task_id?: string;
  time_coefficient?: number;
  duration?: number; // Explicitly define the duration property
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskWorkstation, setNewTaskWorkstation] = useState('');
  const [workstations, setWorkstations] = useState<{id: string, name: string}[]>([]);
  
  // Fetch all workstations and standard tasks when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get all workstations
        const workstationData = await workstationService.getAll();
        setWorkstations(workstationData.map(w => ({ id: w.id, name: w.name })));
        
        // Get all standard tasks with their linked workstations
        const standardTasks = await standardTasksService.getAll();
        
        const taskItems: TaskItem[] = [];
        
        // For each standard task, get its linked workstations
        for (const task of standardTasks) {
          try {
            const links = await getWorkstationsForStandardTask(task.id);
            const workstationName = links && links.length > 0 ? links[0].name : '';
            
            const projectValue = form.getValues('project_value') || 50;
            const duration = task.time_coefficient ? Math.round(task.time_coefficient * projectValue) : 60;
            
            taskItems.push({
              id: task.task_number,
              name: task.task_name,
              workstation: workstationName,
              selected: true,
              task_number: task.task_number,
              standard_task_id: task.id,
              time_coefficient: task.time_coefficient,
              duration: duration
            });
          } catch (error) {
            console.error(`Error fetching workstation for task ${task.task_name}:`, error);
          }
        }
        
        setTasks(taskItems);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load standard tasks and workstations",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (open) {
      fetchData();
    }
  }, [open, toast]);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      client: '',
      description: '',
      start_date: new Date(),
      installation_date: new Date(),
      project_value: 50, // Default project value
    },
  });

  // Calculate task durations whenever project_value changes or when tasks are loaded/modified
  useEffect(() => {
    const projectValue = form.watch('project_value') || 50;
    
    // Update tasks with calculated durations
    setTasks(currentTasks => 
      currentTasks.map(task => ({
        ...task,
        duration: calculateTaskDuration(task, projectValue)
      }))
    );
  }, [form.watch('project_value'), tasks.length]);

  // Calculate task duration based on coefficient and project value
  const calculateTaskDuration = (task: TaskItem, projectValue: number): number => {
    if (!task.time_coefficient) return 60; // Default 1 hour if no coefficient
    return Math.round(task.time_coefficient * projectValue);
  };

  const handleAddCustomTask = () => {
    if (newTaskName.trim()) {
      const nextId = (tasks.length + 1).toString().padStart(2, '0');
      const projectValue = form.getValues('project_value') || 50;
      
      const newTask: TaskItem = { 
        id: nextId, 
        name: newTaskName.trim(), 
        workstation: newTaskWorkstation.trim(),
        selected: true,
        time_coefficient: 1.0, // Default coefficient for custom tasks
        duration: projectValue // For custom tasks, duration equals project value (coefficient of 1.0)
      };
      
      setTasks([...tasks, newTask]);
      setNewTaskName('');
      setNewTaskWorkstation('');
    }
  };

  const handleRemoveTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleToggleTask = (index: number) => {
    setTasks(tasks.map((task, i) => 
      i === index ? { ...task, selected: !task.selected } : task
    ));
  };

  // Helper function to find workstation ID by name
  const findWorkstationIdByName = (name: string): string | undefined => {
    if (!name) return undefined;
    
    // Try exact match first
    const exactMatch = workstations.find(w => 
      w.name.toLowerCase() === name.toLowerCase()
    );
    if (exactMatch) return exactMatch.id;
    
    // Try partial match if exact match fails
    const partialMatch = workstations.find(w => 
      w.name.toLowerCase().includes(name.toLowerCase()) || 
      name.toLowerCase().includes(w.name.toLowerCase())
    );
    return partialMatch?.id;
  };

  const onSubmit = async (data: FormValues) => {
    try {
      // First create the project
      const newProject = await projectService.create({
        name: data.name,
        client: data.client,
        description: data.description || null,
        start_date: format(data.start_date, 'yyyy-MM-dd'),
        installation_date: format(data.installation_date, 'yyyy-MM-dd'),
        status: 'planned',
        progress: 0,
      });
      
      // Create a generic phase for these tasks
      const phase = await phaseService.create({
        project_id: newProject.id,
        name: 'Project Tasks',
        start_date: format(data.start_date, 'yyyy-MM-dd'),
        end_date: format(data.installation_date, 'yyyy-MM-dd'),
        progress: 0
      });
      
      // Calculate days between start and installation
      const totalDays = Math.ceil(
        (data.installation_date.getTime() - data.start_date.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Calculate task distribution across the project timeline
      const selectedTasks = tasks.filter(task => task.selected);
      const daysPerTask = Math.max(1, Math.floor(totalDays / selectedTasks.length));
      
      // Create all tasks with proper timing and link to workstations
      for (let index = 0; index < selectedTasks.length; index++) {
        const task = selectedTasks[index];
        const taskStartDate = new Date(data.start_date);
        taskStartDate.setDate(data.start_date.getDate() + (index * daysPerTask));
        
        // Create a task name with the ID prefix and duration
        const durationText = task.duration ? ` (${task.duration} min)` : '';
        const taskName = `${task.id} - ${task.name}${durationText}`;
        
        // Simple mapping of workstations to standard categories
        let workstationType: 'CUTTING' | 'WELDING' | 'PAINTING' | 'ASSEMBLY' | 'PACKAGING' | 'SHIPPING' = 'ASSEMBLY';
        
        if (task.workstation.toLowerCase().includes('zaag')) {
          workstationType = 'CUTTING';
        } else if (task.workstation.toLowerCase().includes('cnc')) {
          workstationType = 'CUTTING';
        } else if (task.workstation.toLowerCase().includes('pers')) {
          workstationType = 'ASSEMBLY';
        } else if (task.workstation.toLowerCase().includes('productie')) {
          workstationType = 'ASSEMBLY';
        }
        
        // Create task description with duration and workstation info
        const taskDescription = `Duration: ${task.duration || 60} minutes\n${task.workstation ? `Workstation: ${task.workstation}` : ''}`;
        
        // Create the task
        const newTask = await taskService.create({
          phase_id: phase.id,
          assignee_id: null,
          title: taskName,
          description: taskDescription,
          workstation: workstationType,
          status: 'TODO',
          priority: index < 5 ? 'High' : index < 15 ? 'Medium' : 'Low',
          due_date: format(taskStartDate, 'yyyy-MM-dd')
        });
        
        // Link task to workstation if we can find a matching workstation
        const workstationId = findWorkstationIdByName(task.workstation);
        if (workstationId && newTask.id) {
          try {
            await linkTaskToWorkstation(newTask.id, workstationId);
            console.log(`Linked task ${newTask.id} to workstation ${workstationId}`);
          } catch (error) {
            console.error(`Failed to link task ${newTask.id} to workstation ${workstationId}:`, error);
          }
        }
      }
      
      toast({
        title: "Success",
        description: `Project created successfully with ${selectedTasks.length} tasks`,
      });
      
      form.reset();
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to create project: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Kitchen Pro - Client XYZ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="client"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <FormControl>
                      <Input placeholder="Client Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Project details..." 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="project_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Value (1-100)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        max="100" 
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="installation_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Installation Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => 
                              date < new Date("1900-01-01") ||
                              (form.getValues("start_date") && date < form.getValues("start_date"))
                            }
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border rounded-md p-4">
                <h3 className="font-medium mb-2">Project Tasks</h3>
                
                {loading ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto pr-2">
                    {tasks.map((task, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`task-${index}`} 
                          checked={task.selected} 
                          onCheckedChange={() => handleToggleTask(index)} 
                        />
                        <label htmlFor={`task-${index}`} className="text-sm flex-1 flex flex-wrap items-center">
                          <span className="mr-1">{task.id} - {task.name}</span>
                          {task.workstation && <span className="text-muted-foreground mr-2">({task.workstation})</span>}
                          {task.duration && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                              {task.duration} min
                            </span>
                          )}
                        </label>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemoveTask(index)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="grid grid-cols-1 gap-2 mt-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="New task name"
                      value={newTaskName}
                      onChange={(e) => setNewTaskName(e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Workstation (optional)"
                      value={newTaskWorkstation}
                      onChange={(e) => setNewTaskWorkstation(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      size="icon" 
                      onClick={handleAddCustomTask}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Create Project</Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default NewProjectModal;

// Modify the problematic functions by using direct Supabase queries
// Instead of:
// const workstationsForTask = await workstationService.getWorkstationsForStandardTask(task.id);

// Use:
const getWorkstationsForStandardTask = async (taskId: string) => {
  const { data, error } = await supabase
    .from('standard_task_workstation_links')
    .select('workstation_id')
    .eq('standard_task_id', taskId);
  
  if (error) throw error;
  return data?.map(link => link.workstation_id) || [];
};

// And instead of:
// await workstationService.linkTaskToWorkstation(taskId, workstation);

// Use:
const linkTaskToWorkstation = async (taskId: string, workstationId: string) => {
  const { error } = await supabase
    .from('task_workstation_links')
    .insert({
      task_id: taskId,
      workstation_id: workstationId
    });
  
  if (error) throw error;
};
