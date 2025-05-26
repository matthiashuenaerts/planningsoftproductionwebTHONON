
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

  async create(name: string, description?: string): Promise<Workstation> {
    const { data, error } = await supabase
      .from('workstations')
      .insert({ name, description })
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
  }
};
