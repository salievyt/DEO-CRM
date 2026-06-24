export interface ClientTag {
  id: string;
  name: string;
  color: string;
}

export interface Client {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  company_name: string;
  phone: string;
  email: string;
  telegram: string;
  whatsapp: string;
  address: string;
  source: string;
  notes: string;
  is_active: boolean;
  tags: ClientTag[];
  total_revenue: number;
  total_projects: number;
  created_at: string;
  updated_at: string;
}

export interface ClientCreateRequest {
  first_name: string;
  last_name: string;
  company_name?: string;
  phone: string;
  email?: string;
  telegram?: string;
  whatsapp?: string;
  address?: string;
  source?: string;
  notes?: string;
  tags?: string[];
}

export interface ClientInteraction {
  id: string;
  client: string;
  user: string;
  user_name: string;
  type: string;
  description: string;
  created_at: string;
}

export interface ClientStats {
  total: number;
  active: number;
  by_source: { source: string; count: number }[];
}
