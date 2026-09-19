"use client";

import { create } from "zustand";
import { authApi } from "@/shared/api/base";

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  avatar: string | null;
  role_id: number | null;
  role_name: string | null;
  is_active: boolean;
  date_joined: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ requires2FA: boolean; challenge?: string }>;
  verifyLogin2FA: (challenge: string, code: string) => Promise<void>;
  register: (data: { email: string; password: string; first_name: string; last_name: string }) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const response = await authApi.login(email, password);
    if (response.data.requires_2fa) {
      return { requires2FA: true, challenge: response.data.challenge };
    }
    const { access, refresh } = response.data;

    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);

    // Fetch user profile
    const userResponse = await authApi.me();
    set({ user: userResponse.data, isAuthenticated: true, isLoading: false });
    return { requires2FA: false };
  },

  verifyLogin2FA: async (challenge, code) => {
    const response = await authApi.verifyLogin2FA(challenge, code);
    const { access, refresh } = response.data;
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
    const userResponse = await authApi.me();
    set({ user: userResponse.data, isAuthenticated: true, isLoading: false });
  },

  register: async (data) => {
    await authApi.register(data);
  },

  logout: () => {
    const refresh = localStorage.getItem("refresh_token");
    if (refresh) {
      authApi.logout(refresh).catch(() => {});
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      set({ isLoading: false });
      return;
    }

    try {
      const response = await authApi.me();
      set({ user: response.data, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      set({ isLoading: false });
    }
  },
}));
