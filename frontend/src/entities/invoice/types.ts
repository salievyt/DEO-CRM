export interface Invoice {
  id: string;
  number: string;
  project: string | null;
  client: string;
  client_name: string;
  project_name: string | null;
  amount: number;
  paid_amount: number;
  status: string;
  description: string;
  issued_date: string;
  due_date: string;
  paid_at: string | null;
  items: InvoiceItem[];
  payments: Payment[];
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Payment {
  id: string;
  invoice: string;
  amount: number;
  method: string;
  paid_at: string;
  transaction_id: string;
  notes: string;
}

export interface Expense {
  id: string;
  category: string;
  category_name: string;
  project: string | null;
  amount: number;
  description: string;
  expense_date: string;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description: string;
}

export interface Income {
  id: string;
  client: string | null;
  client_name: string | null;
  project: string | null;
  project_name: string | null;
  amount: number;
  description: string;
  method: string;
  method_display: string;
  income_date: string;
  created_at: string;
}

export interface FinancialSummary {
  revenue: number;
  income: number;
  total_income: number;
  expenses: number;
  profit: number;
  outstanding: number;
  month: number;
  year: number;
}

export interface ProfitByProject {
  id: string;
  name: string;
  revenue: number;
  expenses: number;
  profit: number;
}
