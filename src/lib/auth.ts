import { getSupabaseClient } from "@/lib/supabase/client";
import type { Viewer } from "@/types/diary";

const PREVIEW_VIEWER_KEY = "nayoungnotes.preview-viewer";

export function loadPreviewViewer() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PREVIEW_VIEWER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Viewer;
  } catch {
    return null;
  }
}

export function savePreviewViewer(viewer: Viewer | null) {
  if (typeof window === "undefined") return;
  if (!viewer) {
    window.localStorage.removeItem(PREVIEW_VIEWER_KEY);
    return;
  }
  window.localStorage.setItem(PREVIEW_VIEWER_KEY, JSON.stringify(viewer));
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpWithPassword(email: string, password: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo:
        typeof window === "undefined" ? undefined : `${window.location.origin}/archive`
    }
  });
  if (error) throw error;
}

export async function signInWithMagicLink(email: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo:
        typeof window === "undefined" ? undefined : `${window.location.origin}/archive`
    }
  });
  if (error) throw error;
}

export async function signOutUser() {
  const supabase = getSupabaseClient();
  if (supabase) await supabase.auth.signOut();
  savePreviewViewer(null);
}
