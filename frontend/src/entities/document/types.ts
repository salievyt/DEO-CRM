export interface DocumentType {
  id: string;
  name: string;
  code: string;
}

export interface Document {
  id: string;
  document_type: string;
  document_type_name: string;
  client: string | null;
  project: string | null;
  title: string;
  file: string;
  source: "file" | "google_docs";
  external_url: string;
  preview_url: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  status: string;
  client_name?: string;
  project_name?: string;
  deal_name?: string;
  approval_assignee?: string | null;
  approval_assignee_name?: string;
  approval_deadline?: string | null;
  is_visible_to_client: boolean;
  is_protected: boolean;
  allowed_roles: string[];
  version_count?: number;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentTemplate {
  id: string;
  document_type: string;
  name: string;
  content_template: Record<string, unknown>;
}
