import axios from "axios";
import { API_URL } from "@/shared/constants";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// Request interceptor - add JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor - refresh token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) throw new Error("No refresh token");
        const response = await axios.post(`${API_URL}/auth/refresh/`, {
          refresh: refreshToken,
        });
        const { access } = response.data;
        localStorage.setItem("access_token", access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

// --- API Services ---

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login/", { email, password }),
  register: (data: { email: string; password: string; first_name: string; last_name: string }) =>
    api.post("/auth/register/", data),
  me: () => api.get("/auth/me/"),
  updateProfile: (data: Record<string, unknown>) => api.patch("/auth/me/", data),
  changePassword: (oldPassword: string, newPassword: string) =>
    api.post("/auth/change-password/", {
      old_password: oldPassword,
      new_password: newPassword,
    }),
  logout: (refresh: string) => api.post("/auth/logout/", { refresh }),
  users: {
    list: (params?: Record<string, unknown>) => api.get("/auth/users/", { params }),
    get: (id: string) => api.get(`/auth/users/${id}/`),
    assignRole: (id: string, role: string) =>
      api.post(`/auth/users/${id}/assign-role/`, { role }),
  },
  enable2FA: () => api.post("/auth/2fa/enable/"),
  verify2FA: (code: string) => api.post("/auth/2fa/verify/", { code }),
  disable2FA: () => api.post("/auth/2fa/disable/"),
};

export const clientsApi = {
  list: (params?: Record<string, unknown>) => api.get("/clients/", { params }),
  get: (id: string) => api.get(`/clients/${id}/`),
  create: (data: Record<string, unknown>) => api.post("/clients/", data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/clients/${id}/`, data),
  delete: (id: string) => api.delete(`/clients/${id}/`),
  stats: () => api.get("/clients/stats/"),
  interactions: {
    list: (clientId: string) => api.get(`/clients/${clientId}/interactions/`),
    create: (clientId: string, data: Record<string, unknown>) =>
      api.post(`/clients/${clientId}/interactions/`, data),
  },
  tags: {
    list: () => api.get("/clients/tags/"),
    create: (data: Record<string, unknown>) => api.post("/clients/tags/", data),
    delete: (id: string) => api.delete(`/clients/tags/${id}/`),
  },
  assignTags: (clientId: string, tagIds: string[]) =>
    api.post(`/clients/${clientId}/tags/`, { tags: tagIds }),
  removeTag: (clientId: string, tagId: string) =>
    api.delete(`/clients/${clientId}/tags/${tagId}/`),
};

export const client360Api = {
  overview: (clientId: string) => api.get(`/clients/${clientId}/360/`),
  activity: (clientId: string, params?: Record<string, unknown>) =>
    api.get(`/clients/${clientId}/activity/`, { params }),
};

export const clientStatusApi = {
  list: () => api.get("/clients/statuses/"),
  create: (data: Record<string, unknown>) => api.post("/clients/statuses/", data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch(`/clients/statuses/${id}/`, data),
  delete: (id: number) => api.delete(`/clients/statuses/${id}/`),
};

export const clientPurchasesApi = {
  list: (clientId: string, params?: Record<string, unknown>) =>
    api.get(`/clients/${clientId}/purchases/`, { params }),
  create: (clientId: string, data: Record<string, unknown>) =>
    api.post(`/clients/${clientId}/purchases/`, data),
};

export const leadsApi = {
  list: (params?: Record<string, unknown>) => api.get("/leads/", { params }),
  kanban: () => api.get("/leads/kanban/"),
  stats: () => api.get("/leads/stats/"),
  get: (id: string) => api.get(`/leads/${id}/`),
  create: (data: Record<string, unknown>) => api.post("/leads/", data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/leads/${id}/`, data),
  delete: (id: string) => api.delete(`/leads/${id}/`),
  move: (id: string, stageId: string, notes?: string) =>
    api.post(`/leads/${id}/move/`, { stage_id: stageId, notes }),
  stages: {
    list: () => api.get("/leads/stages/"),
    create: (data: Record<string, unknown>) => api.post("/leads/stages/", data),
    update: (id: string, data: Record<string, unknown>) =>
      api.patch(`/leads/stages/${id}/`, data),
  },
};

