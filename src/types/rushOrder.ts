
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
