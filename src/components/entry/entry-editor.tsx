"use client";

import { useEffect, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
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
import { themePresets } from "@/lib/theme";
import { useAuthStore } from "@/store/auth-store";
import { useSyncStore } from "@/store/sync-store";
import type { DiaryEntryRecord } from "@/types/diary";
import { BaseballNote } from "@/components/entry/baseball-note";
import { HandwritingPad } from "@/components/entry/handwriting-pad";
import { PhotoBoard } from "@/components/entry/photo-board";
import { SaveStateChip } from "@/components/entry/save-state-chip";
import { TimePlanner } from "@/components/entry/time-planner";
import { TodoEditor } from "@/components/entry/todo-editor";
import styles from "@/styles/entry.module.css";

const binderRings = [0, 1, 2, 3, 4, 5];

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
    if (!record || !viewer || !window.confirm("Delete this page?")) return;

    if (!navigator.onLine) {
      await queueDelete(viewer, record);
      router.push("/archive");
      return;
    }

    await deleteEntry(viewer, record);
    await queryClient.invalidateQueries({ queryKey: ["entries", viewer.id] });
    router.push("/archive");
  };

  if (!record) return <div className={styles.loadingState}>Loading page...</div>;

  return (
    <div className={styles.editorPage} data-theme-preset={record.themeConfig.preset}>
      <div className={styles.dailyBinder}>
        <div className={styles.dailyPaper}>
          <div className={styles.spreadLayout}>
            <div className={styles.spreadPage}>
              <section className={styles.metaCard}>
                <div className={styles.metaIntro}>
                  <button type="button" className={styles.backButton} onClick={() => router.push("/archive")}>
                    <ArrowLeft size={15} />
                    Archive
                  </button>
                  <div className={styles.metaTitleRow}>
                    <div className={styles.metaDateBlock}>
                      <span className={styles.fieldLabel}>Date</span>
                      <h3>{formatEntryDate(entryDate)}</h3>
                    </div>
                    <label className={styles.metaTitleField}>
                      <span className={styles.fieldLabel}>Title</span>
                      <input
                        className={styles.metaTitleInput}
                        value={record.title}
                        onChange={(event) =>
                          updateRecord((current) => ({ ...current, title: event.target.value }))
                        }
                        placeholder="Name this page"
                      />
                    </label>
                  </div>
                </div>
                <div className={styles.metaActions}>
                  <SaveStateChip state={status?.state ?? "saved"} />
                  <button type="button" className={styles.ghostButton} onClick={handleDelete}>
                    <Trash2 size={15} />
                    Delete page
                  </button>
                </div>
              </section>

              <article className={styles.entryCard}>
                <div className={styles.sectionHeader}>
                  <h4>Diary note</h4>
                </div>
                <TextareaAutosize
                  className={styles.diaryInput}
                  minRows={10}
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
                  placeholder="Write the story of the day, what happened, or what you want to remember."
                />
              </article>

              <section className={styles.gridSingle}>
                <article className={styles.entryCard}>
                  <div className={styles.sectionHeader}>
                    <h4>Checklist</h4>
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
                    <h4>Baseball pocket</h4>
                  </div>
                  <BaseballNote
                    entryDate={entryDate}
                    payload={record.baseball.payload}
                    onChange={(payload) =>
                      updateRecord((current) => ({
                        ...current,
                        baseball: {
                          ...current.baseball,
                          payload
                        }
                      }))
                    }
                  />
                </article>
              </section>
            </div>

            <div className={styles.spreadPage}>
              <article className={styles.entryCard}>
              <div className={styles.sectionHeader}>
                <h4>Time notes</h4>
              </div>
              <TimePlanner
                blocks={record.planner.payload.blocks}
                onChange={(blocks) =>
                  updateRecord((current) => ({
                    ...current,
                    planner: {
                      ...current.planner,
                      payload: { blocks }
                    }
                  }))
                }
              />
              </article>

              <section className={styles.entryCard}>
                <div className={styles.sectionHeader}>
                  <h4>Scrapbook page</h4>
                </div>
                <PhotoBoard
                  themePreset={record.themeConfig.preset}
                  themeOptions={themePresets}
                  photos={record.photos}
                  stickers={record.stickers}
                  onThemeChange={(themeId) => {
                    const theme = themePresets.find((item) => item.id === themeId);
                    if (!theme) return;
                    updateRecord((current) => ({
                      ...current,
                      themeConfig: {
                        preset: theme.id,
                        texture: theme.texture,
                        boardTone: theme.boardTone
                      }
                    }));
                  }}
                  onPhotosChange={(photos) => updateRecord((current) => ({ ...current, photos }))}
                  onStickersChange={(stickers) => updateRecord((current) => ({ ...current, stickers }))}
                />
              </section>

              <section className={styles.entryCard}>
                <div className={styles.sectionHeader}>
                  <h4>Handwriting</h4>
                </div>
                <HandwritingPad
                  key={record.drawing.id}
                  drawing={record.drawing}
                  onChange={(drawing) => updateRecord((current) => ({ ...current, drawing }))}
                />
              </section>
            </div>
          </div>
        </div>

        <div className={styles.dailyRings} aria-hidden="true">
          {binderRings.map((ring) => (
            <span key={ring} className={styles.dailyRing} />
          ))}
        </div>
      </div>
    </div>
  );
}
