
import React, { useState, useEffect } from 'react';
import { format, startOfDay, addDays, isSameDay } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Calendar as CalendarIcon, 
  AlertCircle, 
  CheckCircle, 
  ListTodo,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import Navbar from '@/components/Navbar';
import PlanningTimeline from '@/components/PlanningTimeline';
import PlanningControls from '@/components/PlanningControls';
import { employeeService } from '@/services/dataService';
import { planningService } from '@/services/planningService';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const Planning = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isGeneratingPersonalPlan, setIsGeneratingPersonalPlan] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState<string | null>(null);
  const { currentEmployee } = useAuth();
  const { toast } = useToast();
  const isAdmin = currentEmployee?.role === 'admin';

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const employeeData = await employeeService.getAll();
        setEmployees(employeeData);
      } catch (error) {
        console.error('Error fetching employees:', error);
        toast({
          title: "Error",
          description: "Failed to load employee data",
          variant: "destructive"
        });
      }
    };

    fetchEmployees();
  }, [toast]);

  const handleGeneratePlan = async () => {
    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only administrators can generate plans",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsGeneratingPlan(true);
      setGenerationError(null);
      setGenerationSuccess(null);
      
      // Generate a plan based on open tasks and employee availability
      await planningService.generateDailyPlan(selectedDate);
      
      setGenerationSuccess("Daily plan has been successfully generated for all employees");
      toast({
        title: "Success",
        description: "Daily plan has been generated",
      });
    } catch (error: any) {
      console.error("Generate plan error:", error);
      setGenerationError(error.message || "Failed to generate plan");
      toast({
        title: "Error",
        description: `Failed to generate plan: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleGeneratePersonalPlan = async () => {
    if (!currentEmployee) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to create a personal plan",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsGeneratingPersonalPlan(true);
      setGenerationError(null);
      setGenerationSuccess(null);
      
      // Generate a plan based on personal tasks
      await planningService.generatePlanFromPersonalTasks(currentEmployee.id, selectedDate);
      
      setGenerationSuccess("Your personal daily plan has been generated based on your tasks");
      toast({
        title: "Success",
        description: "Your personal plan has been created",
      });
    } catch (error: any) {
      console.error("Generate personal plan error:", error);
      setGenerationError(error.message || "Failed to generate personal plan");
      toast({
        title: "Error",
        description: `Failed to generate personal plan: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPersonalPlan(false);
    }
  };

  // Clear messages when date changes
  useEffect(() => {
    setGenerationError(null);
    setGenerationSuccess(null);
  }, [selectedDate]);

  return (
    <div className="flex min-h-screen">
      <div className="w-64 bg-sidebar fixed top-0 bottom-0">
        <Navbar />
      </div>
      <div className="ml-64 w-full p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold">Daily Planning</h1>
              <p className="text-slate-600 mt-1">
                {isAdmin ? "Manage employee tasks and schedules" : "Your daily schedule"}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => setSelectedDate(date || new Date())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <div className="flex space-x-2">
                {isAdmin && (
                  <PlanningControls 
                    selectedDate={selectedDate}
                    onGeneratePlan={handleGeneratePlan}
                    isGenerating={isGeneratingPlan}
                  />
                )}
                
                <Button
                  variant="secondary"
                  onClick={handleGeneratePersonalPlan}
                  disabled={isGeneratingPersonalPlan}
                  className="whitespace-nowrap"
                >
                  {isGeneratingPersonalPlan ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <ListTodo className="mr-2 h-4 w-4" />
                      Plan My Day
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {generationError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{generationError}</AlertDescription>
            </Alert>
          )}
          
          {generationSuccess && (
            <Alert variant="default" className="mb-4 bg-green-50 text-green-800 border-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{generationSuccess}</AlertDescription>
            </Alert>
          )}

          <PlanningTimeline 
            selectedDate={selectedDate}
            employees={isAdmin ? employees : employees.filter(emp => emp.id === currentEmployee?.id)}
            isAdmin={isAdmin}
          />
          
          <div className="mt-4 text-sm text-slate-500">
            <p>Standard working hours:</p>
            <ul className="list-disc pl-5 mt-1">
              <li>Morning: 7:00 AM - 10:00 AM</li>
              <li>Mid-day: 10:15 AM - 12:30 PM</li>
              <li>Afternoon: 1:00 PM - 4:00 PM</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Planning;
