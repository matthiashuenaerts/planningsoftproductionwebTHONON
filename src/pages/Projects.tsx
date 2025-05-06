import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ProjectCard from '@/components/ProjectCard';
import Timeline from '@/components/Timeline';
import TaskList from '@/components/TaskList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft } from 'lucide-react';
import NewProjectModal from '@/components/NewProjectModal';
import { projectService, phaseService, taskService, Project, Phase, Task } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Function to fetch all projects
  const fetchProjects = async () => {
    try {
      const data = await projectService.getAll();
      setProjects(data);
      
      if (data.length > 0 && selectedProject) {
        // If we already have a selected project, keep it selected if it still exists
        const stillExists = data.find(p => p.id === selectedProject.id);
        if (stillExists) {
          // Update the selected project with the latest data
          setSelectedProject(stillExists);
        } else {
          // If the selected project no longer exists, clear the selection
          setSelectedProject(null);
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

  // Fetch projects on component mount
  useEffect(() => {
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
          {selectedProject ? (
            // Project details view
            <>
              <div className="flex justify-between items-center mb-4">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedProject(null)}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Projects
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => navigate(`/projects/${selectedProject.id}/orders`)}
                >
                  View Orders
                </Button>
              </div>
              
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
                
                {/* Temporarily comment out Timeline until we update it */}
                
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
            </>
          ) : (
            // Projects list view
            <div>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Projects</h1>
                <Button
                  onClick={() => setIsNewProjectModalOpen(true)}
                  className="flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" /> Add Project
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.length > 0 ? (
                  projects.map((project) => (
                    <div key={project.id} onClick={() => setSelectedProject(project)} className="cursor-pointer">
                      <ProjectCard project={project} />
                    </div>
                  ))
                ) : (
                  <div className="col-span-full p-6 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
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
          )}
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
