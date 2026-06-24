import { api } from "@/shared/api/base";
import type { Client, ClientCreateRequest, ClientStats, ClientInteraction } from "@/entities/client/types";

export const clientApiService = {
  getAll: (params?: Record<string, unknown>) =>
    api.get<{ results: Client[] }>("/clients/", { params }),

  getById: (id: string) =>
    api.get<Client>(`/clients/${id}/`),

  create: (data: ClientCreateRequest) =>
    api.post<Client>("/clients/", data),

  update: (id: string, data: Partial<ClientCreateRequest>) =>
    api.patch<Client>(`/clients/${id}/`, data),

  delete: (id: string) =>
    api.delete(`/clients/${id}/`),

  getStats: () =>
    api.get<ClientStats>("/clients/stats/"),

  getInteractions: (clientId: string) =>
    api.get<{ results: ClientInteraction[] }>(`/clients/${clientId}/interactions/`),

  createInteraction: (clientId: string, data: { type: string; description: string }) =>
    api.post(`/clients/${clientId}/interactions/`, data),
};

export const clientTagService = {
  getAll: () =>
    api.get<{ results: { id: string; name: string; color: string }[] }>("/clients/tags/"),

  create: (data: { name: string; color: string }) =>
    api.post("/clients/tags/", data),

  assignToClient: (clientId: string, tagIds: string[]) =>
    api.post(`/clients/${clientId}/tags/`, { tags: tagIds }),

  removeFromClient: (clientId: string, tagId: string) =>
    api.delete(`/clients/${clientId}/tags/${tagId}/`),
};
