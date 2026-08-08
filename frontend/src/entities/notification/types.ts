export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  project_id?: string;
  task_id?: string;
  read: boolean;
  archived?: boolean;
  urgency?: "critical" | "important" | "normal" | string;
  type_display?: string;
  created_at: string;
}
