import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark";
export type Language = "ru" | "ky" | "en" | "uz";

interface SettingsState {
  theme: Theme;
  language: Language;
  sidebarCollapsed: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "light",
      language: "ru",
      sidebarCollapsed: false,

      setTheme: (theme) => {
        set({ theme });
        if (typeof window !== "undefined") {
          document.documentElement.classList.toggle("dark", theme === "dark");
        }
      },

      toggleTheme: () => {
        set((state) => {
          const newTheme = state.theme === "light" ? "dark" : "light";
          if (typeof window !== "undefined") {
            document.documentElement.classList.toggle("dark", newTheme === "dark");
          }
          return { theme: newTheme };
        });
      },

      setLanguage: (language) => set({ language }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
    }),
    {
      name: "deo-crm-settings",
    }
  )
);

// Initialize theme on load
export function initTheme() {
  const stored = localStorage.getItem("deo-crm-settings");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.state?.theme === "dark") {
        document.documentElement.classList.add("dark");
      }
    } catch {
      // ignore
    }
  }
}
