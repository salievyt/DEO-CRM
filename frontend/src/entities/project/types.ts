export interface ProjectStatus {
  id: string;
  name: string;
  order: number;
  color: string;
}

export interface ServiceType {
  id: string;
  name: string;
  description: string;
}

export interface ProjectTeamMember {
  id: string;
  user: string;
  user_name: string;
  user_email: string;
  role_in_project: string;
  assigned_at: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  client_name: string;
  service_type: string | null;
  budget: number | null;
  cost: number | null;
  deadline: string | null;
  status: string;
  status_name: string;
  status_color: string;
  progress: number;
  description: string;
  team_count: number;
  task_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreateRequest {
  name: string;
  client: string;
  service_type?: string;
  budget?: number;
  cost?: number;
  deadline?: string;
  status: string;
  progress?: number;
  description?: string;
}

export interface ProjectStats {
  total: number;
  active: number;
  by_status: { status__name: string; status__color: string; count: number }[];
}
