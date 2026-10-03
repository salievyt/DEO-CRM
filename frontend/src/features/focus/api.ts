import { api } from "@/shared/api/base";
export type Phase = "work" | "short_break" | "long_break";
export interface FocusSession {
  id: string;
  task: string | null;
  task_title: string;
  phase: Phase;
  status: "running" | "paused" | "completed" | "cancelled";
  goal: string;
  result: string;
  planned_seconds: number;
  elapsed_seconds: number;
  ends_at: string | null;
  started_at: string;
}
export interface FocusSettings {
  work_minutes: number;
  short_break_minutes: number;
  long_break_minutes: number;
  cycles: number;
  daily_goal: number;
  theme: string;
  sound: string;
  pet: string;
  coins: number;
  inventory: string[];
  timer_style: "digital" | "ring" | "flip";
  auto_advance: boolean;
}
export interface FocusStats {
  today_seconds: number;
  today_sessions: number;
  total_seconds: number;
  total_sessions: number;
  streak: number;
  level: number;
  xp: number;
  daily_goal: number;
  daily: { date: string; seconds: number; sessions: number }[];
  achievements: { id: string; title: string; unlocked: boolean }[];
}
export interface FocusNote {
  id: string;
  content: string;
  task: string | null;
  updated_at: string;
}
export const focusApi = {
  state: async () =>
    (
      await api.get<{
        active: FocusSession | null;
        last_session: FocusSession | null;
        server_time: string;
      }>("/focus/state/")
    ).data,
  settings: async () => (await api.get<FocusSettings>("/focus/settings/")).data,
  updateSettings: async (data: Partial<FocusSettings>) =>
    (await api.patch<FocusSettings>("/focus/settings/", data)).data,
  start: async (data: {
    task?: string | null;
    phase: Phase;
    goal?: string;
    duration_minutes?: number;
  }) => (await api.post<FocusSession>("/focus/start/", data)).data,
  action: async (id: string, action: string, data = {}) =>
    (await api.post<FocusSession>(`/focus/sessions/${id}/${action}/`, data)).data,
  stats: async () => (await api.get<FocusStats>("/focus/stats/")).data,
  notes: async () => (await api.get<{ results: FocusNote[] }>("/focus/notes/?page_size=100")).data,
  addNote: async (content: string, task: string | null) =>
    (await api.post<FocusNote>("/focus/notes/", { content, task })).data,
  editNote: async (id: string, content: string) =>
    (await api.patch(`/focus/notes/${id}/`, { content })).data,
  deleteNote: async (id: string) => api.delete(`/focus/notes/${id}/`),
  history: async (page = 1) =>
    (
      await api.get<{ results: FocusSession[]; next: string | null }>(
        `/focus/sessions/?page=${page}`
      )
    ).data,
  shop: async () =>
    (await api.get<{ id: string; title: string; price: number; emoji: string }[]>("/focus/shop/"))
      .data,
  buy: async (item: string) => (await api.post<FocusSettings>("/focus/shop/", { item })).data,
};
export function remaining(
  session: FocusSession | null,
  serverOffset = 0,
  now = Date.now()
): number {
  if (!session) {return 0;}
  return session.status === "running" && session.ends_at
    ? Math.max(0, Math.ceil((Date.parse(session.ends_at) - now - serverOffset) / 1000))
    : Math.max(0, session.planned_seconds - session.elapsed_seconds);
}
export const timeLabel = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
export const phaseLabels: Record<Phase, string> = {
  work: "Фокус",
  short_break: "Короткий перерыв",
  long_break: "Длинный перерыв",
};
export function focusError(error: unknown): string {
  const value = (error as { response?: { data?: unknown } })?.response?.data;
  if (value && typeof value === "object") {return Object.values(value).flat().join("\n");}
  return "Не удалось связаться с сервером. Повторите попытку.";
}
