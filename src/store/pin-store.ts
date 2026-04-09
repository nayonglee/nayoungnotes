"use client";

import { create } from "zustand";
import type { PinPreferences } from "@/types/diary";
import { defaultPinPreferences } from "@/lib/pin";

interface PinState {
  loaded: boolean;
  hasPin: boolean;
  locked: boolean;
  preferences: PinPreferences;
  lastActivityAt: number;
  setLoaded: (loaded: boolean) => void;
  setHasPin: (hasPin: boolean) => void;
  setLocked: (locked: boolean) => void;
  setPreferences: (preferences: PinPreferences) => void;
  touchActivity: () => void;
}

export const usePinStore = create<PinState>((set) => ({
  loaded: false,
  hasPin: false,
  locked: false,
  preferences: defaultPinPreferences,
  lastActivityAt: Date.now(),
  setLoaded: (loaded) => set({ loaded }),
  setHasPin: (hasPin) => set({ hasPin }),
  setLocked: (locked) => set({ locked }),
  setPreferences: (preferences) => set({ preferences }),
  touchActivity: () => set({ lastActivityAt: Date.now() })
}));
