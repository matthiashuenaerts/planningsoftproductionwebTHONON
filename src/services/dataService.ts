
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
  name: 'PLANNING' | 'DESIGN' | 'PRODUCTION' | 'ASSEMBLY' | 'TESTING' | 'DEPLOYMENT';
  start_date: string;
  end_date: string;
  progress: number;
  created_at: string;
  updated_at: string;
}

// Task Types
export interface Task {
  id: string;
  phase_id: string;
  assignee_id: string | null;
  title: string;
  description: string | null;
  workstation: 'CUTTING' | 'WELDING' | 'PAINTING' | 'ASSEMBLY' | 'PACKAGING' | 'SHIPPING';
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  due_date: string;
  created_at: string;
  updated_at: string;
}

// Employee Types
export interface Employee {
  id: string;
  name: string;
  email: string | null;
  role: 'admin' | 'manager' | 'worker';
  workstation: string | null;
  password?: string; // Add password property
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
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
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
    const { data, error } = await supabase
      .from('phases')
      .insert([phase])
      .select()
      .single();
    
    if (error) throw error;
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
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('workstation', workstation)
      .order('due_date', { ascending: true });
    
    if (error) throw error;
    return data as Task[] || [];
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
  
  async create(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .insert([task])
      .select()
      .single();
    
    if (error) throw error;
    return data as Task;
  },
  
  async update(id: string, task: Partial<Task>): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update(task)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Task;
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
    workstation?: string | null; 
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

// Insert initial employee data if needed
export const seedInitialData = async () => {
  const { data } = await supabase.from('employees').select('id');
  
  // Only seed if no employees exist
  if (data && data.length === 0) {
    // Create an admin user
    await supabase.from('employees').insert([
      {
        name: 'Admin User',
        email: 'admin@kitchenpro.com',
        password: 'admin123',
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
        role: 'worker',
        workstation: 'CUTTING'
      },
      {
        name: 'Worker 2',
        email: 'worker2@kitchenpro.com',
        password: 'worker123',
        role: 'worker',
        workstation: 'ASSEMBLY'
      }
    ]);
  }
};
