"use client";

import type { CSSProperties } from "react";
import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { addMonths, format, parseISO, subMonths } from "date-fns";
import NextImage from "next/image";
import { CalendarRange, ChevronLeft, ChevronRight, List, Plus } from "lucide-react";
import { ScrapIcon, type ScrapIconKind } from "@/components/ui/scrap-icon";
import { buildCalendarMatrix, todayKey } from "@/lib/date";
import { getLocalAsset } from "@/lib/local/database";
import { loadEntryOverviews } from "@/lib/local/sync";
import { useAuthStore } from "@/store/auth-store";
import type { EntryOverview, MoodKey, ThemePreset } from "@/types/diary";
import styles from "@/styles/archive.module.css";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EMPTY_ENTRIES: EntryOverview[] = [];

const moodStampMap: Record<MoodKey, { label: string; icon: ScrapIconKind }> = {
  glowy: { label: "Glow", icon: "spark" },
  calm: { label: "Calm", icon: "flower" },
  proud: { label: "Proud", icon: "heart" },
  busy: { label: "Busy", icon: "ribbon" },
  dreamy: { label: "Dreamy", icon: "swirl" },
  gentle: { label: "Soft", icon: "star" }
};

function themeLabel(theme: ThemePreset) {
  if (theme === "mint") return "mint";
  if (theme === "berry") return "berry";
  return "petal";
}

function useLocalAssetUrl(assetId?: string, remoteUrl?: string) {
  const [assetUrl, setAssetUrl] = useState<string>();

  useEffect(() => {
    if (!assetId || remoteUrl) return;

    let objectUrl: string | undefined;
    void getLocalAsset(assetId).then((asset) => {
      if (!asset) return;
      objectUrl = URL.createObjectURL(asset.blob);
      setAssetUrl(objectUrl);
    });

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId, remoteUrl]);

  return remoteUrl ?? assetUrl;
}

function BoardTile({
  entry,
  onOpen
}: {
  entry: EntryOverview;
  onOpen: (date: string) => void;
}) {
  const coverUrl = useLocalAssetUrl(entry.coverPhotoLocalAssetId, entry.coverPhotoUrl);
  const mood = entry.mood ? moodStampMap[entry.mood] : null;

  return (
    <button
      type="button"
      className={styles.boardTile}
      data-theme={themeLabel(entry.themeConfig.preset)}
      onClick={() => onOpen(entry.entryDate)}
    >
      <div className={styles.tileTape} />
      <div className={styles.tileMedia}>
        {coverUrl ? (
          <NextImage src={coverUrl} alt="" fill unoptimized className={styles.tileImage} />
        ) : (
          <div className={styles.tileArtwork}>
            <ScrapIcon kind={entry.themeConfig.preset === "mint" ? "star" : "heart"} size={34} />
            <ScrapIcon kind={entry.themeConfig.preset === "berry" ? "ribbon" : "swirl"} size={24} />
            <ScrapIcon kind="flower" size={26} />
          </div>
        )}
        <div className={styles.tileOverlay} />
      </div>

      <div className={styles.tileBody}>
        <div className={styles.tileTop}>
          <span className={styles.tileDate}>{format(parseISO(entry.entryDate), "MMM d")}</span>
          {mood ? (
            <span className={styles.tileMood}>
              <ScrapIcon kind={mood.icon} size={16} />
              {mood.label}
            </span>
          ) : null}
        </div>
        <strong>{entry.title}</strong>
        <p>{entry.previewText || "Open the page to add photos, plans, and handwritten notes."}</p>
        <div className={styles.tileFooter}>
          <span>{entry.photoCount} photos</span>
          <span>{entry.todoCount} tasks</span>
          <span>{entry.plannerCount} plans</span>
        </div>
      </div>
    </button>
  );
}

