
import React from 'react';
import { Task, Status, formatDate, getTaskStatusClass, users } from '@/lib/mockData';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TaskListProps {
  tasks: Task[];
  title?: string;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, title = "Tasks" }) => {
  const { updateTaskStatus } = useAppContext();

  const handleStatusChange = (taskId: string, status: string) => {
    updateTaskStatus(taskId, status as Status);
  };

  if (tasks.length === 0) {
    return (
      <div className="mt-4">
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm">No tasks to display.</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <div className="space-y-3">
        {tasks.map((task) => {
          const assignee = users.find(user => user.id === task.assignee);
          
          return (
            <Card key={task.id} className={`${getTaskStatusClass(task.dueDate)}`}>
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
                    <div>
                      <Select 
                        defaultValue={task.status} 
                        onValueChange={(value) => handleStatusChange(task.id, value)}
                      >
                        <SelectTrigger className="w-32 h-7 text-xs">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(Status).map((status) => (
                            <SelectItem key={status} value={status} className="text-xs">
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-normal">
                      {task.workstation}
                    </Badge>
                    {assignee && (
                      <span className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                          {assignee.avatar ? (
                            <img src={assignee.avatar} alt={assignee.name} className="w-full h-full object-cover" />
                          ) : (
                            assignee.name.charAt(0)
                          )}
                        </div>
                        {assignee.name}
                      </span>
                    )}
                  </div>
                  <span>Due: {formatDate(task.dueDate)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default TaskList;
