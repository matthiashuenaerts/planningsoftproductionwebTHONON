
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Task } from '@/services/dataService';
import { Calendar, User, AlertCircle, Zap, Clock, CheckCircle, Pause } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onTaskUpdate?: (task: Task) => void;
  showRushOrderBadge?: boolean;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, onTaskUpdate, showRushOrderBadge = false }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TODO': return 'bg-blue-500';
      case 'IN_PROGRESS': return 'bg-yellow-500';
      case 'COMPLETED': return 'bg-green-500';
      case 'HOLD': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'TODO': return <Clock className="h-4 w-4" />;
      case 'IN_PROGRESS': return <AlertCircle className="h-4 w-4" />;
      case 'COMPLETED': return <CheckCircle className="h-4 w-4" />;
      case 'HOLD': return <Pause className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const handleStatusChange = (task: Task, newStatus: "TODO" | "IN_PROGRESS" | "COMPLETED" | "HOLD") => {
    if (onTaskUpdate) {
      const updatedTask = { ...task, status: newStatus };
      if (newStatus === 'COMPLETED') {
        updatedTask.completed_at = new Date().toISOString();
      }
      onTaskUpdate(updatedTask);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No tasks found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card 
          key={task.id} 
          className={`${task.is_rush_order && showRushOrderBadge ? 'border-red-500 border-2' : ''} ${task.status === 'HOLD' ? 'border-orange-300' : ''}`}
        >
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">{task.title}</CardTitle>
              <div className="flex gap-2">
                {task.is_rush_order && showRushOrderBadge && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Rush Order
                  </Badge>
                )}
                <Badge 
                  className={`${getPriorityColor(task.priority)} text-white`}
                >
                  {task.priority}
                </Badge>
                <Badge 
                  className={`${getStatusColor(task.status)} text-white flex items-center gap-1`}
                >
                  {getStatusIcon(task.status)}
                  {task.status === 'HOLD' ? 'On Hold' : task.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {task.description && (
              <p className="text-gray-600 mb-4">{task.description}</p>
            )}
            
            {task.status === 'HOLD' && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                <p className="text-orange-800 text-sm flex items-center gap-2">
                  <Pause className="h-4 w-4" />
                  This task is on hold because required limit phases are not yet completed.
                </p>
              </div>
            )}
            
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
              </div>
              {task.assignee_id && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>Assigned</span>
                </div>
              )}
              {task.project_name && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">Project: {task.project_name}</span>
                </div>
              )}
            </div>
            
            {onTaskUpdate && (
              <div className="flex gap-2">
                {task.status === 'TODO' && (
                  <Button 
                    size="sm" 
                    onClick={() => handleStatusChange(task, 'IN_PROGRESS')}
                  >
                    Start Task
                  </Button>
                )}
                {task.status === 'IN_PROGRESS' && (
                  <>
                    <Button 
                      size="sm" 
                      onClick={() => handleStatusChange(task, 'COMPLETED')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Complete
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleStatusChange(task, 'TODO')}
                    >
                      Back to Todo
                    </Button>
                  </>
                )}
                {task.status === 'COMPLETED' && task.completed_at && (
                  <div className="text-sm text-gray-500">
                    Completed: {new Date(task.completed_at).toLocaleString()}
                  </div>
                )}
                {task.status === 'HOLD' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    disabled
                    className="opacity-50"
                  >
                    Waiting for Limit Phases
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TaskList;
