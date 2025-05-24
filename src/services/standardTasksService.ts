
import { supabase } from "@/integrations/supabase/client";

export interface StandardTask {
  id: string;
  task_number: string;
  task_name: string;
  time_coefficient: number;
  created_at: string;
  updated_at: string;
}

export interface LimitPhase {
  id: string;
  phase_name: string;
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

  async getAllPhaseNames(): Promise<string[]> {
    const { data, error } = await supabase
      .from('phases')
      .select('name')
      .order('name');
    
    if (error) throw error;
    
    // Get unique phase names
    const uniquePhases = [...new Set(data.map(phase => phase.name))];
    return uniquePhases;
  },

  async getLimitPhases(standardTaskId: string): Promise<LimitPhase[]> {
    const { data, error } = await supabase
      .from('standard_task_limit_phases')
      .select('id, phase_name')
      .eq('standard_task_id', standardTaskId)
      .order('phase_name');
    
    if (error) throw error;
    return data as LimitPhase[] || [];
  },

  async addLimitPhase(standardTaskId: string, phaseName: string): Promise<LimitPhase> {
    const { data, error } = await supabase
      .from('standard_task_limit_phases')
      .insert({
        standard_task_id: standardTaskId,
        phase_name: phaseName
      })
      .select('id, phase_name')
      .single();
    
    if (error) throw error;
    return data as LimitPhase;
  },

  async removeLimitPhase(limitPhaseId: string): Promise<void> {
    const { error } = await supabase
      .from('standard_task_limit_phases')
      .delete()
      .eq('id', limitPhaseId);
    
    if (error) throw error;
  },

  async checkLimitPhasesCompleted(standardTaskId: string, projectId: string): Promise<boolean> {
    // Get all limit phases for this standard task
    const limitPhases = await this.getLimitPhases(standardTaskId);
    
    if (limitPhases.length === 0) {
      return true; // No limit phases means task can proceed
    }
    
    // Check if all limit phases are completed in the project
    for (const limitPhase of limitPhases) {
      const { data, error } = await supabase
        .from('phases')
        .select('progress')
        .eq('project_id', projectId)
        .eq('name', limitPhase.phase_name)
        .maybeSingle();
      
      if (error) throw error;
      
      // If phase doesn't exist or is not 100% complete, limit phases are not satisfied
      if (!data || data.progress < 100) {
        return false;
      }
    }
    
    return true; // All limit phases are completed
  },

  // Get task name parts by splitting the task name at underscores
  getTaskNameParts(taskName: string): string[] {
    return taskName.split('_').filter(part => part.trim() !== '');
  },

  // Calculate task duration based on time coefficient and project value
  calculateTaskDuration(timeCoefficient: number, projectValue: number): number {
    return Math.round(timeCoefficient * projectValue);
  }
};
