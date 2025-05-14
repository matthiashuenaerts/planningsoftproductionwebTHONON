
// src/types/employee.d.ts
export interface Employee {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'manager' | 'worker' | 'workstation' | 'installation_team';
  workstation?: string;
  created_at: string;
}
