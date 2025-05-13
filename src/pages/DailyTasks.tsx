import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, parseISO } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import TeamCalendar from '@/components/TeamCalendar';
import { Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem } from '@/components/ui/menubar';
import { useLanguage } from '@/context/LanguageContext';
import { Project, ProjectTeamAssignment } from '@/types/project';

interface CalendarProject extends Project {
  team?: string;
  duration: number;
  assignment_start_date?: string;
}

const DailyTasks: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'team'>('month');
  const [projects, setProjects] = useState<CalendarProject[]>([]);
  const [allProjects, setAllProjects] = useState<CalendarProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState<Date>(new Date());
  const { toast } = useToast();
  const { t } = useLanguage();

  // Format the selected date to match our date format in the database
  const formattedSelectedDate = selectedDate 
    ? selectedDate.toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

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
        
        setAllProjects(enhancedProjects);
        
        // Filter projects for the selected date
        filterProjectsForSelectedDate(selectedDate, enhancedProjects);
      } catch (error: any) {
        console.error('Error fetching projects:', error);
        toast({
          title: "Error",
          description: `Failed to load projects: ${error.message}`,
          variant: "destructive"
        });
        setAllProjects([]);
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
      // Check if table exists before querying - this is the fix for the error
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

  // Filter projects when selected date changes
  useEffect(() => {
    filterProjectsForSelectedDate(selectedDate, allProjects);
  }, [selectedDate, allProjects]);

  // Filter projects for selected date
  const filterProjectsForSelectedDate = (date: Date | undefined, allProjectsData: CalendarProject[]) => {
    if (!date) {
      setProjects([]);
      return;
    }
    
    const dateString = date.toISOString().split('T')[0];
    const filtered = allProjectsData.filter(project => {
      // If project has a team assignment, check if it falls within the project duration
      if (project.team && project.assignment_start_date) {
        const startDate = new Date(project.assignment_start_date);
        const endDate = addDays(startDate, project.duration - 1);
        const checkDate = new Date(dateString);
        
        return checkDate >= startDate && checkDate <= endDate;
      }
      
      // Otherwise use the original installation date
      return project.installation_date === dateString;
    });
    
    setProjects(filtered);
  };

  // Generate week view dates
  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      dates.push(addDays(weekStart, i));
    }
    return dates;
  };

  const weekDates = getWeekDates();

  // Navigate to previous week
  const prevWeek = () => {
    setWeekStart(addDays(weekStart, -7));
  };

  // Navigate to next week
  const nextWeek = () => {
    setWeekStart(addDays(weekStart, 7));
  };

  // Get projects for a specific date
  const getProjectsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return allProjects.filter(project => {
      // Check if project is scheduled for this date based on team assignment
      if (project.team && project.assignment_start_date) {
        const startDate = new Date(project.assignment_start_date);
        const endDate = addDays(startDate, project.duration - 1);
        
        return date >= startDate && date <= endDate;
      }
      
      // Fall back to installation date
      return project.installation_date === dateString;
    });
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Handler for clicking project
  const handleProjectClick = (projectId: string) => {
    window.location.href = `/projects/${projectId}`;
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
      const updatedProjects = await enhanceProjectsWithTeamData(allProjects);
      setAllProjects(updatedProjects);
      filterProjectsForSelectedDate(selectedDate, updatedProjects);
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

  // Function to get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
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
            <h1 className="text-2xl font-bold">{t.common.installationCalendar}</h1>
            
            <div className="flex mt-4 md:mt-0 space-x-2">
              <Button 
                variant={calendarView === 'month' ? 'default' : 'outline'}
                onClick={() => setCalendarView('month')}
              >
                Month View
              </Button>
              <Button 
                variant={calendarView === 'week' ? 'default' : 'outline'}
                onClick={() => setCalendarView('week')}
              >
                Week View
              </Button>
              <Button 
                variant={calendarView === 'team' ? 'default' : 'outline'}
                onClick={() => setCalendarView('team')}
              >
                Team Planning
              </Button>
            </div>
          </div>
          
          {calendarView === 'month' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CalendarIcon className="mr-2 h-5 w-5" />
                    Calendar
                  </CardTitle>
                  <CardDescription>
                    Select a date to view installations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border w-full"
                    // Add decorator dots to dates with projects
                    modifiers={{
                      hasProjects: allProjects.map(p => new Date(p.installation_date))
                    }}
                    modifiersClassNames={{
                      hasProjects: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary"
                    }}
                  />
                </CardContent>
              </Card>
              
              <div className="lg:col-span-2">
                <Card className="h-full">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <CalendarDays className="mr-2 h-5 w-5" />
                        Installations for {selectedDate ? formatDate(formattedSelectedDate) : 'Today'}
                      </CardTitle>
                      <CardDescription>
                        {projects.length} {projects.length === 1 ? 'project' : 'projects'} scheduled
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                      </div>
                    ) : projects.length > 0 ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        {projects.map(project => (
                          <div 
                            key={project.id} 
                            className="rounded-lg border overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => handleProjectClick(project.id)}
                          >
                            <div className="bg-primary/5 p-4">
                              <div className="flex justify-between items-start">
                                <h3 className="font-medium text-lg mb-1 truncate">{project.name}</h3>
                                <Badge className={cn("ml-2", getStatusColor(project.status))}>
                                  {project.status}
                                </Badge>
                              </div>
                              <p className="text-muted-foreground truncate">{project.client}</p>
                            </div>
                            
                            <div className="p-4">
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Installation:</span>
                                  <span className="font-medium">{formatDate(project.installation_date)}</span>
                                </div>
                                
                                {project.team && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Team:</span>
                                    <Badge className={cn(
                                      project.team === 'green' ? 'bg-green-100 text-green-800' :
                                      project.team === 'blue' ? 'bg-blue-100 text-blue-800' :
                                      'bg-orange-100 text-orange-800'
                                    )}>
                                      {project.team} team
                                    </Badge>
                                  </div>
                                )}
                                
                                <div className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Progress:</span>
                                    <span>{project.progress || 0}%</span>
                                  </div>
                                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-primary rounded-full"
                                      style={{ width: `${project.progress || 0}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 px-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <CalendarDays className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                        <p className="text-lg font-medium text-gray-600 mb-1">No installations scheduled</p>
                        <p className="text-muted-foreground max-w-sm mx-auto">
                          There are no projects scheduled for installation on this date.
                          Select a different date or create a new project.
                        </p>
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => window.location.href = '/projects'}
                        >
                          View All Projects
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : calendarView === 'week' ? (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle>Week View</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="icon" onClick={prevWeek}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">
                      {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
                    </span>
                    <Button variant="outline" size="icon" onClick={nextWeek}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  Calendar view of project installations for the week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2 mt-2">
                  {weekDates.map((date, i) => (
                    <div key={i} className="text-center">
                      <div className="mb-1 font-medium text-sm">{format(date, 'EEE')}</div>
                      <div 
                        className={cn(
                          "p-2 rounded-full w-8 h-8 mx-auto flex items-center justify-center text-sm",
                          new Date().toDateString() === date.toDateString() 
                            ? "bg-primary text-primary-foreground" 
                            : "text-gray-700"
                        )}
                      >
                        {format(date, 'd')}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-2 mt-2">
                  {weekDates.map((date, i) => {
                    const dateProjects = getProjectsForDate(date);
                    return (
                      <div 
                        key={i} 
                        className={cn(
                          "border rounded-md min-h-[120px] p-1",
                          dateProjects.length > 0 ? "bg-primary/5" : "",
                          selectedDate && date.toDateString() === selectedDate.toDateString() 
                            ? "ring-2 ring-primary" 
                            : ""
                        )}
                        onClick={() => setSelectedDate(date)}
                      >
                        {dateProjects.length > 0 ? (
                          <div className="space-y-1">
                            {dateProjects.map(project => (
                              <div 
                                key={project.id}
                                className="p-1 rounded bg-white shadow-sm border text-xs cursor-pointer hover:bg-gray-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProjectClick(project.id);
                                }}
                              >
                                <div className="font-medium truncate">{project.name}</div>
                                <div className="text-muted-foreground truncate">{project.client}</div>
                                {project.team && (
                                  <Badge className={cn(
                                    "mt-1",
                                    project.team === 'green' ? 'bg-green-100 text-green-800' :
                                    project.team === 'blue' ? 'bg-blue-100 text-blue-800' :
                                    'bg-orange-100 text-orange-800'
                                  )}>
                                    {project.team}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                            No installations
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {loading && (
                  <div className="flex justify-center mt-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <TeamCalendar 
              projects={allProjects}
              selectedDate={selectedDate || new Date()}
              onAssignTeam={handleAssignTeam}
            />
          )}
          
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Installations</CardTitle>
                <CardDescription>
                  Projects scheduled for installation in the next 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
                    
                    {allProjects.length > 0 ? (
                      <div className="space-y-4">
                        {allProjects
                          .slice(0, 10)
                          .map(project => {
                          const installationDate = new Date(project.installation_date);
                          const isUpcoming = installationDate >= new Date();
                          
                          return (
                            <div 
                              key={project.id}
                              className="relative pl-10 cursor-pointer hover:bg-gray-50 p-2 rounded"
                              onClick={() => handleProjectClick(project.id)}
                            >
                              <div className={cn(
                                "absolute left-3 top-2 w-3 h-3 rounded-full border-2 border-white",
                                isUpcoming ? "bg-primary" : "bg-gray-400"
                              )} />
                              
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                                <div>
                                  <div className="text-sm text-muted-foreground">
                                    {formatDate(project.installation_date)}
                                  </div>
                                  <div className="font-medium">{project.name}</div>
                                  <div className="text-sm text-muted-foreground">{project.client}</div>
                                </div>
                                
                                <div className="mt-2 sm:mt-0 flex items-center space-x-2">
                                  <Badge className={getStatusColor(project.status)}>
                                    {project.status}
                                  </Badge>
                                  
                                  {project.team && (
                                    <Badge className={cn(
                                      project.team === 'green' ? 'bg-green-100 text-green-800' :
                                      project.team === 'blue' ? 'bg-blue-100 text-blue-800' :
                                      'bg-orange-100 text-orange-800'
                                    )}>
                                      {project.team} team
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No upcoming installations found.
                      </div>
                    )}
                    
                    {allProjects.length > 10 && (
                      <div className="text-center mt-4">
                        <Button 
                          variant="outline"
                          onClick={() => window.location.href = '/projects'}
                        >
                          View All Projects
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyTasks;
