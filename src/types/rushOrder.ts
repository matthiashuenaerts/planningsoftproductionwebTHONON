
export interface RushOrder {
  id: string;
  title: string;
  description: string;
  deadline: string;
  image_url?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'critical';
  created_by: string;
  created_at: string;
  updated_at: string;
  // Relations
  tasks?: {
    id: string;
    task_id: string;
    task_name: string;
  }[];
  assignments?: {
    id: string;
    employee_id: string;
    employee_name: string;
  }[];
}

export interface CreateRushOrderParams {
  title: string;
  description: string;
  deadline: Date;
  taskIds: string[];
  assignedEmployeeIds: string[];
  imageUrl?: string | null;
  createdBy: string;
}
