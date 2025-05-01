
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
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import PlanningTimeline from '@/components/PlanningTimeline';
import PlanningControls from '@/components/PlanningControls';
import { employeeService } from '@/services/dataService';
import { planningService } from '@/services/planningService';

const Planning = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const { currentEmployee } = useAuth();
  const { toast } = useToast();

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
    if (currentEmployee?.role !== 'admin') {
      toast({
        title: "Permission Denied",
        description: "Only administrators can generate plans",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsGeneratingPlan(true);
      
      // In a real implementation, this would call a backend function
      // to generate a plan based on open tasks and employee availability
      await planningService.generateDailyPlan(selectedDate);
      
      toast({
        title: "Success",
        description: "Daily plan has been generated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to generate plan: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Daily Planning</h1>
          <p className="text-slate-600 mt-1">Manage employee tasks and schedules</p>
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
          
          {currentEmployee?.role === 'admin' && (
            <PlanningControls 
              selectedDate={selectedDate}
              onGeneratePlan={handleGeneratePlan}
              isGenerating={isGeneratingPlan}
            />
          )}
        </div>
      </div>

      <PlanningTimeline 
        selectedDate={selectedDate}
        employees={employees}
        isAdmin={currentEmployee?.role === 'admin'}
      />
    </div>
  );
};

export default Planning;
