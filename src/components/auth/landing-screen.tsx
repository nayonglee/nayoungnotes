"use client";

import type { FormEvent } from "react";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Heart, LockKeyhole, NotebookTabs, Sticker } from "lucide-react";
import { savePreviewViewer, signInWithPassword, signUpWithPassword } from "@/lib/auth";
import { useAuthStore } from "@/store/auth-store";
import styles from "@/styles/landing.module.css";

export function LandingScreen() {
  const router = useRouter();
  const viewer = useAuthStore((state) => state.viewer);
  const sessionReady = useAuthStore((state) => state.sessionReady);
  const configured = useAuthStore((state) => state.supabaseConfigured);
  const setViewer = useAuthStore((state) => state.setViewer);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (sessionReady && viewer) {
      startTransition(() => {
        router.replace("/archive");
      });
    }
  }, [router, sessionReady, viewer]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      if (mode === "signin") {
        await signInWithPassword(email, password);
      } else {
        await signUpWithPassword(email, password);
        setMessage("Account created. If email confirmation is enabled, check your inbox first.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const openPreview = () => {
    const previewViewer = {
      id: "preview-user",
      email: "preview@nayoungnotes.local",
      mode: "preview" as const
    };
    savePreviewViewer(previewViewer);
    setViewer(previewViewer);
    startTransition(() => {
      router.push("/archive");
    });
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCard}>
          <span className={styles.ribbon}>Scrapbook planner PWA</span>
          <h1>Nayoung Notes</h1>
          <p>
            A synced diary made for one person. Structure for fast capture, freedom for decorating,
            and a calm stationery glow that still feels practical every day.
          </p>

          <div className={styles.heroBadges}>
            <span>
              <NotebookTabs size={16} />
              structured planner page
            </span>
            <span>
              <Sticker size={16} />
              scrapbook layer
            </span>
            <span>
              <LockKeyhole size={16} />
              local PIN privacy
            </span>
          </div>
        </div>

        <div className={styles.stickerCloud}>
          <article className={styles.floatCard}>
            <Heart size={18} />
            <strong>Quick capture</strong>
            <p>Title, mood, todos, diary text, all ready from the start.</p>
          </article>
          <article className={styles.floatCard}>
            <Sticker size={18} />
            <strong>Decorate softly</strong>
            <p>Move photos and stickers around a gentle memory board, not an endless canvas.</p>
          </article>
          <article className={styles.floatCard}>
            <LockKeyhole size={18} />
            <strong>Private by device</strong>
            <p>PIN lock stays local, while sync stays in your account.</p>
          </article>
        </div>
      </section>

      <section className={styles.authPanel}>
        <div className={styles.tabRow}>
          <button
            type="button"
            className={mode === "signin" ? styles.activeTab : styles.tab}
            onClick={() => setMode("signin")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === "signup" ? styles.activeTab : styles.tab}
            onClick={() => setMode("signup")}
          >
            Create account
          </button>
        </div>

        <form className={styles.authForm} onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
            />
          </label>
          <button type="submit" className={styles.primaryAction} disabled={busy || !configured}>
            <span>{mode === "signin" ? "Open diary" : "Create diary account"}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <button type="button" className={styles.secondaryAction} onClick={openPreview}>
          Open local preview mode
        </button>

        {!configured ? (
          <p className={styles.setupHint}>
            Supabase keys are not configured yet, so account sync is currently disabled. Preview
            mode still lets you inspect the full diary UI and offline flows locally.
          </p>
        ) : null}

        {message ? <p className={styles.message}>{message}</p> : null}
      </section>
    </div>
  );
}