export const projectsApi = {
  list: (params?: Record<string, unknown>) => api.get("/projects/", { params }),
  stats: () => api.get("/projects/stats/"),
  get: (id: string) => api.get(`/projects/${id}/`),
  create: (data: Record<string, unknown>) => api.post("/projects/", data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/projects/${id}/`, data),
  delete: (id: string) => api.delete(`/projects/${id}/`),
  team: {
    list: (projectId: string) => api.get(`/projects/${projectId}/team/`),
    add: (projectId: string, data: Record<string, unknown>) =>
      api.post(`/projects/${projectId}/team/`, data),
    remove: (projectId: string, userId: string) =>
      api.delete(`/projects/${projectId}/team/${userId}/`),
  },
  statuses: () => api.get("/projects/statuses/"),
  serviceTypes: () => api.get("/projects/service-types/"),
};

export const tasksApi = {
  list: (params?: Record<string, unknown>) => api.get("/tasks/", { params }),
  kanban: (params?: Record<string, unknown>) => api.get("/tasks/kanban/", { params }),
  my: () => api.get("/tasks/my/"),
  upcoming: () => api.get("/tasks/upcoming/"),
  get: (id: string) => api.get(`/tasks/${id}/`),
  create: (data: Record<string, unknown>) => api.post("/tasks/", data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/tasks/${id}/`, data),
  delete: (id: string) => api.delete(`/tasks/${id}/`),
  changeStatus: (id: string, statusId: string) =>
    api.post(`/tasks/${id}/change-status/`, { status_id: statusId }),
  assign: (id: string, userId: string) =>
    api.post(`/tasks/${id}/assign/`, { user_id: userId }),
  comments: {
    list: (taskId: string) => api.get(`/tasks/${taskId}/comments/`),
    create: (taskId: string, data: Record<string, unknown>) =>
      api.post(`/tasks/${taskId}/comments/`, data),
  },
  timer: {
    start: (taskId: string) => api.post(`/tasks/${taskId}/timer/start/`),
    stop: (taskId: string) => api.post(`/tasks/${taskId}/timer/stop/`),
  },
  statuses: () => api.get("/tasks/statuses/"),
  priorities: () => api.get("/tasks/priorities/"),
};

export const financeApi = {
  invoices: {
    list: (params?: Record<string, unknown>) => api.get("/finance/invoices/", { params }),
    get: (id: string) => api.get(`/finance/invoices/${id}/`),
    create: (data: Record<string, unknown>) => api.post("/finance/invoices/", data),
    markPaid: (id: string) => api.post(`/finance/invoices/${id}/mark-paid/`),
  },
  payments: {
    list: (params?: Record<string, unknown>) => api.get("/finance/payments/", { params }),
    create: (data: Record<string, unknown>) => api.post("/finance/payments/", data),
  },
  products: {
    list: (params?: Record<string, unknown>) => api.get("/finance/products/", { params }),
    get: (id: string) => api.get(`/finance/products/${id}/`),
    create: (data: Record<string, unknown>) => api.post("/finance/products/", data),
    update: (id: string, data: Record<string, unknown>) => api.patch(`/finance/products/${id}/`, data),
    delete: (id: string) => api.delete(`/finance/products/${id}/`),
  },
  expenses: {
    list: (params?: Record<string, unknown>) => api.get("/finance/expenses/", { params }),
    create: (data: Record<string, unknown>) => api.post("/finance/expenses/", data),
  },
  expenseCategories: {
    list: () => api.get("/finance/expense-categories/"),
    create: (data: Record<string, unknown>) => api.post("/finance/expense-categories/", data),
  },
  salaries: {
    list: (params?: Record<string, unknown>) => api.get("/finance/salaries/", { params }),
    create: (data: Record<string, unknown>) => api.post("/finance/salaries/", data),
  },
  summary: () => api.get("/finance/reports/summary/"),
  profitByProject: () => api.get("/finance/reports/profit-by-project/"),
};

