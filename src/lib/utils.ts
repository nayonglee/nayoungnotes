import type { Viewer } from "@/types/diary";

export function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Math.random().toString(36).slice(2, 11)}`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function viewerKey(viewer: Viewer) {
  return `${viewer.mode}:${viewer.id}`;
}

export function isBrowser() {
  return typeof window !== "undefined";
}
