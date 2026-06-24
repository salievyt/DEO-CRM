export interface TaskStatus {
  id: string;
  name: string;
  order: number;
  color: string;
}

export interface TaskPriority {
  id: string;
  name: string;
  level: number;
  color: string;
}

export interface Task {
  id: string;
  parent_task: string | null;
  project: string;
  project_name: string;
  title: string;
  description: string;
  assignee: string | null;
  assignee_name: string | null;
  reviewer: string | null;
  status: string;
  status_name: string;
  status_color: string;
  priority: string | null;
  priority_name: string | null;
  priority_color: string | null;
  deadline: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  comment_count: number;
  subtask_count: number;
  timer_total: number;
  created_at: string;
  updated_at: string;
}

export interface TaskCreateRequest {
  parent_task?: string;
  project: string;
  title: string;
  description?: string;
  assignee?: string;
  reviewer?: string;
  status: string;
  priority?: string;
  deadline?: string;
  estimated_hours?: number;
}

export interface TaskComment {
  id: string;
  task: string;
  user: string;
  user_name: string;
  user_avatar: string | null;
  content: string;
  parent_comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskTimer {
  id: string;
  task: string;
  user: string;
  user_name: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  is_running: boolean;
  note: string;
}

export interface TaskKanbanColumn {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
}