export const documentsApi = {
  list: (params?: Record<string, unknown>) => api.get("/documents/", { params }),
  get: (id: string) => api.get(`/documents/${id}/`),
  upload: (data: FormData) =>
    api.post("/documents/", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/documents/${id}/`, data),
  delete: (id: string) => api.delete(`/documents/${id}/`),
  download: (id: string) => api.get(`/documents/${id}/download/`),
  types: () => api.get("/documents/types/"),
  templates: () => api.get("/documents/templates/"),
};

export const messengerApi = {
  chats: {
    list: (params?: Record<string, unknown>) => api.get("/messenger/chats/", { params }),
    get: (id: string) => api.get(`/messenger/chats/${id}/`),
    create: (data: Record<string, unknown>) => api.post("/messenger/chats/", data),
  },
  messages: {
    list: (chatId: string, params?: Record<string, unknown>) =>
      api.get(`/messenger/chats/${chatId}/messages/`, { params }),
    send: (chatId: string, data: Record<string, unknown>) =>
      api.post(`/messenger/chats/${chatId}/messages/`, data),
  },
  unread: () => api.get("/messenger/unread/"),
};

export const analyticsApi = {
  dashboards: {
    list: () => api.get("/analytics/dashboard/"),
    create: (data: Record<string, unknown>) => api.post("/analytics/dashboard/", data),
  },
  summary: () => api.get("/analytics/metrics/summary/"),
  sales: () => api.get("/analytics/metrics/sales/"),
  tasks: () => api.get("/analytics/metrics/tasks/"),
  workload: (params?: Record<string, unknown>) =>
    api.get("/analytics/metrics/workload/", { params }),
  reports: {
    generate: (data: Record<string, unknown>) => api.post("/analytics/reports/generate/", data),
  },
  // ---- Business Analytics ----
  business: {
    summary: (params?: Record<string, unknown>) =>
      api.get("/analytics/business/summary/", { params }),
    revenue: (params?: Record<string, unknown>) =>
      api.get("/analytics/business/revenue/", { params }),
    funnel: (params?: Record<string, unknown>) =>
      api.get("/analytics/business/funnel/", { params }),
    managers: (params?: Record<string, unknown>) =>
      api.get("/analytics/business/managers/", { params }),
    sources: (params?: Record<string, unknown>) =>
      api.get("/analytics/business/sources/", { params }),
    ltv: (params?: Record<string, unknown>) =>
      api.get("/analytics/business/ltv/", { params }),
    churn: (params?: Record<string, unknown>) =>
      api.get("/analytics/business/churn/", { params }),
    retention: (params?: Record<string, unknown>) =>
      api.get("/analytics/business/retention/", { params }),
    config: () => api.get("/analytics/business/config/"),
    acquisitionCosts: {
      list: (params?: Record<string, unknown>) =>
        api.get("/analytics/business/acquisition-costs/", { params }),
      create: (data: Record<string, unknown>) =>
        api.post("/analytics/business/acquisition-costs/", data),
      update: (id: number, data: Record<string, unknown>) =>
        api.patch(`/analytics/business/acquisition-costs/${id}/`, data),
      delete: (id: number) => api.delete(`/analytics/business/acquisition-costs/${id}/`),
    },
    exportFile: (format: "csv" | "pdf", params?: Record<string, unknown>) =>
      api.get("/analytics/business/export/", {
        params: { ...params, export: format },
        responseType: "blob",
      }),
  },
};

export const catalogApi = {
  items: {
    list: (params?: Record<string, unknown>) => api.get("/catalog/items/", { params }),
    get: (id: string) => api.get(`/catalog/items/${id}/`),
    create: (data: Record<string, unknown>) => api.post("/catalog/items/", data),
    update: (id: string, data: Record<string, unknown>) => api.patch(`/catalog/items/${id}/`, data),
    delete: (id: string) => api.delete(`/catalog/items/${id}/`),
    restock: (id: string, data: Record<string, unknown>) =>
      api.post(`/catalog/items/${id}/restock/`, data),
  },
  categories: {
    list: () => api.get("/catalog/categories/"),
    create: (data: Record<string, unknown>) => api.post("/catalog/categories/", data),
  },
  bulk: (data: Record<string, unknown>) => api.post("/catalog/bulk/", data),
  exportCsv: (params?: Record<string, unknown>) =>
    api.get("/catalog/export/", { params, responseType: "blob" }),
  importCsv: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/catalog/import/", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export const dealsApi = {
  list: (params?: Record<string, unknown>) => api.get("/deals/", { params }),
  get: (id: string) => api.get(`/deals/${id}/`),
  convert: (data: Record<string, unknown>) => api.post("/deals/", data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/deals/${id}/`, data),
  delete: (id: string) => api.delete(`/deals/${id}/`),
  changeStatus: (id: string, status: string) =>
    api.post(`/deals/${id}/status/`, { status }),
  addPayment: (id: string, data: Record<string, unknown>) =>
    api.post(`/deals/${id}/payments/`, data),
  attachDocument: (id: string, documentId: string) =>
    api.post(`/deals/${id}/attach-document/`, { document_id: documentId }),
  leadsAvailable: () => api.get("/deals/leads-available/"),
};

