"use client";

import { useState } from "react";
import { LockKeyhole, Sparkles } from "lucide-react";
import { loadStoredPin, verifyStoredPin } from "@/lib/pin";
import { useAuthStore } from "@/store/auth-store";
import { usePinStore } from "@/store/pin-store";
import styles from "@/styles/shell.module.css";

export function PinLockOverlay() {
  const viewer = useAuthStore((state) => state.viewer);
  const { hasPin, loaded, locked, preferences, setLocked, touchActivity } = usePinStore();
  const [pinValue, setPinValue] = useState("");
  const [error, setError] = useState("");

  if (!viewer || !loaded || !hasPin || !preferences.enabled || !locked) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const stored = loadStoredPin();
    if (!stored) {
      setLocked(false);
      return;
    }

    const valid = await verifyStoredPin(pinValue, stored);
    if (valid) {
      setLocked(false);
      touchActivity();
      setPinValue("");
    setError("");
    return;
  }

    setError("That PIN does not match.");
    setPinValue("");
  };

  return (
    <div className={styles.lockBackdrop}>
      <form className={styles.lockCard} onSubmit={handleSubmit}>
        <span className={styles.lockBadge}>
          <LockKeyhole size={16} />
          Device lock
        </span>
        <h3>Enter PIN</h3>
        <p>
          This PIN stays on this device only. It is separate from your account sign-in and never sent to the server.
        </p>

        <div className={styles.pinDots} aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <span key={index} data-filled={index < pinValue.length}>
              <Sparkles size={10} />
            </span>
          ))}
        </div>

        <input
          className={styles.pinInput}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={pinValue}
          onChange={(event) => setPinValue(event.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="4-digit PIN"
        />

        {error ? <p className={styles.lockError}>{error}</p> : null}

        <div className={styles.lockActions}>
          <button type="submit" className={styles.primaryButton}>
            Unlock
          </button>
        </div>
      </form>
    </div>
  );
}
