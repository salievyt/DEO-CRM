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
    create: (data: Record<string, unknown>) => api.post("/finance/payments/", data),
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
    list: () => api.get("/messenger/chats/"),
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
  reports: {
    generate: (data: Record<string, unknown>) => api.post("/analytics/reports/generate/", data),
  },
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
};