export const cabinetApi = {
  dashboard: () => api.get("/cabinet/dashboard/"),
  projects: () => api.get("/cabinet/projects/"),
  projectDetail: (id: string) => api.get(`/cabinet/projects/${id}/`),
  documents: () => api.get("/cabinet/documents/"),
  invoices: () => api.get("/cabinet/invoices/"),
  payments: () => api.get("/cabinet/payments/"),
  messages: {
    list: () => api.get("/cabinet/messages/"),
    send: (content: string) => api.post("/cabinet/messages/", { content }),
  },
  // Client Portal 2.0
  milestones: {
    approve: (projectId: string, milestoneId: string) =>
      api.post(`/cabinet/projects/${projectId}/milestones/${milestoneId}/approve/`),
    reject: (projectId: string, milestoneId: string, reason: string) =>
      api.post(`/cabinet/projects/${projectId}/milestones/${milestoneId}/reject/`, { reason }),
  },
  feedback: {
    create: (projectId: string, data: Record<string, unknown>) =>
      api.post(`/cabinet/projects/${projectId}/feedback/`, data),
  },
  shareLink: {
    get: (projectId: string) => api.get(`/cabinet/projects/${projectId}/share-link/`),
    create: (projectId: string) => api.post(`/cabinet/projects/${projectId}/share-link/`),
  },
  sharedProject: (token: string) => api.get(`/cabinet/shared/${token}/`),
};

