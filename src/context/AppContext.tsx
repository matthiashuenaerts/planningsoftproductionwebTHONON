
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { 
  Project, 
  Task, 
  Status, 
  projects as mockProjects, 
  users as mockUsers, 
  WorkstationType,
  getTasksByWorkstation,
  getTodaysTasks,
  getAllTasks
} from '@/lib/mockData';

interface AppContextType {
  projects: Project[];
  currentUser: string;
  viewingWorkstation: WorkstationType | null;
  tasks: Task[];
  todaysTasks: Task[];
  setCurrentUser: (userId: string) => void;
  updateTaskStatus: (taskId: string, status: Status) => void;
  setViewingWorkstation: (workstation: WorkstationType | null) => void;
  getProjectById: (id: string) => Project | undefined;
  getTasksForWorkstation: (workstation: WorkstationType) => Task[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [currentUser, setCurrentUser] = useState<string>("user-1"); // Default to first user
  const [viewingWorkstation, setViewingWorkstation] = useState<WorkstationType | null>(null);
  const [tasks, setTasks] = useState<Task[]>(getAllTasks());
  const [todaysTasks, setTodaysTasks] = useState<Task[]>(getTodaysTasks());

  const updateTaskStatus = (taskId: string, status: Status) => {
    const updatedProjects = [...projects];
    
    // Find the task and update its status
    for (const project of updatedProjects) {
      for (const phase of project.phases) {
        const taskIndex = phase.tasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
          phase.tasks[taskIndex] = {
            ...phase.tasks[taskIndex],
            status
          };
          
          // Recalculate phase progress
          const completedTasks = phase.tasks.filter(task => task.status === Status.COMPLETED).length;
          phase.progress = phase.tasks.length ? Math.round((completedTasks / phase.tasks.length) * 100) : 0;
          
          // Recalculate project progress
          const completedPhases = project.phases.reduce((sum, phase) => sum + phase.progress, 0);
          project.progress = Math.round(completedPhases / (project.phases.length * 100) * 100);
          
          break;
        }
      }
    }
    
    setProjects(updatedProjects);
    setTasks(getAllTasks());
    setTodaysTasks(getTodaysTasks());
  };
  
  const getProjectById = (id: string) => {
    return projects.find(project => project.id === id);
  };
  
  const getTasksForWorkstation = (workstation: WorkstationType) => {
    return getTasksByWorkstation(workstation);
  };

  return (
    <AppContext.Provider 
      value={{ 
        projects, 
        currentUser, 
        viewingWorkstation, 
        tasks, 
        todaysTasks, 
        setCurrentUser, 
        updateTaskStatus, 
        setViewingWorkstation, 
        getProjectById, 
        getTasksForWorkstation 
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
