import { supabase } from "@/integrations/supabase/client";

// Project Types
export interface Project {
  id: string;
  name: string;
  client: string;
  description: string | null;
  start_date: string;
  installation_date: string;
  progress: number;
  status: 'planned' | 'in_progress' | 'completed' | 'on_hold';
  created_at: string;
  updated_at: string;
}

// Phase Types
export interface Phase {
  id: string;
  project_id: string;
  name: string;
  start_date: string;
  end_date: string;
  progress: number;
  created_at: string;
  updated_at: string;
}

// Task Types
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
  due_date: string;
  priority: string;
  phase_id: string;
  workstation: string;
  assignee_id?: string;
  created_at: string;
  updated_at: string;
  completed_by?: string;
  completed_at?: string;
  completed_by_name?: string;
  project_name?: string; // Added for WorkstationView
}

// Employee Types
export interface Employee {
  id: string;
  name: string;
  email: string | null;
  role: 'admin' | 'manager' | 'worker';
  password?: string;
  created_at: string;
}

// Project service functions
export const projectService = {
  async getAll(): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('start_date', { ascending: true });
    
    if (error) throw error;
    return data as Project[] || [];
  },
  
  async getById(id: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data as Project;
  },
  
  async getProjectPhases(projectId: string): Promise<Phase[]> {
    const { data, error } = await supabase
      .from('phases')
      .select('*')
      .eq('project_id', projectId)
      .order('start_date', { ascending: true });
    
    if (error) throw error;
    return data as Phase[] || [];
  },
  
  async create(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .insert([project])
      .select()
      .single();
    
    if (error) throw error;
    return data as Project;
  },
  
  async update(id: string, project: Partial<Project>): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .update(project)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Project;
  },
  
  async delete(id: string): Promise<void> {
    try {
      // Get all phases for this project
      const { data: phases, error: phasesError } = await supabase
        .from('phases')
        .select('id')
        .eq('project_id', id);
      
      if (phasesError) throw phasesError;

      // Delete all tasks associated with these phases
      if (phases && phases.length > 0) {
        const phaseIds = phases.map(phase => phase.id);
        
        // Delete task-workstation links first
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select('id')
          .in('phase_id', phaseIds);
        
        if (tasksError) throw tasksError;
        
        if (tasks && tasks.length > 0) {
          const taskIds = tasks.map(task => task.id);
          
          // Delete task_workstation_links
          const { error: linksError } = await supabase
            .from('task_workstation_links')
            .delete()
            .in('task_id', taskIds);
          
          if (linksError) throw linksError;
          
          // Delete schedules associated with tasks
          const { error: schedulesError } = await supabase
            .from('schedules')
            .delete()
            .in('task_id', taskIds);
          
          if (schedulesError && schedulesError.code !== '42P01') throw schedulesError;
          
          // Delete tasks
          const { error: deleteTasksError } = await supabase
            .from('tasks')
            .delete()
            .in('phase_id', phaseIds);
          
          if (deleteTasksError) throw deleteTasksError;
        }
        
        // Delete phases
        const { error: deletePhasesError } = await supabase
          .from('phases')
          .delete()
          .eq('project_id', id);
        
        if (deletePhasesError) throw deletePhasesError;
      }
      
      // Get all orders for this project
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('project_id', id);
      
      if (ordersError) throw ordersError;
      
      // Delete all orders and their associated items and attachments
      if (orders && orders.length > 0) {
        for (const order of orders) {
          // Delete order items
          const { error: itemsError } = await supabase
            .from('order_items')
            .delete()
            .eq('order_id', order.id);
          
          if (itemsError) throw itemsError;
          
          // Get all attachments for this order
          const { data: attachments, error: attachmentsError } = await supabase
            .from('order_attachments')
            .select('id, file_name, order_id')
            .eq('order_id', order.id);
          
          if (attachmentsError && attachmentsError.code !== '42P01') throw attachmentsError;
          
          // Delete all attachment files from storage
          if (attachments && attachments.length > 0) {
            for (const attachment of attachments) {
              const filePath = `${attachment.order_id}/${attachment.file_name}`;
              
              const { error: storageError } = await supabase.storage
                .from('order-attachments')
                .remove([filePath]);
              
              if (storageError) console.error("Error removing file from storage:", storageError);
            }
            
            // Delete attachment records
            const { error: deleteAttachmentsError } = await supabase
              .from('order_attachments')
              .delete()
              .eq('order_id', order.id);
            
            if (deleteAttachmentsError && deleteAttachmentsError.code !== '42P01') throw deleteAttachmentsError;
          }
        }
        
        // Delete orders
        const { error: deleteOrdersError } = await supabase
          .from('orders')
          .delete()
          .eq('project_id', id);
        
        if (deleteOrdersError) throw deleteOrdersError;
      }
      
      // Finally delete the project itself
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error("Error deleting project:", error);
      throw error;
    }
  }
};

// Phase service functions
export const phaseService = {
  async getByProject(projectId: string): Promise<Phase[]> {
    const { data, error } = await supabase
      .from('phases')
      .select('*')
      .eq('project_id', projectId)
      .order('start_date', { ascending: true });
    
    if (error) throw error;
    return data as Phase[] || [];
  },
  
  async create(phase: Omit<Phase, 'id' | 'created_at' | 'updated_at'>): Promise<Phase> {
    // Ensure the phase name meets any constraints
    const { data, error } = await supabase
      .from('phases')
      .insert([phase])
      .select()
      .single();
    
    if (error) {
      console.error('Phase creation error:', error);
      throw error;
    }
    
    return data as Phase;
  },
  
  async update(id: string, phase: Partial<Phase>): Promise<Phase> {
    const { data, error } = await supabase
      .from('phases')
      .update(phase)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Phase;
  }
};

