import type { PinPreferences, StoredPinConfig } from "@/types/diary";
import { isBrowser } from "@/lib/utils";

const PIN_STORAGE_KEY = "nayoungnotes.pin";
const PIN_PREFS_KEY = "nayoungnotes.pin-prefs";

export const defaultPinPreferences: PinPreferences = {
  enabled: false,
  timeoutMinutes: 5,
  lockOnBackground: true
};

function bufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function randomSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bufferToHex(bytes.buffer);
}

export async function createStoredPin(pin: string): Promise<StoredPinConfig> {
  const salt = randomSalt();
  const encoded = new TextEncoder().encode(`${salt}:${pin}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return { salt, hash: bufferToHex(hashBuffer) };
}

export async function verifyStoredPin(pin: string, stored: StoredPinConfig) {
  const encoded = new TextEncoder().encode(`${stored.salt}:${pin}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return bufferToHex(hashBuffer) === stored.hash;
}

export function loadStoredPin() {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(PIN_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredPinConfig;
  } catch {
    return null;
  }
}

export function saveStoredPin(config: StoredPinConfig) {
  if (!isBrowser()) return;
  window.localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(config));
}

export function clearStoredPin() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(PIN_STORAGE_KEY);
}

export function loadPinPreferences() {
  if (!isBrowser()) return defaultPinPreferences;
  const raw = window.localStorage.getItem(PIN_PREFS_KEY);
  if (!raw) return defaultPinPreferences;
  try {
    return { ...defaultPinPreferences, ...(JSON.parse(raw) as Partial<PinPreferences>) };
  } catch {
    return defaultPinPreferences;
  }
}

export function savePinPreferences(preferences: PinPreferences) {
  if (!isBrowser()) return;
  window.localStorage.setItem(PIN_PREFS_KEY, JSON.stringify(preferences));
}
