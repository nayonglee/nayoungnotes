"use client";

import type { ChangeEvent } from "react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Cloud, CloudOff, Download, LockKeyhole, LogOut, Upload } from "lucide-react";
import { savePreviewViewer, signOutUser } from "@/lib/auth";
import { createStoredPin, clearStoredPin, saveStoredPin } from "@/lib/pin";
import {
  flushPendingQueue,
  loadEntryOverviews,
  loadEntryRecord,
  persistDraft,
  queueSave
} from "@/lib/local/sync";
import { useAuthStore } from "@/store/auth-store";
import { usePinStore } from "@/store/pin-store";
import styles from "@/styles/settings.module.css";

export function SettingsScreen() {
  const queryClient = useQueryClient();
  const viewer = useAuthStore((state) => state.viewer);
  const configured = useAuthStore((state) => state.supabaseConfigured);
  const setViewer = useAuthStore((state) => state.setViewer);
  const { hasPin, preferences, setHasPin, setLocked, setPreferences } = usePinStore();
  const [pinValue, setPinValue] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [message, setMessage] = useState("");

  const handlePinSave = async () => {
    if (pinValue.length !== 4 || pinValue !== confirmPin) {
      setMessage("The PIN must be 4 digits and both fields need to match.");
      return;
    }

    const stored = await createStoredPin(pinValue);
    saveStoredPin(stored);
    setHasPin(true);
    setPreferences({ ...preferences, enabled: true });
    setPinValue("");
    setConfirmPin("");
    setMessage("PIN lock is now enabled on this device.");
  };

  const handleExport = async () => {
    if (!viewer) return;
    const overviews = await loadEntryOverviews(viewer);
    const records = (
      await Promise.all(overviews.map((entry) => loadEntryRecord(viewer, entry.entryDate)))
    ).filter(Boolean);

    const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "nayoungnotes-export.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!viewer) return;
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const parsed = JSON.parse(text) as Awaited<ReturnType<typeof loadEntryRecord>>[];

    for (const record of parsed) {
      if (!record) continue;
      await persistDraft(viewer, record, true);
      await queueSave(viewer, record);
    }

    await flushPendingQueue(viewer);
    await queryClient.invalidateQueries();
    setMessage("Import finished. If you are online it will sync now, otherwise it will stay queued on this device.");
    event.target.value = "";
  };

  const handleSignOut = async () => {
    await signOutUser();
    savePreviewViewer(null);
    setViewer(null);
    await queryClient.clear();
  };

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          {configured ? <Cloud size={18} /> : <CloudOff size={18} />}
          <div>
            <strong>Cloud connection</strong>
            <p>
              {configured
                ? viewer?.mode === "supabase"
                  ? `Signed in as ${viewer.email ?? "your account"}.`
                  : "Supabase is ready, but this app is currently open in local preview mode."
                : "Supabase is not configured yet, so only local preview mode is available."}
            </p>
          </div>
        </div>
        {!configured ? (
          <p className={styles.message}>
            Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`,
            then run the updated `supabase/schema.sql` to enable real account sync.
          </p>
        ) : null}
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <LockKeyhole size={18} />
          <div>
            <strong>Device PIN lock</strong>
            <p>This setting only applies to this device and stays separate from your account.</p>
          </div>
        </div>

        {hasPin ? (
          <>
            <div className={styles.toggleRow}>
              <span>Enable PIN lock</span>
              <button
                type="button"
                className={preferences.enabled ? styles.primaryButton : styles.secondaryButton}
                onClick={() => setPreferences({ ...preferences, enabled: !preferences.enabled })}
              >
                {preferences.enabled ? "On" : "Off"}
              </button>
            </div>

            <div className={styles.inlineButtons}>
              {[1, 5, 15].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  className={
                    preferences.timeoutMinutes === minutes
                      ? styles.primaryButton
                      : styles.secondaryButton
                  }
                  onClick={() => setPreferences({ ...preferences, timeoutMinutes: minutes })}
                >
                  Lock after {minutes} min
                </button>
              ))}
            </div>

            <div className={styles.inlineButtons}>
              <button type="button" className={styles.secondaryButton} onClick={() => setLocked(true)}>
                Lock now
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  clearStoredPin();
                  setHasPin(false);
                  setPreferences({ ...preferences, enabled: false });
                }}
              >
                Remove PIN
              </button>
            </div>
          </>
        ) : (
          <div className={styles.pinSetup}>
            <label>
              4-digit PIN
              <input
                inputMode="numeric"
                value={pinValue}
                onChange={(event) => setPinValue(event.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="1234"
              />
            </label>
            <label>
              Confirm PIN
              <input
                inputMode="numeric"
                value={confirmPin}
                onChange={(event) =>
                  setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="1234"
              />
            </label>
            <button type="button" className={styles.primaryButton} onClick={handlePinSave}>
              Save PIN
            </button>
          </div>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <Download size={18} />
          <div>
            <strong>Export / Import</strong>
            <p>Move journal text, tasks, time plans, photo data, and handwriting strokes as JSON.</p>
          </div>
        </div>

        <div className={styles.inlineButtons}>
          <button type="button" className={styles.primaryButton} onClick={handleExport}>
            <Download size={16} />
            Export JSON
          </button>
          <label className={styles.uploadButton}>
            <Upload size={16} />
            Import JSON
            <input type="file" accept="application/json" onChange={handleImport} />
          </label>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <LogOut size={18} />
          <div>
            <strong>Account</strong>
            <p>This app is built for one person across many devices, with no sharing or team features.</p>
          </div>
        </div>

        <button type="button" className={styles.secondaryButton} onClick={handleSignOut}>
          Sign out
        </button>
      </section>

      {message ? <p className={styles.message}>{message}</p> : null}
    </div>
  );
}
