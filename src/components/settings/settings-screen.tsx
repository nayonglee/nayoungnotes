"use client";

import type { ChangeEvent } from "react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, LockKeyhole, LogOut, Upload } from "lucide-react";
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
  const setViewer = useAuthStore((state) => state.setViewer);
  const { hasPin, preferences, setHasPin, setLocked, setPreferences } = usePinStore();
  const [pinValue, setPinValue] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [message, setMessage] = useState("");

  const handlePinSave = async () => {
    if (pinValue.length !== 4 || pinValue !== confirmPin) {
      setMessage("PIN must be 4 digits and both fields must match.");
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
    setMessage("Import queued. Any pending pages were synced or staged locally.");
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
          <LockKeyhole size={18} />
          <div>
            <strong>Local PIN lock</strong>
            <p>Device-only privacy that sits on top of your normal account login.</p>
          </div>
        </div>

        {hasPin ? (
          <>
            <div className={styles.toggleRow}>
              <span>PIN lock enabled</span>
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
                  Auto-lock in {minutes}m
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
              Save device PIN
            </button>
          </div>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <Download size={18} />
          <div>
            <strong>Export and import</strong>
            <p>Move your diary pages as JSON snapshots, including typed items and drawing strokes.</p>
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
            <p>Nayoung Notes is designed for one person&apos;s private pages, not teams or shared workspaces.</p>
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
