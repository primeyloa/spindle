import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

// ── Auth Store ──────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAnonymous: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setIsAnonymous: (anonymous: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAnonymous: false,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setIsAnonymous: (isAnonymous) => set({ isAnonymous }),
}));

// ── UI Store ────────────────────────────────────────────────────────────

type Theme = "dark" | "light";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("spindle-theme") as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

interface UIState {
  theme: Theme;
  sidebarCollapsed: boolean;
  statusBarVisible: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setStatusBarVisible: (visible: boolean) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: getInitialTheme(),
  sidebarCollapsed: false,
  statusBarVisible: true,

  setTheme: (theme) => {
    localStorage.setItem("spindle-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },

  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    localStorage.setItem("spindle-theme", next);
    document.documentElement.setAttribute("data-theme", next);
    set({ theme: next });
  },

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

  setStatusBarVisible: (statusBarVisible) => set({ statusBarVisible }),
}));