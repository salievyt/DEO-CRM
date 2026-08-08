export type DealStatus = "draft" | "open" | "won" | "lost" | "cancelled";

export interface DealItemEntry {
  id: string;
  item: string | null;
  item_type?: string;
  item_sku?: string;
  name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax: number;
  cost_price: number;
  line_subtotal: number;
  line_total: number;
  total_cost: number;
  unit?: string;
}

export interface DealItemWritePayload {
  item: string;
  quantity: number;
  discount?: number;
  tax?: number;
}

export interface DealPaymentEntry {
  id: number;
  amount: number;
  method: string;
  transaction_id: string;
  notes: string;
  created_by_name: string;
  paid_at: string;
}

export interface DealDocumentEntry {
  id: string;
  title: string;
  file_name: string;
}

export interface Deal {
  id: string;
  number: string;
  title: string;
  status: DealStatus;
  client: string | null;
  client_name: string;
  lead: string;
  lead_contact: string;
  description: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  total_cost: number;
  profit: number;
  margin: number;
  paid_amount: number;
  remaining: number;
  item_count: number;
  assigned_to_name: string;
  won_at: string | null;
  created_at: string;
  updated_at: string;
  items?: DealItemEntry[];
  payments?: DealPaymentEntry[];
  documents?: DealDocumentEntry[];
}

export interface ConvertLeadPayload {
  lead: string;
  items: DealItemWritePayload[];
  discount?: number;
  tax?: number;
  description?: string;
  assigned_to?: string | null;
}

export interface AvailableLead {
  id: string;
  contact_name: string;
  company_name: string;
  phone: string;
  budget: number | null;
  stage_name: string;
}
