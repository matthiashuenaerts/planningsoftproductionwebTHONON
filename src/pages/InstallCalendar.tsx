
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import TeamCalendar from '@/components/TeamCalendar';
import { Project, ProjectTeamAssignment } from '@/types/project';

interface CalendarProject extends Project {
  team?: string;
  duration: number;
  assignment_start_date?: string;
}

const InstallCalendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [projects, setProjects] = useState<CalendarProject[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch all projects with installation dates
  useEffect(() => {
    const fetchAllProjects = async () => {
      try {
        setLoading(true);
        
        // Get all projects with installation dates
        const { data: projectsData, error } = await supabase
          .from('projects')
          .select('*')
          .not('installation_date', 'is', null)
          .order('installation_date', { ascending: true });
        
        if (error) throw error;
        
        // Set default duration for projects
        let enhancedProjects = (projectsData || []).map(p => ({
          ...p,
          duration: 1 // Default duration
        })) as CalendarProject[];
        
        // Transform the data to include team and duration if available
        if (enhancedProjects.length > 0) {
          enhancedProjects = await enhanceProjectsWithTeamData(enhancedProjects);
        }
        
        setProjects(enhancedProjects);
      } catch (error: any) {
        console.error('Error fetching projects:', error);
        toast({
          title: "Error",
          description: `Failed to load projects: ${error.message}`,
          variant: "destructive"
        });
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllProjects();
  }, [toast]);

  // Enhance projects with team assignment data
  const enhanceProjectsWithTeamData = async (projects: CalendarProject[]): Promise<CalendarProject[]> => {
    try {
      const { data: projectTeamAssignments, error } = await supabase
        .from('project_team_assignments')
        .select('*');
      
      if (error) {
        console.error('Error fetching team assignments:', error);
        return projects;
      }
      
      // If we have team assignments, enhance the projects
      if (projectTeamAssignments && projectTeamAssignments.length > 0) {
        return projects.map(project => {
          const assignment = projectTeamAssignments.find(
            (a: ProjectTeamAssignment) => a.project_id === project.id
          );
          
          if (assignment) {
            return {
              ...project,
              team: assignment.team,
              duration: assignment.duration || 1,
              assignment_start_date: assignment.start_date
            };
          }
          return {
            ...project,
            duration: 1 // Default duration for projects without assignment
          };
        });
      }
      
      // Add default duration if no assignments
      return projects.map(project => ({
        ...project,
        duration: 1
      }));
    } catch (error) {
      console.error('Error enhancing projects with team data:', error);
      return projects.map(project => ({
        ...project,
        duration: 1
      }));
    }
  };

  // Assign project to team
  const handleAssignTeam = async (projectId: string, team: string, startDate: string, duration: number): Promise<void> => {
    try {
      // Check if there's an existing assignment
      const { data, error: fetchError } = await supabase
        .from('project_team_assignments')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }
      
      if (data) {
        // Update existing assignment
        const { error } = await supabase
          .from('project_team_assignments')
          .update({
            team,
            start_date: startDate,
            duration
          })
          .eq('project_id', projectId);
          
        if (error) throw error;
      } else {
        // Create new assignment
        const { error } = await supabase
          .from('project_team_assignments')
          .insert({
            project_id: projectId,
            team,
            start_date: startDate,
            duration
          });
          
        if (error) throw error;
      }
      
      // Refresh projects data
      const updatedProjects = await enhanceProjectsWithTeamData(projects);
      setProjects(updatedProjects);
      
      toast({
        title: "Success",
        description: `Project successfully assigned to ${team} team`,
      });
    } catch (error: any) {
      console.error('Error assigning team:', error);
      toast({
        title: "Error",
        description: `Failed to assign team: ${error.message}`,
        variant: "destructive"
      });
      throw error;
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="w-64 bg-sidebar fixed top-0 bottom-0">
        <Navbar />
      </div>
      <div className="ml-64 w-full p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Installation Calendar</h1>
              <p className="text-muted-foreground">
                Plan and schedule your installation teams
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <div className="text-sm font-medium">
                Current Date: {format(selectedDate, 'MMMM d, yyyy')}
              </div>
            </div>
          </div>

          {loading ? (
            <Card>
              <CardContent className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </CardContent>
            </Card>
          ) : (
            <TeamCalendar 
              projects={projects}
              selectedDate={selectedDate}
              onAssignTeam={handleAssignTeam}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallCalendar;
