export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const QUERY_KEYS = {
  // Auth
  ME: "me",
  USERS: "users",

  // Clients
  CLIENTS: "clients",
  CLIENT: "client",
  CLIENT_INTERACTIONS: "client-interactions",
  CLIENT_TAGS: "client-tags",

  // Leads
  LEADS: "leads",
  LEAD: "lead",
  LEAD_KANBAN: "lead-kanban",
  LEAD_STAGES: "lead-stages",

  // Projects
  PROJECTS: "projects",
  PROJECT: "project",
  PROJECT_TEAM: "project-team",
  PROJECT_STATUSES: "project-statuses",
  SERVICE_TYPES: "service-types",

  // Tasks
  TASKS: "tasks",
  TASK: "task",
  TASK_KANBAN: "task-kanban",
  TASK_MY: "task-my",
  TASK_UPCOMING: "task-upcoming",
  TASK_COMMENTS: "task-comments",
  TASK_STATUSES: "task-statuses",
  TASK_PRIORITIES: "task-priorities",

  // Finance
  INVOICES: "invoices",
  INVOICE: "invoice",
  EXPENSES: "expenses",
  EXPENSE_CATEGORIES: "expense-categories",
  FINANCE_SUMMARY: "finance-summary",
  PROFIT_BY_PROJECT: "profit-by-project",

  // Documents
  DOCUMENTS: "documents",
  DOCUMENT: "document",
  DOCUMENT_TYPES: "document-types",

  // Messenger
  CHATS: "chats",
  CHAT: "chat",
  MESSAGES: "messages",
  UNREAD_COUNT: "unread-count",

  // Analytics
  SUMMARY_METRICS: "summary-metrics",
  SALES_METRICS: "sales-metrics",
  TASK_METRICS: "task-metrics",

  // AI
  AI_HISTORY: "ai-history",
  AI_TEMPLATES: "ai-templates",
};
