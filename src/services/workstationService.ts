
import { supabase } from "@/integrations/supabase/client";

export interface Workstation {
  id: string;
  name: string;
  description: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string;
  workstation: string;
  phase: {
    id: string;
    name: string;
    project_id: string;
  };
  project: {
    id: string;
    name: string;
    client: string;
  };
}

export interface RushOrderTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string;
  workstation: string;
  rushOrderId: string;
  isRushOrderTask: true;
}

export interface Phase {
  id: string;
  name: string;
  project_id: string;
  progress: number;
  start_date: string;
  end_date: string;
}

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
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async create(name: string, description?: string): Promise<Workstation> {
    const { data, error } = await supabase
      .from('workstations')
      .insert([
        { name, description }
      ])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, name: string, description?: string): Promise<Workstation> {
    const { data, error } = await supabase
      .from('workstations')
      .update({ name, description })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('workstations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
  
  async getTasksForWorkstation(workstationId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        status,
        priority,
        due_date,
        workstation,
        phase:phase_id(id, name, project_id),
        project:phase!inner(id:project_id, name:projects!inner(name), client:projects!inner(client))
      `)
      .eq('workstation', workstationId)
      .order('due_date');
    
    if (error) throw error;
    
    // Format the data to match our interface
    return (data || []).map((task: any) => ({
      ...task,
      project: {
        id: task.project?.id || '',
        name: task.project?.name || 'Unknown Project',
        client: task.project?.client || 'Unknown Client'
      }
    }));
  },
  
  async getRushOrderTasksForWorkstation(workstationId: string): Promise<RushOrderTask[]> {
    try {
      // First get all standard tasks linked to this workstation
      const { data: linkedTasks, error: linkError } = await supabase
        .from('standard_task_workstation_links')
        .select('standard_task_id')
        .eq('workstation_id', workstationId);
      
      if (linkError) throw linkError;
      
      if (!linkedTasks || linkedTasks.length === 0) {
        return [];
      }
      
      const standardTaskIds = linkedTasks.map(link => link.standard_task_id);
      
      // Then get all rush order tasks that use these standard tasks
      const { data: rushOrderTasks, error: taskError } = await supabase
        .from('rush_order_tasks')
        .select(`
          id,
          rush_order_id,
          standard_task_id,
          standard_tasks:standard_task_id(task_name, task_number),
          rush_orders:rush_order_id(status, deadline, title, description, priority)
        `)
        .in('standard_task_id', standardTaskIds);
      
      if (taskError) throw taskError;
      
      if (!rushOrderTasks || rushOrderTasks.length === 0) {
        return [];
      }
      
      // Format the data to match our Task interface
      return rushOrderTasks.map(rot => ({
        id: rot.id,
        title: rot.standard_tasks?.task_name || 'Unknown Task',
        description: rot.rush_orders?.description || null,
        status: 'TODO', // Default status for now
        priority: rot.rush_orders?.priority === 'critical' ? 'HIGH' : 'MEDIUM',
        due_date: rot.rush_orders?.deadline || new Date().toISOString(),
        workstation: workstationId,
        rushOrderId: rot.rush_order_id,
        isRushOrderTask: true
      }));
    } catch (error) {
      console.error('Error fetching rush order tasks for workstation:', error);
      return [];
    }
  },
  
  async updateTaskStatus(taskId: string, status: string): Promise<void> {
    // If status is COMPLETED, set completed_at to now and completed_by if available
    let updateData: Record<string, any> = { status };
    
    if (status === 'COMPLETED') {
      updateData = {
        ...updateData,
        completed_at: new Date().toISOString(),
      };
    }
    
    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId);
    
    if (error) throw error;
  },
  
  async updateRushOrderTaskStatus(rushOrderId: string, taskId: string, status: string): Promise<void> {
    // For now, we're just tracking status changes for rush order tasks
    // We'll need to create a proper table for this later
    
    // Update the rush order status if all tasks are completed
    if (status === 'COMPLETED') {
      // For now, we'll just mark this specific task as completed somewhere
      console.log(`Rush order task ${taskId} for rush order ${rushOrderId} marked as ${status}`);
      
      // In a real implementation, we would:
      // 1. Update a rush_order_task_status table
      // 2. Check if all tasks are completed
      // 3. Update the rush order status if needed
    }
  },

  async getPhasesForProject(projectId: string): Promise<Phase[]> {
    const { data, error } = await supabase
      .from('phases')
      .select('*')
      .eq('project_id', projectId);
    
    if (error) throw error;
    return data as Phase[] || [];
  }
};
