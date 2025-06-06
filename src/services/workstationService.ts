
import { supabase } from "@/integrations/supabase/client";

export interface Workstation {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export const workstationService = {
  async getAll(): Promise<Workstation[]> {
    const { data, error } = await supabase
      .from('workstations')
      .select('*')
      .order('name');
    
    if (error) {
      throw new Error(`Failed to fetch workstations: ${error.message}`);
    }
    
    return data || [];
  },

  async getById(id: string): Promise<Workstation | null> {
    const { data, error } = await supabase
      .from('workstations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      throw new Error(`Failed to fetch workstation: ${error.message}`);
    }
    
    return data;
  },

  async getByName(name: string): Promise<Workstation | null> {
    const { data, error } = await supabase
      .from('workstations')
      .select('*')
      .eq('name', name)
      .single();
    
    if (error) {
      console.error('Error fetching workstation by name:', error);
      return null;
    }
    
    return data;
  },

  async create(workstation: { name: string; description?: string }): Promise<Workstation> {
    const { data, error } = await supabase
      .from('workstations')
      .insert({ name: workstation.name, description: workstation.description })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to create workstation: ${error.message}`);
    }
    
    return data;
  },

  async update(id: string, updates: Partial<Pick<Workstation, 'name' | 'description'>>): Promise<Workstation> {
    const { data, error } = await supabase
      .from('workstations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to update workstation: ${error.message}`);
    }
    
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('workstations')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw new Error(`Failed to delete workstation: ${error.message}`);
    }
  },

  async getWorkstationsForEmployee(employeeId: string): Promise<Workstation[]> {
    const { data, error } = await supabase
      .from('employee_workstation_links')
      .select(`
        workstations (
          id,
          name,
          description,
          created_at,
          updated_at
        )
      `)
      .eq('employee_id', employeeId);
    
    if (error) {
      throw new Error(`Failed to fetch workstations for employee: ${error.message}`);
    }
    
    return data?.map(item => item.workstations).filter(Boolean) as Workstation[] || [];
  },

  async getWorkstationsForStandardTask(standardTaskId: string): Promise<Workstation[]> {
    const { data, error } = await supabase
      .from('standard_task_workstation_links')
      .select(`
        workstations (
          id,
          name,
          description,
          created_at,
          updated_at
        )
      `)
      .eq('standard_task_id', standardTaskId);
    
    if (error) {
      throw new Error(`Failed to fetch workstations for standard task: ${error.message}`);
    }
    
    return data?.map(item => item.workstations).filter(Boolean) as Workstation[] || [];
  },

  async linkTaskToWorkstation(taskId: string, workstationId: string): Promise<void> {
    const { error } = await supabase
      .from('task_workstation_links')
      .insert({ task_id: taskId, workstation_id: workstationId });
    
    if (error) {
      throw new Error(`Failed to link task to workstation: ${error.message}`);
    }
  },

  async linkEmployeeToWorkstation(employeeId: string, workstationId: string): Promise<void> {
    const { error } = await supabase
      .from('employee_workstation_links')
      .insert({ employee_id: employeeId, workstation_id: workstationId });
    
    if (error) {
      throw new Error(`Failed to link employee to workstation: ${error.message}`);
    }
  },

  async unlinkEmployeeFromWorkstation(employeeId: string, workstationId: string): Promise<void> {
    const { error } = await supabase
      .from('employee_workstation_links')
      .delete()
      .eq('employee_id', employeeId)
      .eq('workstation_id', workstationId);
    
    if (error) {
      throw new Error(`Failed to unlink employee from workstation: ${error.message}`);
    }
  }
};
