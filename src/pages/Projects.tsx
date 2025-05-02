import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ProjectCard from '@/components/ProjectCard';
import Timeline from '@/components/Timeline';
import TaskList from '@/components/TaskList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import NewProjectModal from '@/components/NewProjectModal';
import { projectService, phaseService, taskService, Project, Phase, Task, authService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { toast } = useToast();

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      const session = await authService.getSession();
      if (session) {
        setIsLoggedIn(true);
        fetchProjects();
      } else {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // Function to handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await authService.signIn(email, password);
      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        setIsLoggedIn(true);
        fetchProjects();
        toast({
          title: "Success",
          description: "Logged in successfully",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to login: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  // Function to handle signup
  const handleSignup = async () => {
    try {
      const { error } = await authService.signUp(email, password);
      if (error) {
        toast({
          title: "Sign Up Failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Account created successfully. Please check your email to confirm your registration.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to sign up: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  // Function to fetch all projects
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await projectService.getAll();
      setProjects(data);
      
      if (data.length > 0) {
        // If we already have a selected project, keep it selected if it still exists
        if (selectedProject) {
          const stillExists = data.find(p => p.id === selectedProject.id);
          if (stillExists) {
            // Update the selected project with the latest data
            setSelectedProject(stillExists);
          } else {
            // If the selected project no longer exists, select the first one
            setSelectedProject(data[0]);
          }
        } else {
          // If no project is selected, select the first one
          setSelectedProject(data[0]);
        }
      } else {
        setSelectedProject(null);
      }
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to load projects: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch phases and tasks when selected project changes
  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!selectedProject) return;
      
      try {
        // Fetch phases for the selected project
        const phasesData = await phaseService.getByProject(selectedProject.id);
        setPhases(phasesData);
        
        // Fetch tasks for all phases
        const tasksPromises = phasesData.map(phase => 
          taskService.getByPhase(phase.id)
        );
        
        const tasksResults = await Promise.all(tasksPromises);
        const allTasks = tasksResults.flat();
        setTasks(allTasks);
        
      } catch (error: any) {
        toast({
          title: "Error",
          description: `Failed to load project details: ${error.message}`,
          variant: "destructive"
        });
      }
    };

    fetchProjectDetails();
  }, [selectedProject, toast]);

  // Format dates for display
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <div className="w-64 bg-sidebar fixed top-0 bottom-0">
          <Navbar />
        </div>
        <div className="ml-64 w-full p-6 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen">
        <div className="w-64 bg-sidebar fixed top-0 bottom-0">
          <Navbar />
        </div>
        <div className="ml-64 w-full p-6 flex justify-center items-center">
          <Card className="w-[350px]">
            <CardHeader>
              <CardTitle>Login</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <Input 
                    id="email"
                    type="email" 
                    placeholder="Email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">Password</label>
                  <Input 
                    id="password"
                    type="password" 
                    placeholder="Password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Button type="submit" className="w-full">Login</Button>
                  <Button type="button" variant="outline" className="w-full" onClick={handleSignup}>Sign Up</Button>
                  <p className="text-xs text-center text-gray-500 mt-2">
                    For testing purposes, you can create any email/password
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <div className="w-64 bg-sidebar fixed top-0 bottom-0">
        <Navbar />
      </div>
      <div className="ml-64 w-full p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Projects</h1>
            <Button
              onClick={() => setIsNewProjectModalOpen(true)}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Add Project
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-3 xl:col-span-1">
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-1 gap-4">
                {projects.length > 0 ? (
                  projects.map((project) => (
                    <div key={project.id} onClick={() => setSelectedProject(project)} className="cursor-pointer">
                      <ProjectCard project={project} />
                    </div>
                  ))
                ) : (
                  <div className="md:col-span-3 p-6 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-muted-foreground">No projects found. Create your first project to get started.</p>
                    <Button 
                      variant="outline"
                      className="mt-4"
                      onClick={() => setIsNewProjectModalOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Create Project
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="md:col-span-3 xl:col-span-2">
              {selectedProject && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedProject.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-4">{selectedProject.description}</p>
                      <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div className="flex justify-between md:block">
                          <dt className="text-muted-foreground">Client</dt>
                          <dd>{selectedProject.client}</dd>
                        </div>
                        <div className="flex justify-between md:block">
                          <dt className="text-muted-foreground">Start Date</dt>
                          <dd>{formatDate(selectedProject.start_date)}</dd>
                        </div>
                        <div className="flex justify-between md:block">
                          <dt className="text-muted-foreground">Installation Date</dt>
                          <dd>{formatDate(selectedProject.installation_date)}</dd>
                        </div>
                        <div className="flex justify-between md:block">
                          <dt className="text-muted-foreground">Progress</dt>
                          <dd>{selectedProject.progress}% Complete</dd>
                        </div>
                        <div className="flex justify-between md:block">
                          <dt className="text-muted-foreground">Status</dt>
                          <dd>{selectedProject.status}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                  
                  {/* Temporarily comment out Timeline until we update it
                  <Timeline project={selectedProject} /> */}
                  
                  <Tabs defaultValue="tasks">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="tasks">Tasks</TabsTrigger>
                      <TabsTrigger value="phases">Phases</TabsTrigger>
                    </TabsList>
                    <TabsContent value="tasks" className="mt-4">
                      <TaskList 
                        tasks={tasks}
                        title="Project Tasks" 
                      />
                    </TabsContent>
                    <TabsContent value="phases" className="mt-4">
                      <div className="space-y-4">
                        {phases.map(phase => (
                          <Card key={phase.id}>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base">{phase.name} ({phase.progress}%)</CardTitle>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(phase.start_date)} - {formatDate(phase.end_date)}
                              </p>
                            </CardHeader>
                            <CardContent className="pb-2">
                              <TaskList 
                                tasks={tasks.filter(t => t.phase_id === phase.id)} 
                                title={`${phase.name} Tasks`} 
                              />
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <NewProjectModal 
        open={isNewProjectModalOpen} 
        onOpenChange={setIsNewProjectModalOpen} 
        onSuccess={fetchProjects}
      />
    </div>
  );
};

export default Projects;
