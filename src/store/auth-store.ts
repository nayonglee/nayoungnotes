"use client";

import { create } from "zustand";
import type { Viewer } from "@/types/diary";

interface AuthState {
  viewer: Viewer | null;
  sessionReady: boolean;
  supabaseConfigured: boolean;
  setViewer: (viewer: Viewer | null) => void;
  setSessionReady: (ready: boolean) => void;
  setSupabaseConfigured: (configured: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  viewer: null,
  sessionReady: false,
  supabaseConfigured: false,
  setViewer: (viewer) => set({ viewer }),
  setSessionReady: (sessionReady) => set({ sessionReady }),
  setSupabaseConfigured: (supabaseConfigured) => set({ supabaseConfigured })
}));
