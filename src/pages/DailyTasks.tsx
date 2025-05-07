
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { projectService } from '@/services/dataService';
import ProjectCard from '@/components/ProjectCard';
import { CalendarDays } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const InstallationCalendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Format the selected date to match our date format in the database
  const formattedSelectedDate = selectedDate 
    ? selectedDate.toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  // Fetch projects scheduled for installation on the selected date
  useEffect(() => {
    const fetchProjectsForInstallation = async () => {
      try {
        setLoading(true);
        
        // Get projects with installation date matching the selected date
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('installation_date', formattedSelectedDate);
        
        if (error) throw error;
        
        setProjects(data || []);
      } catch (error: any) {
        console.error('Error fetching projects:', error);
        toast({
          title: "Error",
          description: `Failed to load installation projects: ${error.message}`,
          variant: "destructive"
        });
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectsForInstallation();
  }, [formattedSelectedDate, toast]);

  // Helper function to format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="w-64 bg-sidebar fixed top-0 bottom-0">
        <Navbar />
      </div>
      <div className="ml-64 w-full p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Installation Calendar</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Installation Date</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border w-full"
                />
              </CardContent>
            </Card>
            
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <CalendarDays className="mr-2 h-5 w-5" />
                      Installations for {selectedDate ? formatDate(formattedSelectedDate) : 'Today'}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center p-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                  ) : projects.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                      {projects.map(project => (
                        <div 
                          key={project.id} 
                          className="cursor-pointer"
                          onClick={() => window.location.href = `/projects/${project.id}`}
                        >
                          <ProjectCard project={project} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No installations scheduled for this day.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallationCalendar;
