export type CatalogItemType = "product" | "service" | "package" | "subscription";
export type CatalogStatus = "active" | "inactive" | "archived";
export type StockStatus = "ok" | "low" | "out";

export interface CatalogCategory {
  id: string;
  name: string;
  color: string;
  item_count?: number;
  created_at?: string;
}

export interface PackageItemEntry {
  id?: string;
  item: string;
  name?: string;
  unit_price?: number;
  quantity: number;
}

export interface PriceHistoryEntry {
  id: number;
  old_price: string | null;
  new_price: string;
  old_cost: string | null;
  new_cost: string | null;
  reason: string;
  changed_by_name: string;
  created_at: string;
}

export interface InventoryMovementEntry {
  id: number;
  movement_type: "sale" | "restock" | "adjustment" | "refund";
  quantity: number;
  balance_after: number;
  reference: string;
  note: string;
  created_by_name: string;
  created_at: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  type: CatalogItemType;
  category: string | null;
  category_name: string;
  sku: string | null;
  price: number;
  cost_price: number;
  tax: number;
  discount: number;
  price_after_discount: number;
  stock: number;
  low_stock_threshold: number;
  stock_status: StockStatus;
  unit: string;
  duration_minutes: number | null;
  billing_period: "monthly" | "quarterly" | "yearly" | null;
  next_billing_date: string | null;
  image: string | null;
  status: CatalogStatus;
  created_at: string;
  updated_at: string;
  package_items?: PackageItemEntry[];
  price_history?: PriceHistoryEntry[];
  inventory_movements?: InventoryMovementEntry[];
}

export interface CatalogItemWritePayload {
  name: string;
  description?: string;
  type: CatalogItemType;
  category?: string | null;
  sku?: string;
  price?: number;
  cost_price?: number;
  tax?: number;
  discount?: number;
  stock?: number;
  low_stock_threshold?: number;
  unit?: string;
  duration_minutes?: number | null;
  billing_period?: string | null;
  next_billing_date?: string | null;
  status?: CatalogStatus;
  package_items?: { item: string; quantity: number }[];
  reason?: string;
}

export interface BulkOperationPayload {
  action: "change_status" | "change_category" | "adjust_price" | "delete";
  ids: string[];
  status?: CatalogStatus;
  category?: string;
  percent?: number;
}