export function ArchiveHome() {
  const router = useRouter();
  const viewer = useAuthStore((state) => state.viewer);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [anchorDate, setAnchorDate] = useState(todayKey());
  const todayDate = todayKey();

  const query = useQuery({
    queryKey: ["entries", viewer?.id, "overview"],
    queryFn: () => loadEntryOverviews(viewer!),
    enabled: Boolean(viewer)
  });

  const entries = query.data ?? EMPTY_ENTRIES;
  const entriesByDate = useMemo(
    () => new Map(entries.map((entry) => [entry.entryDate, entry])),
    [entries]
  );
  const weeks = buildCalendarMatrix(anchorDate);
  const boardEntries = entries.slice(0, 12);
  const monthEntries = useMemo(
    () => entries.filter((entry) => entry.entryDate.startsWith(anchorDate.slice(0, 7))),
    [anchorDate, entries]
  );
  const monthPhotoCount = monthEntries.reduce((sum, entry) => sum + entry.photoCount, 0);
  const monthPlanCount = monthEntries.reduce((sum, entry) => sum + entry.plannerCount, 0);
  const monthTodoDone = monthEntries.reduce((sum, entry) => sum + entry.completedTodoCount, 0);
  const monthTodoTotal = monthEntries.reduce((sum, entry) => sum + entry.todoCount, 0);

  const openEntry = (date: string) => {
    startTransition(() => {
      router.push(`/entry/${date}`);
    });
  };

  return (
    <div className={styles.page}>
      <section className={styles.boardSection}>
        <div className={styles.boardHeader}>
          <div>
            <span className={styles.sectionTag}>board archive</span>
            <h3>Start from the scrapbook board</h3>
            <p>Recent pages land here first, like a diary board instead of a dashboard.</p>
          </div>
          <div className={styles.boardStats}>
            <span className={styles.statChip}>{monthEntries.length} pages</span>
            <span className={styles.statChip}>{monthPhotoCount} photos</span>
            <span className={styles.statChip}>{monthPlanCount} plans</span>
            <span className={styles.statChip}>
              {monthTodoDone}/{monthTodoTotal || 0} done
            </span>
          </div>
        </div>

        <div className={styles.boardGrid}>
          <button type="button" className={styles.newTile} onClick={() => openEntry(todayDate)}>
            <span className={styles.newBadge}>Today</span>
            <div className={styles.newIcon}>
              <Plus size={22} />
            </div>
            <strong>Create or continue today&apos;s page</strong>
            <p>Open the daily spread with checklist, time blocks, photos, handwriting, and journal space.</p>
          </button>

          {boardEntries.map((entry) => (
            <BoardTile key={entry.entryDate} entry={entry} onOpen={openEntry} />
          ))}
        </div>
      </section>

      <section className={styles.archiveCard}>
        <div className={styles.cardHeader}>
          <div>
            <span className={styles.sectionTag}>month archive</span>
            <h3>{format(parseISO(anchorDate), "MMMM yyyy")}</h3>
          </div>

          <div className={styles.controls}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setAnchorDate(format(subMonths(parseISO(anchorDate), 1), "yyyy-MM-dd"))}
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setAnchorDate(format(addMonths(parseISO(anchorDate), 1), "yyyy-MM-dd"))}
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              className={viewMode === "calendar" ? styles.activeToggle : styles.toggle}
              onClick={() => setViewMode("calendar")}
            >
              <CalendarRange size={16} />
              Calendar
            </button>
            <button
              type="button"
              className={viewMode === "list" ? styles.activeToggle : styles.toggle}
              onClick={() => setViewMode("list")}
            >
              <List size={16} />
              List
            </button>
          </div>
        </div>

        {viewMode === "calendar" ? (
          <div className={styles.calendarGrid}>
            {weekdayLabels.map((day) => (
              <span key={day} className={styles.weekday}>
                {day}
              </span>
            ))}

            {weeks.flat().map((day) => {
              const entry = entriesByDate.get(day.date);
              const mood = entry?.mood ? moodStampMap[entry.mood] : null;

              return (
                <button
                  key={day.date}
                  className={styles.dayCell}
                  data-outside={!day.inMonth}
                  data-today={day.isToday}
                  data-filled={Boolean(entry)}
                  onClick={() => openEntry(day.date)}
                >
                  <div className={styles.dayTop}>
                    <span className={styles.dayNumber}>{day.dayOfMonth}</span>
                    {mood ? (
                      <span className={styles.dayMood}>
                        <ScrapIcon kind={mood.icon} size={14} />
                      </span>
                    ) : null}
                  </div>

                  {entry ? (
                    <>
                      <strong>{entry.title}</strong>
                      <small>
                        {entry.photoCount} photos · {entry.plannerCount} plans
                      </small>
                    </>
                  ) : (
                    <small>New page</small>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className={styles.listView}>
            {entries.map((entry, index) => (
              <button
                key={entry.entryDate}
                className={styles.entryRow}
                style={{ "--row-rotation": `${index % 2 === 0 ? -0.6 : 0.6}deg` } as CSSProperties}
                onClick={() => openEntry(entry.entryDate)}
              >
                <div>
                  <strong>{format(parseISO(entry.entryDate), "EEEE, MMM d")}</strong>
                  <p>{entry.title}</p>
                </div>
                <div className={styles.rowMeta}>
                  <span>{entry.plannerCount} plans</span>
                  <span>{entry.photoCount} photos</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
