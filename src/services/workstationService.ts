
import { supabase } from "@/integrations/supabase/client";

// Workstation Types
export interface Workstation {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// Workstation Links Types
export interface TaskWorkstationLink {
  id: string;
  task_id: string;
  workstation_id: string;
  created_at: string;
}

export interface EmployeeWorkstationLink {
  id: string;
  employee_id: string;
  workstation_id: string;
  created_at: string;
}

// Workstation service functions
export const workstationService = {
  async getAll(): Promise<Workstation[]> {
    const { data, error } = await supabase
      .from('workstations')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data as Workstation[] || [];
  },
  
  async getById(id: string): Promise<Workstation | null> {
    const { data, error } = await supabase
      .from('workstations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data as Workstation;
  },
  
  async getByName(name: string): Promise<{ data: Workstation | null, error: any }> {
    const { data, error } = await supabase
      .from('workstations')
      .select('*')
      .eq('name', name)
      .maybeSingle();
    
    return { data, error };
  },
  
  async create(workstation: { name: string; description?: string | null }): Promise<Workstation> {
    const { data, error } = await supabase
      .from('workstations')
      .insert([workstation])
      .select()
      .single();
    
    if (error) throw error;
    return data as Workstation;
  },
  
  async update(id: string, workstation: { name?: string; description?: string | null }): Promise<Workstation> {
    const { data, error } = await supabase
      .from('workstations')
      .update(workstation)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Workstation;
  },
  
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('workstations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Task-Workstation Links
  async getTaskWorkstationLinks(): Promise<TaskWorkstationLink[]> {
    const { data, error } = await supabase
      .from('task_workstation_links')
      .select('*');
    
    if (error) throw error;
    return data as TaskWorkstationLink[] || [];
  },

  async getWorkstationsForTask(taskId: string): Promise<Workstation[]> {
    const { data, error } = await supabase
      .from('task_workstation_links')
      .select('workstation_id, workstations(*)')
      .eq('task_id', taskId);
    
    if (error) throw error;
    return data.map(item => item.workstations) || [];
  },

  async linkTaskToWorkstation(taskId: string, workstationId: string): Promise<TaskWorkstationLink> {
    const { data, error } = await supabase
      .from('task_workstation_links')
      .insert([{ task_id: taskId, workstation_id: workstationId }])
      .select()
      .single();
    
    if (error) throw error;
    return data as TaskWorkstationLink;
  },

  async unlinkTaskFromWorkstation(taskId: string, workstationId: string): Promise<void> {
    const { error } = await supabase
      .from('task_workstation_links')
      .delete()
      .eq('task_id', taskId)
      .eq('workstation_id', workstationId);
    
    if (error) throw error;
  },

  // Employee-Workstation Links
  async getEmployeeWorkstationLinks(): Promise<EmployeeWorkstationLink[]> {
    const { data, error } = await supabase
      .from('employee_workstation_links')
      .select('*');
    
    if (error) throw error;
    return data as EmployeeWorkstationLink[] || [];
  },

  async getWorkstationsForEmployee(employeeId: string): Promise<Workstation[]> {
    const { data, error } = await supabase
      .from('employee_workstation_links')
      .select('workstations(*)')
      .eq('employee_id', employeeId);
    
    if (error) throw error;
    return data.map(item => item.workstations) || [];
  },

  async getEmployeesForWorkstation(workstationId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('employee_workstation_links')
      .select('employees(*)')
      .eq('workstation_id', workstationId);
    
    if (error) throw error;
    return data.map(item => item.employees) || [];
  },

  async linkEmployeeToWorkstation(employeeId: string, workstationId: string): Promise<EmployeeWorkstationLink> {
    const { data, error } = await supabase
      .from('employee_workstation_links')
      .insert([{ employee_id: employeeId, workstation_id: workstationId }])
      .select()
      .single();
    
    if (error) throw error;
    return data as EmployeeWorkstationLink;
  },

  async unlinkEmployeeFromWorkstation(employeeId: string, workstationId: string): Promise<void> {
    const { error } = await supabase
      .from('employee_workstation_links')
      .delete()
      .eq('employee_id', employeeId)
      .eq('workstation_id', workstationId);
    
    if (error) throw error;
  }
};
