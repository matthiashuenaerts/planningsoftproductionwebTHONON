
import React from 'react';
import { useAppContext } from '@/context/AppContext';
import ProjectCard from './ProjectCard';
import TaskList from './TaskList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTodaysTasks, Status, PhaseType } from '@/lib/mockData';

const Dashboard: React.FC = () => {
  const { projects, todaysTasks } = useAppContext();

  // Calculate statistics
  const totalProjects = projects.length;
  const completedProjects = projects.filter(p => p.progress === 100).length;
  const inProgressProjects = projects.filter(p => p.progress > 0 && p.progress < 100).length;
  
  const allTasks = projects.flatMap(p => p.phases.flatMap(phase => phase.tasks));
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => t.status === Status.COMPLETED).length;
  const inProgressTasks = allTasks.filter(t => t.status === Status.IN_PROGRESS).length;

  const tasksToday = getTodaysTasks();
  const overdueCount = allTasks.filter(task => 
    new Date(task.dueDate) < new Date() && 
    task.status !== Status.COMPLETED
  ).length;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Projects" value={totalProjects.toString()} footer="Projects managed" />
        <StatCard 
          title="Project Completion" 
          value={`${completedProjects}/${totalProjects}`} 
          footer={`${inProgressProjects} in progress`} 
        />
        <StatCard 
          title="Task Completion" 
          value={`${completedTasks}/${totalTasks}`} 
          footer={`${inProgressTasks} in progress`} 
        />
        <StatCard 
          title="Tasks Today" 
          value={tasksToday.length.toString()} 
          footer={`${overdueCount} overdue`} 
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

      <TaskList tasks={todaysTasks} title="Today's Tasks" />
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
