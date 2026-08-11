export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1";

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
  INCOMES: "incomes",
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

  // Inbox
  INBOX_CONVERSATIONS: "inbox-conversations",
  INBOX_UNREAD: "inbox-unread",
  INBOX_MESSAGES: "inbox-messages",
  INBOX_CAN_SEND: "inbox-can-send",

  // Analytics
  SUMMARY_METRICS: "summary-metrics",
  SALES_METRICS: "sales-metrics",
  TASK_METRICS: "task-metrics",

  // AI
  AI_HISTORY: "ai-history",
  AI_TEMPLATES: "ai-templates",
  AI_SETTINGS: "ai-settings",

  // Notifications
  NOTIFICATIONS: "notifications",
  UNREAD_NOTIFICATIONS: "unread-notifications",
  NOTIFICATION_PREFS: "notification-prefs",

  // Catalog
  CATALOG: "catalog",
  CATALOG_ITEM: "catalog-item",
  CATALOG_CATEGORIES: "catalog-categories",

  // Deals
  DEALS: "deals",
  DEAL: "deal",
  DEAL_LEADS_AVAILABLE: "deal-leads-available",

  // WhatsApp
  WHATSAPP_ACCOUNTS: "whatsapp-accounts",

  // Telegram
  TELEGRAM_ACCOUNTS: "telegram-accounts",

  // Calls (АТС)
  CALL_RECORDS: "call-records",
  CALL_STATS: "call-stats",
  PBX_CONNECTIONS: "pbx-connections",
  SIP_ACCOUNTS: "sip-accounts",

  // Scenarios (keyword auto-responder)
  SCENARIOS: "scenarios",
  SCENARIO: "scenario",
  SCENARIO_TEMPLATES: "scenario-templates",
  SCENARIO_TRIGGERS: "scenario-triggers",
  SCENARIO_STATS: "scenario-stats",
  SCENARIO_TOP: "scenario-top",

  // Learning (knowledge base)
  LEARNING_ARTICLES: "learning-articles",
  LEARNING_ARTICLE: "learning-article",
  LEARNING_ADMIN_ARTICLES: "learning-admin-articles",
  LEARNING_ADMIN_ARTICLE: "learning-admin-article",
};
