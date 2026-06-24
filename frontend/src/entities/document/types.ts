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
  file_name: string;
  mime_type: string;
  file_size: number;
  status: string;
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
