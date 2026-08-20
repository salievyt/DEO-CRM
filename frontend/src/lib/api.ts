import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor — add JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor — refresh token on 401
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

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login/", { email, password }),
  register: (data: { email: string; password: string; first_name: string; last_name: string }) =>
    api.post("/auth/register/", data),
  me: () => api.get("/auth/me/"),
  updateProfile: (data: Record<string, unknown>) => api.patch("/auth/me/", data),
  changePassword: (oldPassword: string, newPassword: string) =>
    api.post("/auth/change-password/", { old_password: oldPassword, new_password: newPassword }),
};

// Clients API
export const clientsApi = {
  list: (params?: Record<string, unknown>) => api.get("/clients/", { params }),
  get: (id: string) => api.get(`/clients/${id}/`),
  create: (data: Record<string, unknown>) => api.post("/clients/", data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/clients/${id}/`, data),
  delete: (id: string) => api.delete(`/clients/${id}/`),
};

// Leads API
export const leadsApi = {
  list: (params?: Record<string, unknown>) => api.get("/leads/", { params }),
  kanban: () => api.get("/leads/kanban/"),
  get: (id: string) => api.get(`/leads/${id}/`),
  create: (data: Record<string, unknown>) => api.post("/leads/", data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/leads/${id}/`, data),
  move: (id: string, stageId: string) => api.post(`/leads/${id}/move/`, { stage_id: stageId }),
  publicCreate: (data: {
    contact_name: string;
    phone: string;
    email?: string;
    company_name?: string;
    telegram?: string;
    budget?: number;
    notes?: string;
    service_type?: string;
  }) => api.post("/leads/public/", data),
};

// Projects API
export const projectsApi = {
  list: (params?: Record<string, unknown>) => api.get("/projects/", { params }),
  get: (id: string) => api.get(`/projects/${id}/`),
  create: (data: Record<string, unknown>) => api.post("/projects/", data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/projects/${id}/`, data),
  delete: (id: string) => api.delete(`/projects/${id}/`),
  team: (id: string) => api.get(`/projects/${id}/team/`),
};

// Tasks API
export const tasksApi = {
  list: (params?: Record<string, unknown>) => api.get("/tasks/", { params }),
  kanban: () => api.get("/tasks/kanban/"),
  my: () => api.get("/tasks/my/"),
  get: (id: string) => api.get(`/tasks/${id}/`),
  create: (data: Record<string, unknown>) => api.post("/tasks/", data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/tasks/${id}/`, data),
  changeStatus: (id: string, status: string) =>
    api.post(`/tasks/${id}/change-status/`, { status }),
  startTimer: (id: string) => api.post(`/tasks/${id}/timer/start/`),
  stopTimer: (id: string) => api.post(`/tasks/${id}/timer/stop/`),
};

// Finance API
export const financeApi = {
  invoices: {
    list: (params?: Record<string, unknown>) => api.get("/finance/invoices/", { params }),
    get: (id: string) => api.get(`/finance/invoices/${id}/`),
    create: (data: Record<string, unknown>) => api.post("/finance/invoices/", data),
    markPaid: (id: string) => api.post(`/finance/invoices/${id}/mark-paid/`),
  },
  expenses: {
    list: (params?: Record<string, unknown>) => api.get("/finance/expenses/", { params }),
    create: (data: Record<string, unknown>) => api.post("/finance/expenses/", data),
  },
  summary: () => api.get("/finance/reports/summary/"),
};

// Documents API
export const documentsApi = {
  list: (params?: Record<string, unknown>) => api.get("/documents/", { params }),
  upload: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/documents/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// Messenger API
export const messengerApi = {
  chats: {
    list: () => api.get("/messenger/chats/"),
    get: (id: string) => api.get(`/messenger/chats/${id}/`),
    create: (data: Record<string, unknown>) => api.post("/messenger/chats/", data),
  },
  messages: {
    list: (chatId: string, params?: Record<string, unknown>) =>
      api.get(`/messenger/chats/${chatId}/messages/`, { params }),
    send: (chatId: string, content: string) =>
      api.post(`/messenger/chats/${chatId}/messages/`, { content }),
  },
};

// Cabinet API (Client)
export const cabinetApi = {
  dashboard: () => api.get("/cabinet/dashboard/"),
  projects: () => api.get("/cabinet/projects/"),
  documents: () => api.get("/cabinet/documents/"),
  invoices: () => api.get("/cabinet/invoices/"),
  payments: () => api.get("/cabinet/payments/"),
  messages: {
    list: () => api.get("/cabinet/messages/"),
    send: (content: string) => api.post("/cabinet/messages/", { content }),
  },
};

// AI API
export const aiApi = {
  generateTZ: (data: Record<string, unknown>) => api.post("/ai/generate/tz/", data),
  generateProposal: (data: Record<string, unknown>) => api.post("/ai/generate/proposal/", data),
  generateContract: (data: Record<string, unknown>) => api.post("/ai/generate/contract/", data),
  generateReport: (data: Record<string, unknown>) => api.post("/ai/generate/report/", data),
  summarize: (data: Record<string, unknown>) => api.post("/ai/generate/summary/", data),
  history: () => api.get("/ai/history/"),
};
