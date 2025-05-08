import React, { useState, useEffect } from 'react';
import ProjectCard from './ProjectCard';
import TaskList from './TaskList';
import SeedDataButton from './SeedDataButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { projectService, taskService, Project, Task } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldCheck } from "lucide-react";

const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [todaysTasks, setTodaysTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { currentEmployee } = useAuth();
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch projects
        const projectsData = await projectService.getAll();
        setProjects(projectsData);
        
        // Fetch today's tasks
        const todaysTasksData = await taskService.getTodaysTasks();
        setTodaysTasks(todaysTasksData);
        
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: "Error",
          description: `Failed to load dashboard data: ${error.message}`,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [toast]);

  // Calculate statistics
  const totalProjects = projects.length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const inProgressProjects = projects.filter(p => p.status === 'in_progress').length;
  
  const overdueCount = todaysTasks.filter(task => 
    new Date(task.due_date) < new Date() && 
    task.status !== 'COMPLETED'
  ).length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div>
      {currentEmployee?.role === 'admin' && (
        <Alert className="mb-6 bg-blue-50 border border-blue-200">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          <AlertTitle className="text-blue-800">Administrator Account</AlertTitle>
          <AlertDescription className="text-blue-700">
            You are logged in as an administrator. You have access to user management functionality.
          </AlertDescription>
        </Alert>
      )}

      {projects.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md mb-6">
          <p className="text-yellow-800">No projects found. Initialize the database with sample data to get started.</p>
          <SeedDataButton />
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Projects" value={totalProjects.toString()} footer="Projects managed" />
        <StatCard 
          title="Project Completion" 
          value={`${completedProjects}/${totalProjects}`} 
          footer={`${inProgressProjects} in progress`} 
        />
        <StatCard 
          title="Tasks Today" 
          value={todaysTasks.length.toString()} 
          footer={`${overdueCount} overdue`} 
        />
        <StatCard 
          title="Upcoming Installations" 
          value={projects.filter(p => new Date(p.installation_date) > new Date()).length.toString()}
          footer="Installations scheduled" 
        />
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Active Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>

      <TaskList 
        tasks={todaysTasks} 
        title="Today's Tasks" 
        onTaskStatusChange={async (taskId, status) => {
          try {
            await taskService.update(taskId, { status });
            
            // Update local state
            setTodaysTasks(todaysTasks.map(task => 
              task.id === taskId ? { ...task, status } : task
            ));
            
            toast({
              title: "Task updated",
              description: "Task status has been successfully updated."
            });
          } catch (error: any) {
            toast({
              title: "Error",
              description: `Failed to update task: ${error.message}`,
              variant: "destructive"
            });
          }
        }}
      />
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  footer: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, footer }) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{footer}</p>
      </CardContent>
    </Card>
  );
};

export default Dashboard;
