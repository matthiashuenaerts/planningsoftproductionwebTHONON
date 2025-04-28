
import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { getDate } from 'date-fns';
import Navbar from '@/components/Navbar';
import TaskList from '@/components/TaskList';
import { getAllTasks, formatDate } from '@/lib/mockData';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DailyTasks: React.FC = () => {
  const { tasks } = useAppContext();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Format the selected date to match our date string format
  const formattedSelectedDate = selectedDate 
    ? selectedDate.toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  // Get tasks for the selected date
  const tasksForSelectedDate = tasks.filter(task => task.dueDate === formattedSelectedDate);

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
                  {tasksForSelectedDate.length > 0 ? (
                    <TaskList tasks={tasksForSelectedDate} title="" />
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
