import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Task } from '@/services/dataService';
import { workstationService } from '@/services/workstationService';
import { supabase } from '@/integrations/supabase/client';
import { StandardTask, standardTasksService } from '@/services/standardTasksService';

interface TaskListProps {
  tasks: Task[];
  title?: string;
  onTaskStatusChange?: (taskId: string, status: Task['status']) => void;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, title = "Tasks", onTaskStatusChange }) => {
  const [taskWorkstations, setTaskWorkstations] = useState<Record<string, string[]>>({});
  const [completedByNames, setCompletedByNames] = useState<Record<string, string>>({});
  const [standardTasksMap, setStandardTasksMap] = useState<Record<string, StandardTask>>({});
  
  useEffect(() => {
    const loadTaskWorkstations = async () => {
      const workstationMap: Record<string, string[]> = {};
      
      for (const task of tasks) {
        try {
          const { data } = await supabase
            .from('task_workstation_links')
            .select('workstations(name)')
            .eq('task_id', task.id);
          
          if (data && data.length > 0) {
            workstationMap[task.id] = data.map(item => item.workstations.name);
          } else {
            workstationMap[task.id] = [];
          }
        } catch (error) {
          console.error(`Error fetching workstations for task ${task.id}:`, error);
          workstationMap[task.id] = [];
        }
      }
      
      setTaskWorkstations(workstationMap);
    };

    const loadCompletedByNames = async () => {
      const namesMap: Record<string, string> = {};
      const completedTasks = tasks.filter(task => task.completed_by);
      
      for (const task of completedTasks) {
        if (!task.completed_by) continue;
        
        try {
          const { data, error } = await supabase
            .from('employees')
            .select('name')
            .eq('id', task.completed_by)
            .single();
          
          if (error) throw error;
          
          if (data) {
            namesMap[task.id] = data.name;
          }
        } catch (error) {
          console.error(`Error fetching employee name for task ${task.id}:`, error);
          namesMap[task.id] = 'Unknown';
        }
      }
      
      setCompletedByNames(namesMap);
    };

    // Load standard tasks info for task titles that start with a task number
    const loadStandardTasks = async () => {
      try {
        const standardTasks = await standardTasksService.getAll();
        const tasksMap: Record<string, StandardTask> = {};
        
        standardTasks.forEach(task => {
          tasksMap[task.task_number] = task;
        });
        
        setStandardTasksMap(tasksMap);
      } catch (error) {
        console.error('Error loading standard tasks:', error);
      }
    };
    
    if (tasks.length > 0) {
      loadTaskWorkstations();
      loadCompletedByNames();
      loadStandardTasks();
    }
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="mt-4">
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm">No tasks to display.</p>
      </div>
    );
  }

  // Helper function to format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Helper function to format datetime
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'MMM d, yyyy HH:mm');
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Helper function to get status color class
  const getTaskStatusClass = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(dueDate);
    taskDate.setHours(0, 0, 0, 0);
    
    if (taskDate < today) {
      return 'border-l-4 border-l-red-500';
    } else if (taskDate.getTime() === today.getTime()) {
      return 'border-l-4 border-l-yellow-500';
    }
    return '';
  };

  // Helper function to extract task number from a task title
  const extractTaskNumber = (title: string): string | null => {
    // Check if the title starts with a pattern like "01 - " or "01-" or just "01"
    const match = title.match(/^(\d{2})(?:\s*[-:]\s*|\s+)/);
    return match ? match[1] : null;
  };

  // Helper function to get the standard task information
  const getStandardTask = (task: Task): StandardTask | null => {
    const taskNumber = extractTaskNumber(task.title);
    return taskNumber && standardTasksMap[taskNumber] 
      ? standardTasksMap[taskNumber] 
      : null;
  };

  // Helper function to render task title with standard task info if available
  const renderTaskTitle = (task: Task) => {
    const standardTask = getStandardTask(task);
    
    if (!standardTask) {
      return task.title;
    }
    
    const taskNameParts = standardTasksService.getTaskNameParts(standardTask.task_name);
    
    // If there's only one part or no parts, just return the original title
    if (taskNameParts.length <= 1) {
      return task.title;
    }
    
    // Otherwise, render with the parts (category, action, location)
    return (
      <div>
        <span className="font-medium">{task.title}</span>
        <div className="text-xs text-muted-foreground mt-1">
          {taskNameParts.map((part, index) => (
            <span key={index} className="mr-1">
              {index > 0 && <span className="mx-1">→</span>}
              {part}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-4">
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <div className="space-y-3">
        {tasks.map((task) => (
          <Card key={task.id} className={`${getTaskStatusClass(task.due_date)}`}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium">
                  {renderTaskTitle(task)}
                </h4>
                <div className="flex gap-2 items-center">
                  <Badge 
                    variant="outline"
                    className={`
                      ${task.priority === 'High' || task.priority === 'Urgent' 
                        ? 'border-red-500 text-red-500' 
                        : 'border-gray-300 text-gray-500'
                      }
                    `}
                  >
                    {task.priority}
                  </Badge>
                  {onTaskStatusChange && (
                    <div>
                      <Select 
                        defaultValue={task.status} 
                        onValueChange={(value) => onTaskStatusChange(task.id, value as Task['status'])}
                      >
                        <SelectTrigger className="w-32 h-7 text-xs">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TODO" className="text-xs">TODO</SelectItem>
                          <SelectItem value="IN_PROGRESS" className="text-xs">IN_PROGRESS</SelectItem>
                          <SelectItem value="COMPLETED" className="text-xs">COMPLETED</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
              
              {task.status === 'COMPLETED' && task.completed_by && task.completed_at && (
                <div className="mb-3 text-sm bg-green-50 p-2 rounded border border-green-100">
                  <span className="font-medium text-green-700">Completed:</span> {formatDateTime(task.completed_at)} by {completedByNames[task.id] || 'Unknown'}
                </div>
              )}
              
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  {taskWorkstations[task.id]?.map(workstation => (
                    <Badge key={workstation} variant="secondary" className="font-normal">
                      {workstation}
                    </Badge>
                  ))}
                  {task.assignee_id && (
                    <span className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {/* This would be replaced with actual user data in a real implementation */}
                        {task.assignee_id.charAt(0)}
                      </div>
                      {/* Ideally we'd load employee name here */}
                    </span>
                  )}
                </div>
                <span>Due: {formatDate(task.due_date)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TaskList;
