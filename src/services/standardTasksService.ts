
import { supabase } from "@/integrations/supabase/client";

export interface StandardTask {
  id: string;
  task_number: string;
  task_name: string;
  created_at: string;
  updated_at: string;
}

export const standardTasksService = {
  async getAll(): Promise<StandardTask[]> {
    const { data, error } = await supabase
      .from('standard_tasks')
      .select('*')
      .order('task_number', { ascending: true });
    
    if (error) throw error;
    return data as StandardTask[] || [];
  },

  async getById(id: string): Promise<StandardTask | null> {
    const { data, error } = await supabase
      .from('standard_tasks')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data as StandardTask;
  },

  async getByTaskNumber(taskNumber: string): Promise<StandardTask | null> {
    const { data, error } = await supabase
      .from('standard_tasks')
      .select('*')
      .eq('task_number', taskNumber)
      .maybeSingle();
    
    if (error) throw error;
    return data as StandardTask;
  },

  // Get task name parts by splitting the task name at underscores
  getTaskNameParts(taskName: string): string[] {
    return taskName.split('_').filter(part => part.trim() !== '');
  }
};
