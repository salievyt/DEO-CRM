export interface LeadStage {
  id: string;
  name: string;
  order: number;
  probability: number;
  color: string;
  lead_count?: number;
}

export interface Lead {
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
