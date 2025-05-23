
import { supabase } from "@/integrations/supabase/client";

export interface StandardTask {
  id: string;
  task_number: string;
  task_name: string;
  time_coefficient: number;
  created_at: string;
  updated_at: string;
}

export interface StandardTaskLimitPhase {
  id: string;
  standard_task_id: string;
  phase_name: string;
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

  async updateTimeCoefficient(id: string, timeCoefficient: number): Promise<StandardTask | null> {
    const { data, error } = await supabase
      .from('standard_tasks')
      .update({ time_coefficient: timeCoefficient })
      .eq('id', id)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    return data as StandardTask;
  },

  // Get task name parts by splitting the task name at underscores
  getTaskNameParts(taskName: string): string[] {
    return taskName.split('_').filter(part => part.trim() !== '');
  },

  // Calculate task duration based on time coefficient and project value
  calculateTaskDuration(timeCoefficient: number, projectValue: number): number {
    return Math.round(timeCoefficient * projectValue);
  },

  // New methods for handling limit phases
  async getLimitPhases(standardTaskId: string): Promise<StandardTaskLimitPhase[]> {
    const { data, error } = await supabase
      .from('standard_task_limit_phases')
      .select('*')
      .eq('standard_task_id', standardTaskId);
    
    if (error) throw error;
    return data as StandardTaskLimitPhase[] || [];
  },

  async addLimitPhase(standardTaskId: string, phaseName: string): Promise<StandardTaskLimitPhase> {
    const { data, error } = await supabase
      .from('standard_task_limit_phases')
      .insert({
        standard_task_id: standardTaskId,
        phase_name: phaseName
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as StandardTaskLimitPhase;
  },

  async removeLimitPhase(limitPhaseId: string): Promise<void> {
    const { error } = await supabase
      .from('standard_task_limit_phases')
      .delete()
      .eq('id', limitPhaseId);
    
    if (error) throw error;
  }
};
