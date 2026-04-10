import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface RuntimeSupabaseConfig {
  url: string;
  anonKey: string;
  bucket?: string;
}

const RUNTIME_CONFIG_KEY = "nayoungnotes.supabase-runtime-config";
const CONFIG_EVENT = "nayoungnotes:supabase-config-changed";

let client: SupabaseClient | null = null;
let clientKey = "";

function loadEnvConfig(): RuntimeSupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  return {
    url,
    anonKey,
    bucket: process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "diary-photos"
  };
}

export function loadRuntimeSupabaseConfig() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(RUNTIME_CONFIG_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as RuntimeSupabaseConfig;
    if (!parsed.url || !parsed.anonKey) return null;
    return parsed;
  } catch {
    return null;
  }
}

function dispatchConfigEvent() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CONFIG_EVENT));
}

export function saveRuntimeSupabaseConfig(config: RuntimeSupabaseConfig) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RUNTIME_CONFIG_KEY, JSON.stringify(config));
  client = null;
  clientKey = "";
  dispatchConfigEvent();
}

export function clearRuntimeSupabaseConfig() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(RUNTIME_CONFIG_KEY);
  client = null;
  clientKey = "";
  dispatchConfigEvent();
}

export function subscribeSupabaseConfigChange(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CONFIG_EVENT, listener);
  return () => window.removeEventListener(CONFIG_EVENT, listener);
}

export function resolveSupabaseConfig() {
  return loadEnvConfig() ?? loadRuntimeSupabaseConfig();
}

export function isSupabaseConfigured() {
  return Boolean(resolveSupabaseConfig());
}

export function getStorageBucket() {
  return resolveSupabaseConfig()?.bucket ?? "diary-photos";
}

export function getSupabaseClient() {
  const config = resolveSupabaseConfig();
  if (!config) return null;

  const nextKey = `${config.url}::${config.anonKey}`;
  if (!client || clientKey !== nextKey) {
    clientKey = nextKey;
    client = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      global: {
        headers: {
          "x-application-name": "nayoungnotes"
        }
      }
    });
  }

  return client;
}
