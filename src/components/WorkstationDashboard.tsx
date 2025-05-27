
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import TaskList from '@/components/TaskList';
import { Task } from '@/services/dataService';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const WorkstationDashboard = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select('*');

      if (error) throw error;

      if (tasksData) {
        // Get project info for each task
        const tasksWithProjectInfo = await Promise.all(
          tasksData.map(async (task) => {
            try {
              // Get phase data to get project id
              const { data: phaseData, error: phaseError } = await supabase
                .from('phases')
                .select('project_id, name')
                .eq('id', task.phase_id)
                .single();
              
              if (phaseError) throw phaseError;
              
              // Get project name
              const { data: projectData, error: projectError } = await supabase
                .from('projects')
                .select('name')
                .eq('id', phaseData.project_id)
                .single();
              
              if (projectError) throw projectError;
              
              return {
                ...task,
                project_name: projectData.name,
                priority: task.priority as "Low" | "Medium" | "High" | "Urgent",
                status: task.status as "TODO" | "IN_PROGRESS" | "COMPLETED" | "HOLD"
              } as Task;
            } catch (error) {
              console.error('Error fetching project info for task:', error);
              return {
                ...task,
                project_name: 'Unknown Project',
                priority: task.priority as "Low" | "Medium" | "High" | "Urgent",
                status: task.status as "TODO" | "IN_PROGRESS" | "COMPLETED" | "HOLD"
              } as Task;
            }
          })
        );
        
        setTasks(tasksWithProjectInfo);
      }
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: `Failed to load tasks: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTaskUpdate = async (updatedTask: Task) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: updatedTask.status,
          completed_at: updatedTask.completed_at,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedTask.id);

      if (error) throw error;

      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === updatedTask.id ? updatedTask : task
        )
      );

      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: `Failed to update task: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const todoTasks = tasks.filter(task => task.status === 'TODO');
  const inProgressTasks = tasks.filter(task => task.status === 'IN_PROGRESS');
  const completedTasks = tasks.filter(task => task.status === 'COMPLETED');
  const totalTasks = tasks.length;
  const completedPercentage = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">TODO</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{todoTasks.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{inProgressTasks.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedTasks.length}</div>
            <Progress value={completedPercentage} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              TODO Tasks
              <Badge variant="secondary">{todoTasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todoTasks.length > 0 ? (
              <TaskList tasks={todoTasks} onTaskUpdate={handleTaskUpdate} compact />
            ) : (
              <p className="text-gray-500 text-center py-4">No TODO tasks</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              In Progress Tasks
              <Badge variant="secondary">{inProgressTasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {inProgressTasks.length > 0 ? (
              <TaskList tasks={inProgressTasks} onTaskUpdate={handleTaskUpdate} compact />
            ) : (
              <p className="text-gray-500 text-center py-4">No tasks in progress</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkstationDashboard;
