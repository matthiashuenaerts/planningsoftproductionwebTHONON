
import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';

// Schedule Type
export interface Schedule {
  id: string;
  employee_id: string;
  task_id?: string;
  phase_id?: string; // Add phase_id to associate schedules with project phases
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  is_auto_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduleInput {
  employee_id: string;
  task_id?: string;
  phase_id?: string; // Add phase_id to input interface
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  is_auto_generated: boolean;
}

export const planningService = {
  // Get schedules for a specific date
  async getSchedulesByDate(date: Date): Promise<Schedule[]> {
    const dateStr = format(date, 'yyyy-MM-dd');
    const startOfDay = `${dateStr}T00:00:00`;
    const endOfDay = `${dateStr}T23:59:59`;
    
    // Using any to bypass TypeScript's strict typing since the schedules table 
    // is not yet recognized in the auto-generated types
    const { data, error } = await (supabase as any)
      .from('schedules')
      .select(`
        *,
        employee:employees(id, name, role, workstation),
        task:tasks(id, title, description, priority, status),
        phase:phases(id, name, project_id, progress)
      `)
      .gte('start_time', startOfDay)
      .lte('start_time', endOfDay)
      .order('start_time');
    
    if (error) throw error;
    return (data || []) as Schedule[];
  },
  
  // Create a new schedule
  async createSchedule(schedule: CreateScheduleInput): Promise<Schedule> {
    // Using any to bypass TypeScript's strict typing
    const { data, error } = await (supabase as any)
      .from('schedules')
      .insert([schedule])
      .select()
      .single();
    
    if (error) throw error;
    return data as Schedule;
  },
  
  // Update a schedule
  async updateSchedule(id: string, schedule: Partial<Schedule>): Promise<Schedule> {
    // Using any to bypass TypeScript's strict typing
    const { data, error } = await (supabase as any)
      .from('schedules')
      .update(schedule)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Schedule;
  },
  
  // Delete a schedule
  async deleteSchedule(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .from('schedules')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
  
  // Generate a daily plan based on available tasks and employees
  async generateDailyPlan(date: Date): Promise<void> {
    // In a real application, this might be an edge function or a more complex algorithm
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // First, get the work periods for this day
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    const { data: workPeriods, error: workPeriodsError } = await supabase
      .from('work_hours')
      .select('*')
      .eq('day_of_week', dayOfWeek);
    
    if (workPeriodsError) throw workPeriodsError;
    
    if (!workPeriods?.length) {
      // No work periods defined for this day
      return;
    }
    
    // Get available tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .in('status', ['TODO', 'IN_PROGRESS'])
      .order('priority', { ascending: false });
    
    if (tasksError) throw tasksError;
    
    // Get active project phases
    const { data: phases, error: phasesError } = await supabase
      .from('phases')
      .select(`
        *,
        project:projects(id, name, status)
      `)
      .lt('progress', 100) // Only get incomplete phases
      .lte('start_date', dateStr) // Has already started or starts today
      .gte('end_date', dateStr);  // Hasn't ended yet
    
    if (phasesError) throw phasesError;
    
    // Get employees
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*');
    
    if (employeesError) throw employeesError;
    
    if (!employees?.length) {
      // No employees to assign tasks to
      return;
    }
    
    // Delete any existing auto-generated schedules for this date
    const { error: deleteError } = await (supabase as any)
      .from('schedules')
      .delete()
      .gte('start_time', `${dateStr}T00:00:00`)
      .lte('start_time', `${dateStr}T23:59:59`)
      .eq('is_auto_generated', true);
    
    if (deleteError) throw deleteError;
    
    const schedulesToInsert: CreateScheduleInput[] = [];
    
    // First, distribute tasks to employees with matching workstations
    for (const period of workPeriods) {
      const startTime = new Date(`${dateStr}T${period.start_time}`);
      const endTime = new Date(`${dateStr}T${period.end_time}`);
      
      // For each employee, try to assign a suitable task
      for (const employee of employees) {
        if (!employee.workstation) continue;
        
        // Find unassigned tasks for this employee's workstation
        const suitableTask = tasks?.find(task => 
          task.workstation === employee.workstation && 
          !schedulesToInsert.some(s => s.task_id === task.id)
        );
        
        if (suitableTask) {
          schedulesToInsert.push({
            employee_id: employee.id,
            task_id: suitableTask.id,
            title: suitableTask.title,
            description: suitableTask.description,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            is_auto_generated: true
          });
        }
      }
    }
    
    // Then, distribute project phases to available employees
    if (phases && phases.length > 0) {
      for (const period of workPeriods) {
        const startTime = new Date(`${dateStr}T${period.start_time}`);
        const endTime = new Date(`${dateStr}T${period.end_time}`);
        
        // For remaining employees without assigned tasks in this period
        const assignedEmployeesIds = schedulesToInsert
          .filter(s => 
            new Date(s.start_time).getTime() === startTime.getTime() && 
            new Date(s.end_time).getTime() === endTime.getTime()
          )
          .map(s => s.employee_id);
        
        const availableEmployees = employees.filter(emp => 
          !assignedEmployeesIds.includes(emp.id)
        );
        
        // For each available employee, try to assign a project phase
        for (let i = 0; i < availableEmployees.length && i < phases.length; i++) {
          const employee = availableEmployees[i];
          const phase = phases[i];
          
          // Extract workstation from phase name if possible
          const phaseName = phase.name || '';
          const workstationMatch = phaseName.match(/workstation: ([A-Z\s]+)/i);
          const phaseWorkstation = workstationMatch ? workstationMatch[1].trim() : null;
          
          // Only assign if employee has no workstation or workstation matches
          if (!employee.workstation || 
              !phaseWorkstation || 
              employee.workstation.toUpperCase() === phaseWorkstation.toUpperCase()) {
            
            schedulesToInsert.push({
              employee_id: employee.id,
              phase_id: phase.id,
              title: `Phase: ${phaseName}`,
              description: `Project: ${phase.project?.name || 'Unknown'}`,
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
              is_auto_generated: true
            });
          }
        }
      }
    }
    
    // Insert the generated schedules
    if (schedulesToInsert.length > 0) {
      const { error: insertError } = await (supabase as any)
        .from('schedules')
        .insert(schedulesToInsert);
      
      if (insertError) throw insertError;
    }
  }
};
