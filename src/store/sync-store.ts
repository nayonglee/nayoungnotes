"use client";

import { create } from "zustand";
import type { SaveState } from "@/types/diary";

interface SyncStatusRecord {
  state: SaveState;
  lastSavedAt?: string;
  detail?: string;
}

interface SyncState {
  byEntryDate: Record<string, SyncStatusRecord>;
  setStatus: (entryDate: string, status: SyncStatusRecord) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  byEntryDate: {},
  setStatus: (entryDate, status) =>
    set((state) => ({
      byEntryDate: {
        ...state.byEntryDate,
        [entryDate]: status
      }
    }))
}));
