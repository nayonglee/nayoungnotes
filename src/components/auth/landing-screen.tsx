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
import {
  savePreviewViewer,
  signInWithMagicLink,
  signInWithPassword,
  signUpWithPassword
} from "@/lib/auth";
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
        setMessage("가입이 완료됐습니다. 이메일 인증을 켠 경우 메일 확인 후 로그인해 주세요.");
      } else {
        await signInWithMagicLink(email);
        setMessage("로그인 링크를 보냈습니다. 받은 편지함에서 확인해 주세요.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "로그인 중 문제가 생겼습니다.");
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
      <section className={styles.coverPanel}>
        <div className={styles.coverHeader}>
          <span className={styles.brandPill}>Nayoung Notes</span>
          <span className={styles.syncPill}>
            {configured ? <Cloud size={15} /> : <CloudOff size={15} />}
            {configured ? "클라우드 연동 가능" : "연동 준비 필요"}
          </span>
        </div>

        <div className={styles.coverBody}>
          <div className={styles.coverSpine}>
            <span className={styles.spineCharm}>◎</span>
            <span className={styles.spineText}>diary</span>
            <span className={styles.spineCharm}>★</span>
          </div>

          <div className={styles.coverSheet}>
            <div className={styles.coverDecor}>
              <span className={styles.decorBadge}>
                <Star size={14} />
                star tab
              </span>
              <span className={styles.decorBadge}>
                <Heart size={14} />
                heart memo
              </span>
              <span className={styles.decorBadge}>
                <LockKeyhole size={14} />
                pin lock
              </span>
            </div>

            <h1>한 사람용 스크랩 다이어리</h1>
            <p>
              날짜별 페이지는 정돈되어 있고, 사진·스티커·손글씨는 조금 더 자유롭게 둘 수 있게
              구성했습니다. 너무 플랫폼 같지 않고, 너무 복잡하지 않게 정리한 버전입니다.
            </p>

            <div className={styles.motifRow}>
              <span>★</span>
              <span>♡</span>
              <span>◎</span>
              <span>✿</span>
              <span>✦</span>
            </div>

            <div className={styles.memoGrid}>
              <article className={styles.memoCard}>
                <strong>기록</strong>
                <p>제목, 기분, 체크리스트, 일기 본문을 바로 적을 수 있습니다.</p>
              </article>
              <article className={styles.memoCard}>
                <strong>꾸미기</strong>
                <p>사진, 스티커, 손글씨는 보드 안에서만 부드럽게 움직일 수 있습니다.</p>
              </article>
              <article className={styles.memoCard}>
                <strong>동기화</strong>
                <p>Supabase를 연결하면 여러 기기에서 같은 계정으로 이어서 쓸 수 있습니다.</p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.authPanel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.sectionPill}>account</span>
            <h2>계정 연결</h2>
          </div>
          <p>동기화용 계정과 기기 내 PIN 잠금은 서로 별개입니다.</p>
        </div>

        <div className={styles.tabRow}>
          <button
            type="button"
            className={mode === "signin" ? styles.activeTab : styles.tab}
            onClick={() => setMode("signin")}
          >
            로그인
          </button>
          <button
            type="button"
            className={mode === "signup" ? styles.activeTab : styles.tab}
            onClick={() => setMode("signup")}
          >
            가입
          </button>
          <button
            type="button"
            className={mode === "magic" ? styles.activeTab : styles.tab}
            onClick={() => setMode("magic")}
          >
            이메일 링크
          </button>
        </div>

        <form className={styles.authForm} onSubmit={handleSubmit}>
          <label>
            이메일
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
              비밀번호
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="6자 이상"
                required
                minLength={6}
              />
            </label>
          ) : null}

          <button type="submit" className={styles.primaryAction} disabled={busy || !configured}>
            <span>
              {mode === "signin"
                ? "계정으로 시작"
                : mode === "signup"
                  ? "새 계정 만들기"
                  : "로그인 링크 보내기"}
            </span>
            <ArrowRight size={16} />
          </button>
        </form>

        {!configured ? (
          <div className={styles.setupCard}>
            <div className={styles.setupTitle}>
              <CloudOff size={16} />
              <strong>지금은 로컬 미리보기 상태입니다</strong>
            </div>
            <p>
              `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`,
              `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 넣고 `supabase/schema.sql`을 적용하면 실제 계정
              연동이 켜집니다.
            </p>
          </div>
        ) : (
          <div className={styles.setupCard}>
            <div className={styles.setupTitle}>
              <Cloud size={16} />
              <strong>클라우드 연동 준비 완료</strong>
            </div>
            <p>비밀번호 로그인이나 이메일 링크 로그인으로 바로 들어갈 수 있습니다.</p>
          </div>
        )}

        <button type="button" className={styles.secondaryAction} onClick={openPreview}>
          <Mail size={15} />
          로컬 미리보기 열기
        </button>

        {message ? <p className={styles.message}>{message}</p> : null}
      </section>
    </div>
  );
}
