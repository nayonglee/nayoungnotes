"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { formatEntryDate } from "@/lib/date";
import { createBlankEntry } from "@/lib/entry";
import {
  clearPendingState,
  loadEntryRecord,
  persistDraft,
  queueDelete,
  queueSave
} from "@/lib/local/sync";
import { deleteEntry, saveEntry } from "@/lib/supabase/repository";
import { moodOptions, themePresets } from "@/lib/theme";
import { useAuthStore } from "@/store/auth-store";
import { useSyncStore } from "@/store/sync-store";
import type { DiaryEntryRecord } from "@/types/diary";
import { HandwritingPad } from "@/components/entry/handwriting-pad";
import { PhotoBoard } from "@/components/entry/photo-board";
import { SaveStateChip } from "@/components/entry/save-state-chip";
import { TodoEditor } from "@/components/entry/todo-editor";
import styles from "@/styles/entry.module.css";

export function EntryEditor({ entryDate }: { entryDate: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const viewer = useAuthStore((state) => state.viewer);
  const setStatus = useSyncStore((state) => state.setStatus);
  const status = useSyncStore((state) => state.byEntryDate[entryDate]);
  const [draftRecord, setDraftRecord] = useState<DiaryEntryRecord | null>(null);
  const localTimer = useRef<number | null>(null);
  const remoteTimer = useRef<number | null>(null);

  const query = useQuery({
    queryKey: ["entry", viewer?.id, entryDate],
    queryFn: () => loadEntryRecord(viewer!, entryDate),
    enabled: Boolean(viewer)
  });

  const baseRecord = query.data ?? (viewer ? createBlankEntry(entryDate, viewer) : null);
  const record = draftRecord ?? baseRecord;

  useEffect(() => {
    if (query.data) {
      setStatus(entryDate, { state: "saved", lastSavedAt: query.data.updatedAt });
    }
  }, [entryDate, query.data, setStatus]);

  const scheduleSave = (next: DiaryEntryRecord) => {
    if (!viewer) return;

    if (localTimer.current) window.clearTimeout(localTimer.current);
    if (remoteTimer.current) window.clearTimeout(remoteTimer.current);

    localTimer.current = window.setTimeout(() => {
      void persistDraft(viewer, next, true);
    }, 180);

    remoteTimer.current = window.setTimeout(async () => {
      if (!navigator.onLine) {
        await persistDraft(viewer, next, true);
        await queueSave(viewer, next);
        setStatus(entryDate, { state: "offline-draft" });
        return;
      }

      try {
        setStatus(entryDate, { state: "syncing" });
        const savedRecord = await saveEntry(viewer, next);
        setDraftRecord(null);
        await persistDraft(viewer, savedRecord, false);
        await clearPendingState(viewer, entryDate);
        queryClient.setQueryData(["entry", viewer.id, entryDate], savedRecord);
        await queryClient.invalidateQueries({ queryKey: ["entries", viewer.id] });
        setStatus(entryDate, { state: "saved", lastSavedAt: savedRecord.updatedAt });
      } catch (error) {
        await persistDraft(viewer, next, true);
        await queueSave(viewer, next, error instanceof Error ? error.message : "Save failed");
        setStatus(entryDate, { state: "offline-draft" });
      }
    }, 900);
  };

  useEffect(
    () => () => {
      if (localTimer.current) window.clearTimeout(localTimer.current);
      if (remoteTimer.current) window.clearTimeout(remoteTimer.current);
    },
    []
  );

  const updateRecord = (updater: (current: DiaryEntryRecord) => DiaryEntryRecord) => {
    setDraftRecord((currentDraft) => {
      const source = currentDraft ?? record;
      if (!source) return currentDraft;

      const next = updater({
        ...source,
        updatedAt: new Date().toISOString()
      });

      setStatus(entryDate, {
        state: navigator.onLine ? "syncing" : "offline-draft"
      });
      scheduleSave(next);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!record || !viewer || !window.confirm("이 페이지를 삭제할까요?")) return;

    if (!navigator.onLine) {
      await queueDelete(viewer, record);
      router.push("/archive");
      return;
    }

    await deleteEntry(viewer, record);
    await queryClient.invalidateQueries({ queryKey: ["entries", viewer.id] });
    router.push("/archive");
  };

  if (!record) return <div className={styles.loadingState}>페이지를 불러오는 중입니다.</div>;

  return (
    <div className={styles.editorPage} data-theme-preset={record.themeConfig.preset}>
      <section className={styles.metaCard}>
        <div>
          <span className={styles.sectionTag}>오늘</span>
          <h3>{formatEntryDate(entryDate)}</h3>
          <p>제목, 체크리스트, 본문, 사진, 손글씨를 한 페이지에서 정리합니다.</p>
        </div>
        <div className={styles.metaActions}>
          <SaveStateChip state={status?.state ?? "saved"} />
          <button type="button" className={styles.secondaryButton} onClick={handleDelete}>
            <Trash2 size={15} />
            페이지 삭제
          </button>
        </div>
      </section>

      <section className={styles.entryCard}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionTag}>표지</span>
            <h4>오늘 제목</h4>
          </div>
        </div>
        <input
          className={styles.titleInput}
          value={record.title}
          onChange={(event) => updateRecord((current) => ({ ...current, title: event.target.value }))}
          placeholder="오늘 페이지 제목"
        />

        <div className={styles.moodRow}>
          {moodOptions.map((mood) => (
            <button
              key={mood.id}
              type="button"
              className={record.mood === mood.id ? styles.moodActive : styles.moodChip}
              onClick={() =>
                updateRecord((current) => ({
                  ...current,
                  mood: current.mood === mood.id ? undefined : mood.id
                }))
              }
              style={{ "--chip-accent": mood.accent } as CSSProperties}
            >
              {mood.label}
            </button>
          ))}
        </div>

        <div className={styles.themeRow}>
          {themePresets.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className={record.themeConfig.preset === theme.id ? styles.themeActive : styles.themeChip}
              onClick={() =>
                updateRecord((current) => ({
                  ...current,
                  themeConfig: {
                    preset: theme.id,
                    texture: theme.texture,
                    boardTone: theme.boardTone
                  }
                }))
              }
            >
              <strong>{theme.label}</strong>
              <span>{theme.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.grid}>
        <article className={styles.entryCard}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionTag}>체크</span>
              <h4>빠른 체크리스트</h4>
            </div>
          </div>
          <TodoEditor
            items={record.todo.payload.items}
            onChange={(items) =>
              updateRecord((current) => ({
                ...current,
                todo: { ...current.todo, payload: { items } }
              }))
            }
          />
        </article>

        <article className={styles.entryCard}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionTag}>본문</span>
              <h4>본문</h4>
            </div>
          </div>
          <TextareaAutosize
            className={styles.diaryInput}
            minRows={8}
            value={record.text.payload.content}
            onChange={(event) =>
              updateRecord((current) => ({
                ...current,
                text: {
                  ...current.text,
                  payload: { content: event.target.value }
                }
              }))
            }
            placeholder="오늘 있었던 일, 기분, 메모를 편하게 적어 주세요."
          />
        </article>
      </section>

      <section className={styles.entryCard}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionTag}>보드</span>
            <h4>사진 / 스티커 보드</h4>
          </div>
        </div>
        <PhotoBoard
          photos={record.photos}
          stickers={record.stickers}
          onPhotosChange={(photos) => updateRecord((current) => ({ ...current, photos }))}
          onStickersChange={(stickers) => updateRecord((current) => ({ ...current, stickers }))}
        />
      </section>

      <section className={styles.entryCard}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionTag}>펜</span>
            <h4>손글씨</h4>
          </div>
        </div>
        <HandwritingPad
          key={record.drawing.id}
          drawing={record.drawing}
          onChange={(drawing) => updateRecord((current) => ({ ...current, drawing }))}
        />
      </section>
    </div>
  );
}
