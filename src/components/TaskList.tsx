
import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Task } from '@/services/dataService';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface TaskListProps {
  tasks: Task[];
  title: string;
  onTaskStatusChange?: (taskId: string, status: Task['status']) => void;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, title, onTaskStatusChange }) => {
  // Function to render the task status badge
  const renderStatusBadge = (status: Task['status']) => {
    switch(status) {
      case 'TODO':
        return <Badge variant="outline" className="bg-gray-100">To Do</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">In Progress</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Function to handle task status change
  const handleStatusChange = (taskId: string, newStatus: Task['status']) => {
    if (onTaskStatusChange) {
      onTaskStatusChange(taskId, newStatus);
    }
  };
  
  // Function to get available status transitions based on current status
  const getAvailableTransitions = (currentStatus: Task['status']) => {
    switch (currentStatus) {
      case 'TODO':
        return ['IN_PROGRESS', 'COMPLETED'];
      case 'IN_PROGRESS':
        return ['TODO', 'COMPLETED'];
      case 'COMPLETED':
        return ['TODO', 'IN_PROGRESS'];
      default:
        return [];
    }
  };

  // Function to render completion info if available
  const renderCompletionInfo = (task: Task) => {
    if (task.status === 'COMPLETED' && task.completed_by && task.completed_at) {
      return (
        <div className="mt-2 text-xs text-gray-500">
          Completed by: {task.completed_by_name || 'Unknown'} on {format(new Date(task.completed_at), 'PPpp')}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      {title && <h3 className="text-lg font-semibold mb-3">{title}</h3>}
      
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-gray-500">
            No tasks found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map(task => (
            <Card key={task.id} className="overflow-hidden">
              <div className="border-l-4 border-l-blue-500 p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-lg">{task.title}</h4>
                  <div>
                    {renderStatusBadge(task.status)}
                  </div>
                </div>
                
                {task.description && (
                  <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                )}
                
                {renderCompletionInfo(task)}
                
                {onTaskStatusChange && (
                  <div className="flex justify-between items-center mt-3">
                    <div className="text-sm text-muted-foreground">
                      Due: {new Date(task.due_date).toLocaleDateString()}
                    </div>
                    <div className="space-x-2">
                      {getAvailableTransitions(task.status).map(newStatus => (
                        <Button 
                          key={newStatus} 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleStatusChange(task.id, newStatus as Task['status'])}
                        >
                          Mark as {newStatus === 'TODO' ? 'To Do' : 
                                   newStatus === 'IN_PROGRESS' ? 'In Progress' : 'Completed'}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskList;
