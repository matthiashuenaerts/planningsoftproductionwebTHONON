
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Task } from '@/services/dataService';

interface TaskListProps {
  tasks: Task[];
  title?: string;
  onTaskStatusChange?: (taskId: string, status: Task['status']) => void;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, title = "Tasks", onTaskStatusChange }) => {
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

  return (
    <div className="mt-4">
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <div className="space-y-3">
        {tasks.map((task) => (
          <Card key={task.id} className={`${getTaskStatusClass(task.due_date)}`}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium">{task.title}</h4>
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
              
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-normal">
                    {task.workstation}
                  </Badge>
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
