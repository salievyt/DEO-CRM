export interface LeadStage {
  id: string;
  name: string;
  order: number;
  probability: number;
  color: string;
  lead_count?: number;
}

export interface LeadQualification {
  score: number;
  tier: "hot" | "warm" | "cold";
  factors: { key: string; label: string; weight: number; met: boolean }[];
}

export interface Lead {
  website?: WebsiteLeadSubmission | null;
  qualification?: LeadQualification;
  id: string;
  client: string | null;
  contact_name: string;
  company_name: string;
  phone: string;
  email: string;
  telegram: string;
  source: string;
  budget: number | null;
  current_stage: string;
  stage_name: string;
  stage_color: string;
  assigned_to: string | null;
  assigned_to_name: string;
  created_by: string;
  created_by_name: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeadCreateRequest {
  client?: string;
  contact_name: string;
  company_name?: string;
  phone: string;
  email?: string;
  telegram?: string;
  source?: string;
  budget?: number;
  current_stage: string;
  assigned_to?: string;
  notes?: string;
}

export interface LeadKanbanColumn {
  id: string;
  title: string;
  color: string;
  leads: Lead[];
}

export interface LeadStats {
  total: number;
  active: number;
  stages: LeadStage[];
}

export interface WebsiteLeadSubmission {
  request_id: string;
  project_type: string;
  budget_label: string;
  timeline_label: string;
  original_contact: string;
  locale: string;
  referrer: string;
  utm: Record<string, string>;
  has_attachment: boolean;
  attachment_name: string;
  attachment_size: number;
  attachment_sha256: string;
  attachment_parts: number;
  attachment_complete: boolean;
}
