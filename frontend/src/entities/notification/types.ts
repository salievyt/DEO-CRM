export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  project_id?: string;
  task_id?: string;
  read: boolean;
  created_at: string;
}
