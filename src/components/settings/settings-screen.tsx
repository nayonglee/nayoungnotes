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
      setMessage("PIN은 4자리여야 하고 두 칸이 같아야 합니다.");
      return;
    }

    const stored = await createStoredPin(pinValue);
    saveStoredPin(stored);
    setHasPin(true);
    setPreferences({ ...preferences, enabled: true });
    setPinValue("");
    setConfirmPin("");
    setMessage("이 기기에서 PIN 잠금이 켜졌습니다.");
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
    setMessage("가져오기를 완료했습니다. 온라인이면 바로 동기화되고, 아니면 기기에 임시 저장됩니다.");
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
            <strong>클라우드 연동 상태</strong>
            <p>
              {configured
                ? viewer?.mode === "supabase"
                  ? `현재 ${viewer.email ?? "계정"} 으로 연결되어 있습니다.`
                  : "Supabase는 연결 가능하지만 지금은 로컬 미리보기로 열려 있습니다."
                : "Supabase 환경 변수가 아직 없어서 로컬 미리보기 모드만 가능합니다."}
            </p>
          </div>
        </div>
        {!configured ? (
          <p className={styles.message}>
            `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 넣고
            `supabase/schema.sql`을 적용하면 실제 계정 연동이 켜집니다.
          </p>
        ) : null}
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <LockKeyhole size={18} />
          <div>
            <strong>기기 PIN 잠금</strong>
            <p>이 설정은 이 기기에서만 동작합니다. 계정과는 별개입니다.</p>
          </div>
        </div>

        {hasPin ? (
          <>
            <div className={styles.toggleRow}>
              <span>PIN 잠금 사용</span>
              <button
                type="button"
                className={preferences.enabled ? styles.primaryButton : styles.secondaryButton}
                onClick={() => setPreferences({ ...preferences, enabled: !preferences.enabled })}
              >
                {preferences.enabled ? "켜짐" : "꺼짐"}
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
                  {minutes}분 후 잠금
                </button>
              ))}
            </div>

            <div className={styles.inlineButtons}>
              <button type="button" className={styles.secondaryButton} onClick={() => setLocked(true)}>
                지금 잠그기
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
                PIN 삭제
              </button>
            </div>
          </>
        ) : (
          <div className={styles.pinSetup}>
            <label>
              4자리 PIN
              <input
                inputMode="numeric"
                value={pinValue}
                onChange={(event) => setPinValue(event.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="1234"
              />
            </label>
            <label>
              PIN 확인
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
              PIN 저장
            </button>
          </div>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <Download size={18} />
          <div>
            <strong>내보내기 / 가져오기</strong>
            <p>텍스트, 체크리스트, 사진 정보, 손글씨 stroke 데이터를 JSON으로 옮길 수 있습니다.</p>
          </div>
        </div>

        <div className={styles.inlineButtons}>
          <button type="button" className={styles.primaryButton} onClick={handleExport}>
            <Download size={16} />
            JSON 내보내기
          </button>
          <label className={styles.uploadButton}>
            <Upload size={16} />
            JSON 가져오기
            <input type="file" accept="application/json" onChange={handleImport} />
          </label>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <LogOut size={18} />
          <div>
            <strong>계정</strong>
            <p>혼자 쓰는 개인 다이어리 기준으로 맞춘 앱입니다. 공유 기능은 없습니다.</p>
          </div>
        </div>

        <button type="button" className={styles.secondaryButton} onClick={handleSignOut}>
          로그아웃
        </button>
      </section>

      {message ? <p className={styles.message}>{message}</p> : null}
    </div>
  );
}
