
import { supabase } from "@/integrations/supabase/client";

export interface StandardTask {
  id: string;
  name: string;
  task_number: string;
  time_coefficient: number;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  workstation?: string;
  created_at: string;
}

export const dataService = {
  // Employee-related functions
  async getEmployees(): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data as Employee[] || [];
  },
  
  async getEmployeeById(id: string): Promise<Employee | null> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data as Employee;
  },
  
  // Workstation-related functions
  async getStandardTasksByWorkstation(workstationId: string): Promise<StandardTask[]> {
    try {
      // Get task ids for this workstation
      const { data: links, error: linksError } = await supabase
        .from('standard_task_workstation_links')
        .select('standard_task_id')
        .eq('workstation_id', workstationId);
      
      if (linksError) throw linksError;
      
      if (!links || links.length === 0) return [];
      
      const taskIds = links.map(link => link.standard_task_id);
      
      // Get the tasks based on their ids
      const { data: tasks, error: tasksError } = await supabase
        .from('standard_tasks')
        .select('*')
        .in('id', taskIds);
      
      if (tasksError) throw tasksError;
      
      return tasks.map(task => ({
        id: task.id,
        name: task.task_name,
        task_number: task.task_number,
        time_coefficient: task.time_coefficient,
        created_at: task.created_at,
        updated_at: task.updated_at
      })) as StandardTask[];
    } catch (error) {
      console.error('Error fetching tasks by workstation:', error);
      throw new Error('Failed to fetch tasks by workstation');
    }
  }
};
