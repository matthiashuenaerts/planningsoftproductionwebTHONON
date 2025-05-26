
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import Navbar from '@/components/Navbar';
import ProjectCard from '@/components/ProjectCard';
import NewProjectModal from '@/components/NewProjectModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const { currentEmployee } = useAuth();
  const isMobile = useIsMobile();
  
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching projects:', error);
    } else {
      setProjects(data || []);
    }
  };

  const handleProjectCreated = () => {
    fetchProjects();
    setShowNewProjectModal(false);
  };

  const canCreateProject = currentEmployee && ['admin', 'manager', 'installation_team'].includes(currentEmployee.role);

  return (
    <div className="flex min-h-screen">
      {!isMobile && (
        <div className="w-64 bg-sidebar fixed top-0 bottom-0">
          <Navbar />
        </div>
      )}
      {isMobile && <Navbar />}
      <div className={`${isMobile ? 'pt-16' : 'ml-64'} w-full p-6`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Projects</h1>
            {canCreateProject && (
              <Button onClick={() => setShowNewProjectModal(true)}>
                <Plus className="mr-2 h-4 w-4" /> New Project
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
          
          {showNewProjectModal && (
            <NewProjectModal
              open={showNewProjectModal}
              onClose={() => setShowNewProjectModal(false)}
              onProjectCreated={handleProjectCreated}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Projects;
