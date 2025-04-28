
import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Project } from '@/lib/mockData';
import Navbar from '@/components/Navbar';
import ProjectCard from '@/components/ProjectCard';
import Timeline from '@/components/Timeline';
import TaskList from '@/components/TaskList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Projects: React.FC = () => {
  const { projects } = useAppContext();
  const [selectedProject, setSelectedProject] = useState<Project | null>(projects[0] || null);

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
                          <dd>{new Date(selectedProject.startDate).toLocaleDateString()}</dd>
                        </div>
                        <div className="flex justify-between md:block">
                          <dt className="text-muted-foreground">Installation Date</dt>
                          <dd>{new Date(selectedProject.installationDate).toLocaleDateString()}</dd>
                        </div>
                        <div className="flex justify-between md:block">
                          <dt className="text-muted-foreground">Progress</dt>
                          <dd>{selectedProject.progress}% Complete</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                  
                  <Timeline project={selectedProject} />
                  
                  <Tabs defaultValue="tasks">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="tasks">Tasks</TabsTrigger>
                      <TabsTrigger value="phases">Phases</TabsTrigger>
                    </TabsList>
                    <TabsContent value="tasks" className="mt-4">
                      <TaskList 
                        tasks={selectedProject.phases.flatMap(phase => phase.tasks)}
                        title="Project Tasks" 
                      />
                    </TabsContent>
                    <TabsContent value="phases" className="mt-4">
                      <div className="space-y-4">
                        {selectedProject.phases.map(phase => (
                          <Card key={phase.id}>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base">{phase.name} ({phase.progress}%)</CardTitle>
                              <p className="text-xs text-muted-foreground">
                                {new Date(phase.startDate).toLocaleDateString()} - {new Date(phase.endDate).toLocaleDateString()}
                              </p>
                            </CardHeader>
                            <CardContent className="pb-2">
                              <TaskList tasks={phase.tasks} title={`${phase.name} Tasks`} />
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
