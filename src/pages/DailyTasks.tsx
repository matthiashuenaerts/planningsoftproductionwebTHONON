
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import TaskList from '@/components/TaskList';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { taskService, Task } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const DailyTasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Format the selected date to match our date string format
  const formattedSelectedDate = selectedDate 
    ? selectedDate.toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  // Fetch tasks when date changes
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        
        // Get tasks scheduled for the selected date
        const fetchedTasks = await taskService.getByDueDate(formattedSelectedDate);
        setTasks(fetchedTasks);
      } catch (error: any) {
        console.error('Error fetching tasks:', error);
        toast({
          title: "Error",
          description: `Failed to load tasks: ${error.message}`,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
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
          <h1 className="text-2xl font-bold mb-6">Daily Tasks</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Date</CardTitle>
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
                <CardHeader>
                  <CardTitle>
                    Tasks for {selectedDate ? formatDate(formattedSelectedDate) : 'Today'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center p-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                  ) : tasks.length > 0 ? (
                    <TaskList tasks={tasks} title="" />
                  ) : (
                    <p className="text-muted-foreground">No tasks scheduled for this day.</p>
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

export default DailyTasks;
