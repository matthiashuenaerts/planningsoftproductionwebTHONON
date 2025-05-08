
import { supabase } from "@/integrations/supabase/client";

// Standard Task Types
export interface StandardTask {
  id: string;
  external_id: string;
  name: string;
  category: string | null;
  created_at: string;
  updated_at: string;
}

// Standard task service functions
export const standardTaskService = {
  async getAll(): Promise<StandardTask[]> {
    const { data, error } = await supabase
      .from('standard_tasks')
      .select('*')
      .order('external_id');
    
    if (error) throw error;
    return data as StandardTask[] || [];
  },
  
  async getById(id: string): Promise<StandardTask | null> {
    const { data, error } = await supabase
      .from('standard_tasks')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data as StandardTask;
  },
  
  async getByExternalId(externalId: string): Promise<StandardTask | null> {
    const { data, error } = await supabase
      .from('standard_tasks')
      .select('*')
      .eq('external_id', externalId)
      .maybeSingle();
    
    if (error) throw error;
    return data as StandardTask;
  },
  
  async create(task: { external_id: string; name: string; category?: string | null }): Promise<StandardTask> {
    const { data, error } = await supabase
      .from('standard_tasks')
      .insert([task])
      .select()
      .single();
    
    if (error) throw error;
    return data as StandardTask;
  },
  
  async update(id: string, task: { name?: string; category?: string | null }): Promise<StandardTask> {
    const { data, error } = await supabase
      .from('standard_tasks')
      .update({
        ...task,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as StandardTask;
  },
  
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('standard_tasks')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
  
  async saveAll(tasks: { external_id: string; name: string; category?: string | null }[]): Promise<StandardTask[]> {
    // For each task, check if it exists by external_id, if so update it, if not create it
    const savedTasks: StandardTask[] = [];
    
    for (const task of tasks) {
      try {
        const existing = await this.getByExternalId(task.external_id);
        
        if (existing) {
          // Update existing task
          const updated = await this.update(existing.id, {
            name: task.name,
            category: task.category || null
          });
          savedTasks.push(updated);
        } else {
          // Create new task
          const created = await this.create(task);
          savedTasks.push(created);
        }
      } catch (error) {
        console.error(`Error saving task ${task.external_id}:`, error);
        throw error;
      }
    }
    
    return savedTasks;
  }
};
