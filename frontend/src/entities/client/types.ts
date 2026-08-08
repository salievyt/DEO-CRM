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
  status?: ClientStatusInfo | null;
  health?: ClientHealth;
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

export interface ClientStatusInfo {
  id: number;
  name: string;
  color: string;
  order: number;
  is_system: boolean;
}

export interface ClientHealth {
  level: "healthy" | "at_risk" | "critical";
  reasons: {
    critical: string[];
    at_risk: string[];
    healthy: string[];
  };
}

export interface ClientOverviewSummary {
  total_revenue: string;
  deals_total: number;
  deals_active: number;
  deals_won: number;
  deals_lost: number;
  avg_deal_size: string;
  current_stage: string | null;
  last_contact: string | null;
  next_action: string | null;
  next_action_at: string | null;
}

export interface ClientOverview {
  client: Client & { status: ClientStatusInfo | null; health: ClientHealth };
  summary: ClientOverviewSummary;
  counts: {
    interactions: number;
    deals: number;
    projects: number;
    tasks: number;
    documents: number;
    invoices: number;
    payments: number;
    purchases: number;
    messages: number;
  };
}

export interface ActivityItem {
  id: string;
  entity_type: string;
  title: string;
  description: string;
  actor: string;
  ref_id: string | null;
  ref_label: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

export interface ClientPurchase {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  invoice: string | null;
  purchased_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
