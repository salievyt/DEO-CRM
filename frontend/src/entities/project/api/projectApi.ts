import { api } from "@/shared/api/base";
import type { Project, ProjectCreateRequest, ProjectStats, ProjectStatus, ServiceType, ProjectTeamMember } from "@/entities/project/types";

export const projectApiService = {
  getAll: (params?: Record<string, unknown>) =>
    api.get<{ results: Project[] }>("/projects/", { params }),

  getById: (id: string) =>
    api.get<Project>(`/projects/${id}/`),

  create: (data: ProjectCreateRequest) =>
    api.post<Project>("/projects/", data),

  update: (id: string, data: Partial<ProjectCreateRequest>) =>
    api.patch<Project>(`/projects/${id}/`, data),

  delete: (id: string) =>
    api.delete(`/projects/${id}/`),

  getStats: () =>
    api.get<ProjectStats>("/projects/stats/"),

  getStatuses: () =>
    api.get<{ results: ProjectStatus[] }>("/projects/statuses/"),

  getServiceTypes: () =>
    api.get<{ results: ServiceType[] }>("/projects/service-types/"),

  getTeam: (projectId: string) =>
    api.get<{ results: ProjectTeamMember[] }>(`/projects/${projectId}/team/`),

  addTeamMember: (projectId: string, data: { user: string; role_in_project: string }) =>
    api.post(`/projects/${projectId}/team/`, data),

  removeTeamMember: (projectId: string, userId: string) =>
    api.delete(`/projects/${projectId}/team/${userId}/`),
};
