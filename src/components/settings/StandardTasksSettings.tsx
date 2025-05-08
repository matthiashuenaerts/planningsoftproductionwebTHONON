
import React, { useState, useEffect } from 'react';
import { StandardTask, standardTasksService } from '@/services/standardTasksService';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

const StandardTasksSettings: React.FC = () => {
  const [standardTasks, setStandardTasks] = useState<StandardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchStandardTasks = async () => {
      try {
        const tasks = await standardTasksService.getAll();
        setStandardTasks(tasks);
      } catch (error) {
        console.error('Error loading standard tasks:', error);
        toast({
          title: 'Error loading standard tasks',
          description: 'Failed to load standard tasks. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStandardTasks();
  }, [toast]);

  const getTaskNameParts = (taskName: string): string[] => {
    return standardTasksService.getTaskNameParts(taskName);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">Standard Tasks</h2>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Task #</TableHead>
                <TableHead>Task Name</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standardTasks.map((task) => {
                const taskParts = getTaskNameParts(task.task_name);
                
                return (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.task_number}</TableCell>
                    <TableCell>{task.task_name}</TableCell>
                    <TableCell>
                      {taskParts.length > 1 ? (
                        <div className="text-xs text-muted-foreground">
                          {taskParts.map((part, index) => (
                            <span key={index} className="mr-1">
                              {index > 0 && <span className="mx-1">→</span>}
                              {part}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default StandardTasksSettings;