export const aiApi = {
  generateTZ: (data: Record<string, unknown>) => api.post("/ai/generate/tz/", data),
  generateProposal: (data: Record<string, unknown>) => api.post("/ai/generate/proposal/", data),
  generateContract: (data: Record<string, unknown>) => api.post("/ai/generate/contract/", data),
  generateReport: (data: Record<string, unknown>) => api.post("/ai/generate/report/", data),
  generateSummary: (data: Record<string, unknown>) => api.post("/ai/generate/summary/", data),
  generateEstimate: (data: Record<string, unknown>) => api.post("/ai/generate/estimate/", data),
  history: () => api.get("/ai/history/"),
  templates: () => api.get("/ai/templates/"),
  settings: {
    get: () => api.get("/ai/settings/"),
    update: (data: Record<string, unknown>) => api.put("/ai/settings/", data),
    test: (data?: Record<string, unknown>) => api.post("/ai/settings/test/", data || {}),
  },
  // A/B Testing
  abTest: {
    campaigns: {
      list: () => api.get("/ai/ab-testing/campaigns/"),
      get: (id: string) => api.get(`/ai/ab-testing/campaigns/${id}/`),
      create: (data: Record<string, unknown>) => api.post("/ai/ab-testing/campaigns/", data),
      update: (id: string, data: Record<string, unknown>) => api.patch(`/ai/ab-testing/campaigns/${id}/`, data),
      delete: (id: string) => api.delete(`/ai/ab-testing/campaigns/${id}/`),
    },
    stats: () => api.get("/ai/ab-testing/stats/"),
    generate: (data: Record<string, unknown>) => api.post("/ai/ab-testing/generate/", data),
    track: (variantId: string, data: Record<string, unknown>) =>
      api.post(`/ai/ab-testing/variants/${variantId}/track/`, data),
    conversions: (variantId: string) =>
      api.get(`/ai/ab-testing/variants/${variantId}/conversions/`),
  },
};