// Task service functions
export const taskService = {
  async getAll(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true });
    
    if (error) throw error;
    return data as Task[] || [];
  },

  async getByPhase(phaseId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('phase_id', phaseId)
      .order('due_date', { ascending: true });
    
    if (error) throw error;
    return data as Task[] || [];
  },
  
  async getByWorkstation(workstation: string): Promise<Task[]> {
    try {
      // First get the workstation ID
      const { data: workstationData, error: workstationError } = await supabase
        .from('workstations')
        .select('id')
        .eq('name', workstation)
        .maybeSingle();
      
      if (workstationError) throw workstationError;
      
      if (!workstationData) {
        console.warn(`No workstation found with name: ${workstation}`);
        return [];
      }
      
      return await this.getByWorkstationId(workstationData.id);
    } catch (error) {
      console.error('Error in getByWorkstation:', error);
      throw error;
    }
  },

  async getByWorkstationId(workstationId: string): Promise<Task[]> {
    try {
      // Get tasks linked to this workstation
      const { data, error } = await supabase
        .from('task_workstation_links')
        .select(`
          task_id,
          tasks (*)
        `)
        .eq('workstation_id', workstationId);
      
      if (error) throw error;
      
      // Check if data exists and has tasks property
      if (!data || data.length === 0) {
        return [];
      }
      
      // Extract tasks from the joined data and ensure they match the Task type
      const tasks = data
        .filter(item => item.tasks !== null) // Filter out any null tasks
        .map(item => item.tasks as Task);
      
      return tasks;
    } catch (error) {
      console.error('Error in getByWorkstationId:', error);
      throw error;
    }
  },
  
  async getTodaysTasks(): Promise<Task[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('due_date', today)
      .order('priority', { ascending: false });
    
    if (error) throw error;
    return data as Task[] || [];
  },
  
  async getByDueDate(dueDate: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('due_date', dueDate)
      .order('priority', { ascending: false });
    
    if (error) throw error;
    return data as Task[] || [];
  },
  
  async getOpenTasksByEmployeeOrWorkstation(employeeId: string, workstation: string | null): Promise<Task[]> {
    // Get tasks assigned to an employee
    if (employeeId) {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assignee_id', employeeId)
        .in('status', ['TODO', 'IN_PROGRESS'])
        .order('priority', { ascending: false });
      
      if (error) throw error;
      return data as Task[] || [];
    } 
    // Get tasks for a workstation
    else if (workstation) {
      // First get the workstation ID
      const { data: workstationData, error: workstationError } = await supabase
        .from('workstations')
        .select('id')
        .eq('name', workstation)
        .single();
      
      if (workstationError) throw workstationError;
      
      // Get tasks linked to this workstation
      const { data, error } = await supabase
        .from('task_workstation_links')
        .select(`
          task_id,
          tasks (*)
        `)
        .eq('workstation_id', workstationData.id);
      
      if (error) throw error;
      
      // Extract tasks from the joined data and filter for open tasks
      const tasks = data.map(item => item.tasks) as Task[] || [];
      return tasks.filter(task => task.status === 'TODO' || task.status === 'IN_PROGRESS');
    }
    
    return [];
  },
  
  async create(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .insert([task])
      .select()
      .single();
    
    if (error) throw error;
    return data as Task;
  },
  
  async update(taskId: string, updates: Partial<Task>): Promise<Task> {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', taskId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  },
  
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Employee service functions
export const employeeService = {
  async getAll(): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data as Employee[] || [];
  },
  
  async create(employee: { 
    name: string; 
    email?: string | null; 
    password: string; 
    role: string; 
  }): Promise<Employee> {
    const { data, error } = await supabase
      .from('employees')
      .insert([employee])
      .select()
      .single();
    
    if (error) throw error;
    return data as Employee;
  }
};

// Work hours service
export const workHoursService = {
  async getAll(): Promise<any[]> {
    const { data, error } = await supabase
      .from('work_hours')
      .select('*')
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },
  
  async getByDayOfWeek(dayOfWeek: number): Promise<any[]> {
    const { data, error } = await supabase
      .from('work_hours')
      .select('*')
      .eq('day_of_week', dayOfWeek)
      .order('start_time', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },
  
  async update(id: string, workHours: Partial<any>): Promise<any> {
    const { data, error } = await supabase
      .from('work_hours')
      .update(workHours)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Insert initial employee data if needed
export const seedInitialData = async () => {
  const { data } = await supabase.from('employees').select('id');
  
  // Only seed if no employees exist
  if (data && data.length === 0) {
    await supabase.from('employees').insert([
      {
        name: 'Matthias Huenaerts',
        email: null,
        password: 'mh310801',
        role: 'admin'
      },
      {
        name: 'Manager User',
        email: 'manager@kitchenpro.com',
        password: 'manager123',
        role: 'manager'
      },
      {
        name: 'Worker 1',
        email: 'worker1@kitchenpro.com',
        password: 'worker123',
        role: 'worker'
      },
      {
        name: 'Worker 2',
        email: 'worker2@kitchenpro.com',
        password: 'worker123',
        role: 'worker'
      }
    ]);
  }
};
