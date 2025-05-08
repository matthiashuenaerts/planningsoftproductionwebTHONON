
import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';

// Schedule Type
export interface Schedule {
  id: string;
  employee_id: string;
  task_id?: string;
  phase_id?: string; 
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
  phase_id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  is_auto_generated: boolean;
}

export const planningService = {
  // Get schedules for a specific date
  async getSchedulesByDate(date: Date): Promise<Schedule[]> {
    // Ensure date is a valid Date object
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      console.error('Invalid date provided:', date);
      throw new Error('Invalid date provided');
    }

    const dateStr = format(date, 'yyyy-MM-dd');
    const startOfDay = `${dateStr}T00:00:00`;
    const endOfDay = `${dateStr}T23:59:59`;
    
    console.log('Fetching schedules between:', startOfDay, 'and', endOfDay);
    
    try {
      const { data, error } = await supabase
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
      
      if (error) {
        console.error('Supabase error fetching schedules:', error);
        throw error;
      }
      
      console.log('Schedules fetched:', data?.length || 0, 'records');
      return (data || []) as Schedule[];
    } catch (error) {
      console.error('Error in getSchedulesByDate:', error);
      throw error;
    }
  },
  
  // Get schedules for a specific employee on a specific date
  async getSchedulesByEmployeeAndDate(employeeId: string, date: Date): Promise<Schedule[]> {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      console.error('Invalid date provided:', date);
      throw new Error('Invalid date provided');
    }
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const startOfDay = `${dateStr}T00:00:00`;
    const endOfDay = `${dateStr}T23:59:59`;
    
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select(`
          *,
          employee:employees(id, name, role, workstation),
          task:tasks(id, title, description, priority, status),
          phase:phases(id, name, project_id, progress)
        `)
        .eq('employee_id', employeeId)
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay)
        .order('start_time');
      
      if (error) {
        console.error('Supabase error fetching employee schedules:', error);
        throw error;
      }
      
      return (data || []) as Schedule[];
    } catch (error) {
      console.error('Error in getSchedulesByEmployeeAndDate:', error);
      throw error;
    }
  },
  
  // Create a new schedule
  async createSchedule(schedule: CreateScheduleInput): Promise<Schedule> {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .insert([schedule])
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error creating schedule:', error);
        throw error;
      }
      
      return data as Schedule;
    } catch (error) {
      console.error('Error in createSchedule:', error);
      throw error;
    }
  },
  
  // Update a schedule
  async updateSchedule(id: string, schedule: Partial<Schedule>): Promise<Schedule> {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .update(schedule)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error updating schedule:', error);
        throw error;
      }
      
      return data as Schedule;
    } catch (error) {
      console.error('Error in updateSchedule:', error);
      throw error;
    }
  },
  
  // Delete a schedule
  async deleteSchedule(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Supabase error deleting schedule:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteSchedule:', error);
      throw error;
    }
  },
  
  // Generate a daily plan based on available tasks and employees
  async generateDailyPlan(date: Date): Promise<void> {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      console.error('Invalid date provided for generating plan:', date);
      throw new Error('Invalid date provided');
    }
    
    const dateStr = format(date, 'yyyy-MM-dd');
    
    try {
      // First, get the work periods for this day
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      const { data: workPeriods, error: workPeriodsError } = await supabase
        .from('work_hours')
        .select('*')
        .eq('day_of_week', dayOfWeek);
      
      if (workPeriodsError) {
        console.error('Error fetching work periods:', workPeriodsError);
        throw workPeriodsError;
      }
      
      if (!workPeriods?.length) {
        // No work periods defined for this day
        console.log('No work periods defined for day of week:', dayOfWeek);
        return;
      }
      
      // Get available tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .in('status', ['TODO', 'IN_PROGRESS'])
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true });
      
      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        throw tasksError;
      }
      
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
      
      if (phasesError) {
        console.error('Error fetching phases:', phasesError);
        throw phasesError;
      }
      
      // Get employees
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('*');
      
      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
        throw employeesError;
      }
      
      if (!employees?.length) {
        // No employees to assign tasks to
        console.log('No employees available');
        return;
      }
      
      // Delete any existing auto-generated schedules for this date
      const { error: deleteError } = await supabase
        .from('schedules')
        .delete()
        .gte('start_time', `${dateStr}T00:00:00`)
        .lte('start_time', `${dateStr}T23:59:59`)
        .eq('is_auto_generated', true);
      
      if (deleteError) {
        console.error('Error deleting existing schedules:', deleteError);
        throw deleteError;
      }
      
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
      
      console.log('Schedules to insert:', schedulesToInsert.length);
      
      // Insert the generated schedules in batches if needed
      if (schedulesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('schedules')
          .insert(schedulesToInsert);
        
        if (insertError) {
          console.error('Error inserting schedules:', insertError);
          throw insertError;
        }
      }
    } catch (error: any) {
      console.error('Error in generateDailyPlan:', error);
      throw new Error(`Failed to generate plan: ${error.message || 'Unknown error'}`);
    }
  },
  
  // New function: Generate a daily plan based on personal tasks
  async generatePlanFromPersonalTasks(employeeId: string, date: Date): Promise<void> {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      console.error('Invalid date provided for generating plan:', date);
      throw new Error('Invalid date provided');
    }
    
    const dateStr = format(date, 'yyyy-MM-dd');
    
    try {
      // First, get the work periods for this day
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      const { data: workPeriods, error: workPeriodsError } = await supabase
        .from('work_hours')
        .select('*')
        .eq('day_of_week', dayOfWeek)
        .order('start_time');
      
      if (workPeriodsError) {
        console.error('Error fetching work periods:', workPeriodsError);
        throw workPeriodsError;
      }
      
      if (!workPeriods?.length) {
        throw new Error(`No work periods defined for ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]}`);
      }
      
      // Get employee data
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();
      
      if (employeeError) {
        console.error('Error fetching employee:', employeeError);
        throw employeeError;
      }
      
      if (!employee) {
        throw new Error('Employee not found');
      }
      
      // Get employee's workstations
      const workstations = await this.getEmployeeWorkstations(employeeId);
      
      if (!workstations.length) {
        throw new Error('No workstations assigned to employee');
      }
      
      // Get personal tasks for the employee's workstations
      const personalTasks = [];
      
      // For each workstation, get the tasks
      for (const workstation of workstations) {
        // First try to get tasks via standard task links
        const { data: standardTaskLinks, error: linksError } = await supabase
          .from('standard_task_workstation_links')
          .select('standard_task_id')
          .eq('workstation_id', workstation);
        
        if (linksError) {
          console.error('Error fetching standard task links:', linksError);
          continue;
        }
        
        if (standardTaskLinks && standardTaskLinks.length > 0) {
          // Get all the standard tasks for this workstation
          const standardTaskIds = standardTaskLinks.map(link => link.standard_task_id);
          const { data: standardTasks, error: standardTasksError } = await supabase
            .from('standard_tasks')
            .select('*')
            .in('id', standardTaskIds);
          
          if (standardTasksError) {
            console.error('Error fetching standard tasks:', standardTasksError);
            continue;
          }
          
          // For each standard task, find actual tasks that match
          for (const standardTask of (standardTasks || [])) {
            const taskNumber = standardTask.task_number;
            const taskName = standardTask.task_name;
            
            // Find tasks that match this standard task
            const { data: matchingTasks, error: tasksError } = await supabase
              .from('tasks')
              .select('*')
              .not('status', 'eq', 'COMPLETED')
              .or(`title.ilike.%${taskNumber}%,title.ilike.%${taskName}%`);
              
            if (tasksError) {
              console.error('Error fetching matching tasks:', tasksError);
              continue;
            }
            
            if (matchingTasks && matchingTasks.length > 0) {
              // Filter for tasks assigned to current user or unassigned
              const relevantTasks = matchingTasks.filter(task => 
                !task.assignee_id || task.assignee_id === employeeId
              );
              
              personalTasks.push(...relevantTasks);
            }
          }
        } else {
          // Fall back to traditional task-workstation links
          const { data: workstationTasks, error: workstationTasksError } = await supabase
            .from('task_workstation_links')
            .select('tasks (*)')
            .eq('workstation_id', workstation);
            
          if (workstationTasksError) {
            console.error('Error fetching workstation tasks:', workstationTasksError);
            continue;
          }
          
          if (workstationTasks && workstationTasks.length > 0) {
            const tasks = workstationTasks
              .filter(item => item.tasks && item.tasks.status !== 'COMPLETED')
              .map(item => item.tasks);
              
            // Filter for tasks assigned to current user or unassigned
            const relevantTasks = tasks.filter(task => 
              !task.assignee_id || task.assignee_id === employeeId
            );
            
            personalTasks.push(...relevantTasks);
          }
        }
      }
      
      // Remove duplicates
      const uniquePersonalTasks = Array.from(
        new Map(personalTasks.map(task => [task.id, task])).values()
      );
      
      // Sort by priority and due date
      const priorityOrder = { 'Urgent': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
      uniquePersonalTasks.sort((a, b) => {
        const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] || 4;
        const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] || 4;
        
        if (priorityA !== priorityB) return priorityA - priorityB;
        
        // If priority is the same, sort by due date
        const dateA = new Date(a.due_date || '9999-12-31');
        const dateB = new Date(b.due_date || '9999-12-31');
        return dateA.getTime() - dateB.getTime();
      });
      
      // Delete any existing auto-generated schedules for this employee and date
      const { error: deleteError } = await supabase
        .from('schedules')
        .delete()
        .eq('employee_id', employeeId)
        .gte('start_time', `${dateStr}T00:00:00`)
        .lte('start_time', `${dateStr}T23:59:59`)
        .eq('is_auto_generated', true);
      
      if (deleteError) {
        console.error('Error deleting existing schedules:', deleteError);
        throw deleteError;
      }
      
      const schedulesToInsert: CreateScheduleInput[] = [];
      
      // Distribute tasks across work periods
      let taskIndex = 0;
      
      for (const period of workPeriods) {
        if (taskIndex >= uniquePersonalTasks.length) break;
        
        const startTime = new Date(`${dateStr}T${period.start_time}`);
        const endTime = new Date(`${dateStr}T${period.end_time}`);
        
        // Assign task to this period
        const task = uniquePersonalTasks[taskIndex];
        
        schedulesToInsert.push({
          employee_id: employeeId,
          task_id: task.id,
          title: task.title,
          description: task.description || '',
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          is_auto_generated: true
        });
        
        taskIndex++;
      }
      
      console.log('Personal schedules to insert:', schedulesToInsert.length);
      
      // Insert the generated schedules
      if (schedulesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('schedules')
          .insert(schedulesToInsert);
        
        if (insertError) {
          console.error('Error inserting schedules:', insertError);
          throw insertError;
        }
      }
      
      if (schedulesToInsert.length === 0) {
        throw new Error('No tasks available to schedule');
      }
      
      return;
    } catch (error: any) {
      console.error('Error in generatePlanFromPersonalTasks:', error);
      throw new Error(`Failed to generate personal plan: ${error.message || 'Unknown error'}`);
    }
  },
  
  // Get available tasks for planning
  async getAvailableTasksForPlanning(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          phase:phases(name, project:projects(name))
        `)
        .in('status', ['TODO', 'IN_PROGRESS'])
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true });
      
      if (error) {
        console.error('Error fetching available tasks:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getAvailableTasksForPlanning:', error);
      throw error;
    }
  },
  
  // Get employee workstation assignments
  async getEmployeeWorkstations(employeeId: string): Promise<string[]> {
    try {
      // First check if workstation is directly assigned
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('workstation')
        .eq('id', employeeId)
        .single();
      
      if (employeeError && employeeError.code !== 'PGRST116') {
        console.error('Error fetching employee workstation:', employeeError);
        throw employeeError;
      }
      
      const workstations = [];
      
      if (employeeData?.workstation) {
        // Get workstation ID if it's a legacy workstation name
        const { data: workstationData } = await supabase
          .from('workstations')
          .select('id')
          .eq('name', employeeData.workstation)
          .single();
          
        if (workstationData?.id) {
          workstations.push(workstationData.id);
        }
      }
      
      // Also check for workstation links
      const { data: links, error: linksError } = await supabase
        .from('employee_workstation_links')
        .select('workstation_id')
        .eq('employee_id', employeeId);
      
      if (linksError) {
        console.error('Error fetching workstation links:', linksError);
        throw linksError;
      }
      
      if (links && links.length > 0) {
        links.forEach(link => {
          if (!workstations.includes(link.workstation_id)) {
            workstations.push(link.workstation_id);
          }
        });
      }
      
      return workstations;
    } catch (error) {
      console.error('Error in getEmployeeWorkstations:', error);
      throw error;
    }
  }
};