export const crmApi = {
  leads: {
    // TODO: dedicated forecast endpoint on backend (currently falls back to lead stats)
    forecast: () => api.get("/leads/stats/"),
    // TODO: dedicated activity feed endpoint on backend
    activities: (params?: Record<string, unknown>) => api.get("/leads/", { params }),
    // TODO: dedicated follow-up endpoint on backend (overdue/today/upcoming)
    followup: (params?: Record<string, unknown>) => api.get("/tasks/", { params }),
    // TODO: dedicated CSV import endpoint on backend
    importCsv: (formData: FormData) =>
      api.post("/leads/import/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
  },
};

export const messagingApi = {
  conversations: {
    list: (params?: Record<string, unknown>) =>
      api.get("/messaging/conversations/", { params }),
    get: (id: string) => api.get(`/messaging/conversations/${id}/`),
    create: (data: Record<string, unknown>) => api.post("/messaging/conversations/", data),
    fromLead: (leadId: string) =>
      api.post("/messaging/conversations/from-lead/", { lead_id: leadId }),
    read: (id: string) => api.post(`/messaging/conversations/${id}/read/`),
    close: (id: string) => api.post(`/messaging/conversations/${id}/close/`),
    reopen: (id: string) => api.post(`/messaging/conversations/${id}/reopen/`),
    assign: (id: string, userId: string) =>
      api.post(`/messaging/conversations/${id}/assign/`, { user_id: userId }),
    canSend: (id: string) => api.get(`/messaging/conversations/${id}/can-send/`),
  },
  messages: {
    list: (conversationId: string, params?: Record<string, unknown>) =>
      api.get(`/messaging/conversations/${conversationId}/messages/`, { params }),
    send: (conversationId: string, data: Record<string, unknown> | FormData) =>
      api.post(`/messaging/conversations/${conversationId}/messages/`, data),
  },
  media: (messageId: string) =>
    api.get(`/messaging/messages/${messageId}/media/`, { responseType: "blob" }),
  unread: () => api.get("/messaging/unread/"),
};

export const employeeProfileApi = {
  get: (userId: string) => api.get(`/auth/users/${userId}/profile/`),
  update: (userId: string, data: Record<string, unknown>) =>
    api.patch(`/auth/users/${userId}/profile/`, data),
  stats: (userId: string) => api.get(`/auth/users/${userId}/stats/`),
  certificates: {
    add: (userId: string, data: Record<string, unknown> | FormData) =>
      api.post(`/auth/users/${userId}/certificates/`, data),
    delete: (userId: string, certificateId: string) =>
      api.delete(`/auth/users/${userId}/certificates/${certificateId}/`),
  },
};

export const mentorshipApi = {
  pairs: {
    list: (params?: Record<string, unknown>) => api.get("/mentorship/pairs/", { params }),
    get: (id: string) => api.get(`/mentorship/pairs/${id}/`),
    create: (data: Record<string, unknown>) => api.post("/mentorship/pairs/", data),
    update: (id: string, data: Record<string, unknown>) =>
      api.patch(`/mentorship/pairs/${id}/`, data),
    delete: (id: string) => api.delete(`/mentorship/pairs/${id}/`),
    dashboard: () => api.get("/mentorship/pairs/dashboard/"),
    assignChecklist: (id: string, checklistId: string) =>
      api.post(`/mentorship/pairs/${id}/assign_checklist/`, { checklist_id: checklistId }),
  },
  tasks: {
    list: (params?: Record<string, unknown>) => api.get("/mentorship/tasks/", { params }),
    get: (id: string) => api.get(`/mentorship/tasks/${id}/`),
    create: (data: Record<string, unknown>) => api.post("/mentorship/tasks/", data),
    update: (id: string, data: Record<string, unknown>) =>
      api.patch(`/mentorship/tasks/${id}/`, data),
    delete: (id: string) => api.delete(`/mentorship/tasks/${id}/`),
  },
  checklists: {
    list: (params?: Record<string, unknown>) => api.get("/mentorship/checklists/", { params }),
    get: (id: string) => api.get(`/mentorship/checklists/${id}/`),
    create: (data: Record<string, unknown>) => api.post("/mentorship/checklists/", data),
    update: (id: string, data: Record<string, unknown>) =>
      api.patch(`/mentorship/checklists/${id}/`, data),
    delete: (id: string) => api.delete(`/mentorship/checklists/${id}/`),
  },
  checklistProgress: {
    list: (params?: Record<string, unknown>) =>
      api.get("/mentorship/checklist-progress/", { params }),
    get: (id: string) => api.get(`/mentorship/checklist-progress/${id}/`),
    completeItem: (id: string, data: Record<string, unknown>) =>
      api.post(`/mentorship/checklist-progress/${id}/complete_item/`, data),
  },
  evaluations: {
    list: (params?: Record<string, unknown>) => api.get("/mentorship/evaluations/", { params }),
    get: (id: string) => api.get(`/mentorship/evaluations/${id}/`),
    create: (data: Record<string, unknown>) => api.post("/mentorship/evaluations/", data),
    update: (id: string, data: Record<string, unknown>) =>
      api.patch(`/mentorship/evaluations/${id}/`, data),
    delete: (id: string) => api.delete(`/mentorship/evaluations/${id}/`),
  },
};

export const structureApi = {
  teams: {
    list: (params?: Record<string, unknown>) => api.get("/structure/teams/", { params }),
    get: (id: string) => api.get(`/structure/teams/${id}/`),
    create: (data: Record<string, unknown>) => api.post("/structure/teams/", data),
    update: (id: string, data: Record<string, unknown>) =>
      api.patch(`/structure/teams/${id}/`, data),
    delete: (id: string) => api.delete(`/structure/teams/${id}/`),
    tree: () => api.get("/structure/teams/tree/"),
    stats: () => api.get("/structure/teams/stats/"),
  },
  memberships: {
    list: (params?: Record<string, unknown>) => api.get("/structure/memberships/", { params }),
    create: (data: Record<string, unknown>) => api.post("/structure/memberships/", data),
    update: (id: string, data: Record<string, unknown>) =>
      api.patch(`/structure/memberships/${id}/`, data),
    delete: (id: string) => api.delete(`/structure/memberships/${id}/`),
  },
};

export const notificationsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/notifications/", { params }),
  markAllRead: () => api.post("/notifications/mark-all-read/"),
  unreadCount: () => api.get("/notifications/unread-count/"),
  preferences: {
    get: () => api.get("/notifications/preferences/"),
    update: (data: Record<string, unknown>) =>
      api.patch("/notifications/preferences/", data),
  },
  archive: (data: Record<string, unknown>) =>
    api.post("/notifications/archive/", data),
  archiveAll: () => api.post("/notifications/archive-all/"),
  archiveOne: (id: string) => api.post(`/notifications/${id}/archive/`),
};
