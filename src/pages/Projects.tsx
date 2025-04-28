
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ProjectCard from '@/components/ProjectCard';
import Timeline from '@/components/Timeline';
import TaskList from '@/components/TaskList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { projectService, phaseService, taskService, Project, Phase, Task } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch all projects on component mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await projectService.getAll();
        setProjects(data);
        
        if (data.length > 0) {
          setSelectedProject(data[0]);
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

    fetchProjects();
  }, [toast]);

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

  return (
    <div className="flex min-h-screen">
      <div className="w-64 bg-sidebar fixed top-0 bottom-0">
        <Navbar />
      </div>
      <div className="ml-64 w-full p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Projects</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-3 xl:col-span-1">
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-1 gap-4">
                {projects.map((project) => (
                  <div key={project.id} onClick={() => setSelectedProject(project)} className="cursor-pointer">
                    <ProjectCard project={project} />
                  </div>
                ))}
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
    </div>
  );
};

export default Projects;
