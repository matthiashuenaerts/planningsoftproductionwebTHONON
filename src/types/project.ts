
export interface Project {
  id: string;
  name: string;
  client: string;
  installation_date: string;
  status: string;
  progress: number;
  team?: string;
  duration: number;
  assignment_start_date?: string;
  description?: string;
  start_date: string;
  updated_at: string;
  created_at: string;
}

export interface ProjectTeamAssignment {
  id: string;
  project_id: string;
  team: string;
  start_date: string;
  duration: number;
  created_at: string;
  updated_at: string;
}
