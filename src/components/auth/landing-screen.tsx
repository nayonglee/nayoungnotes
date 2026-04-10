"use client";

import type { FormEvent } from "react";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Cloud,
  CloudOff,
  Heart,
  LockKeyhole,
  Mail,
  Star
} from "lucide-react";
import { ScrapIcon } from "@/components/ui/scrap-icon";
import {
  savePreviewViewer,
  signInWithMagicLink,
  signInWithPassword,
  signUpWithPassword
} from "@/lib/auth";
import {
  clearRuntimeSupabaseConfig,
  loadRuntimeSupabaseConfig,
  saveRuntimeSupabaseConfig
} from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth-store";
import styles from "@/styles/landing.module.css";

type AuthPanelMode = "signin" | "signup" | "magic";

export function LandingScreen() {
  const router = useRouter();
  const viewer = useAuthStore((state) => state.viewer);
  const sessionReady = useAuthStore((state) => state.sessionReady);
  const configured = useAuthStore((state) => state.supabaseConfigured);
  const setViewer = useAuthStore((state) => state.setViewer);
  const [mode, setMode] = useState<AuthPanelMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [runtimeUrl, setRuntimeUrl] = useState(() => loadRuntimeSupabaseConfig()?.url ?? "");
  const [runtimeAnonKey, setRuntimeAnonKey] = useState(
    () => loadRuntimeSupabaseConfig()?.anonKey ?? ""
  );
  const [runtimeBucket, setRuntimeBucket] = useState(
    () => loadRuntimeSupabaseConfig()?.bucket ?? "diary-photos"
  );

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
      } else if (mode === "signup") {
        await signUpWithPassword(email, password);
        setMessage("Your account was created. If email confirmation is enabled, confirm it first and then sign in.");
      } else {
        await signInWithMagicLink(email);
        setMessage("A sign-in link was sent to your inbox.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong while signing in.");
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

  const saveRuntimeConfig = () => {
    if (!runtimeUrl.trim() || !runtimeAnonKey.trim()) {
      setMessage("Please enter both the Supabase URL and anon key.");
      return;
    }

    saveRuntimeSupabaseConfig({
      url: runtimeUrl.trim(),
      anonKey: runtimeAnonKey.trim(),
      bucket: runtimeBucket.trim() || "diary-photos"
    });
    setMessage("Supabase connection details were saved on this device. Account sign-in is ready now.");
  };

  const clearRuntimeConfig = () => {
    clearRuntimeSupabaseConfig();
    setRuntimeUrl("");
    setRuntimeAnonKey("");
    setRuntimeBucket("diary-photos");
    setMessage("The stored Supabase connection for this device was removed.");
  };

  return (
    <div className={styles.page}>
      <section className={styles.coverPanel}>
        <div className={styles.coverHeader}>
          <span className={styles.brandPill}>Nayoung Notes</span>
          <span className={styles.syncPill}>
            {configured ? <Cloud size={15} /> : <CloudOff size={15} />}
            {configured ? "Cloud ready" : "Setup needed"}
          </span>
        </div>

        <div className={styles.coverBody}>
          <div className={styles.coverSpine}>
            <span className={styles.spineCharm}>
              <ScrapIcon kind="swirl" size={22} />
            </span>
            <span className={styles.spineText}>diary</span>
            <span className={styles.spineCharm}>
              <ScrapIcon kind="star" size={22} />
            </span>
          </div>

          <div className={styles.coverSheet}>
            <div className={styles.coverDecor}>
              <span className={styles.decorBadge}>
                <Star size={14} />
                star tabs
              </span>
              <span className={styles.decorBadge}>
                <Heart size={14} />
                heart labels
              </span>
              <span className={styles.decorBadge}>
                <LockKeyhole size={14} />
                pin lock
              </span>
            </div>

            <h1>Private scrapbook diary</h1>
            <p>
              Daily pages stay structured, while photos, stickers, handwriting, and plans can still feel playful.
              It is meant to feel like a diary board, not a team dashboard.
            </p>

            <div className={styles.motifRow}>
              <span><ScrapIcon kind="star" size={22} /></span>
              <span><ScrapIcon kind="heart" size={22} /></span>
              <span><ScrapIcon kind="swirl" size={22} /></span>
              <span><ScrapIcon kind="flower" size={22} /></span>
              <span><ScrapIcon kind="ribbon" size={22} /></span>
            </div>

            <div className={styles.memoGrid}>
              <article className={styles.memoCard}>
                <strong>Write</strong>
                <p>Start with a title, mood, checklist, time plan, and journal text.</p>
              </article>
              <article className={styles.memoCard}>
                <strong>Decorate</strong>
                <p>Photos, stickers, and handwriting stay flexible inside a contained scrapbook board.</p>
              </article>
              <article className={styles.memoCard}>
                <strong>Sync</strong>
                <p>Connect Supabase to continue the same diary across your laptop, tablet, and phone.</p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.authPanel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.sectionPill}>account</span>
            <h2>Account</h2>
          </div>
          <p>Your sync account and your device PIN are two separate things.</p>
        </div>

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
          <button
            type="button"
            className={mode === "magic" ? styles.activeTab : styles.tab}
            onClick={() => setMode("magic")}
          >
            Magic link
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

          {mode !== "magic" ? (
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
          ) : null}

          <button type="submit" className={styles.primaryAction} disabled={busy || !configured}>
            <span>
              {mode === "signin"
                ? "Continue with account"
                : mode === "signup"
                  ? "Create new account"
                  : "Send sign-in link"}
            </span>
            <ArrowRight size={16} />
          </button>
        </form>

        {!configured ? (
          <div className={styles.setupCard}>
            <div className={styles.setupTitle}>
              <CloudOff size={16} />
              <strong>You are in local preview mode</strong>
            </div>
            <p>
              You can build with `.env.local`, or paste the Supabase URL and anon key below to connect directly on this device.
            </p>
            <div className={styles.setupForm}>
              <label className={styles.setupField}>
                Supabase URL
                <input
                  value={runtimeUrl}
                  onChange={(event) => setRuntimeUrl(event.target.value)}
                  placeholder="https://your-project.supabase.co"
                />
              </label>
              <label className={styles.setupField}>
                Supabase anon key
                <input
                  value={runtimeAnonKey}
                  onChange={(event) => setRuntimeAnonKey(event.target.value)}
                  placeholder="eyJ..."
                />
              </label>
              <label className={styles.setupField}>
                Storage bucket
                <input
                  value={runtimeBucket}
                  onChange={(event) => setRuntimeBucket(event.target.value)}
                  placeholder="diary-photos"
                />
              </label>
            </div>
            <div className={styles.setupActions}>
              <button type="button" className={styles.primaryAction} onClick={saveRuntimeConfig}>
                Save on this device
              </button>
              <button type="button" className={styles.secondaryAction} onClick={clearRuntimeConfig}>
                Clear values
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.setupCard}>
            <div className={styles.setupTitle}>
              <Cloud size={16} />
              <strong>Cloud sync is ready</strong>
            </div>
            <p>You can sign in with a password or use an email magic link.</p>
          </div>
        )}

        <button type="button" className={styles.secondaryAction} onClick={openPreview}>
          <Mail size={15} />
          Open local preview
        </button>

        {message ? <p className={styles.message}>{message}</p> : null}
      </section>
    </div>
  );
}
