"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { addMonths, format, parseISO, subMonths } from "date-fns";
import { CalendarRange, ChevronLeft, ChevronRight, List, Plus } from "lucide-react";
import { buildCalendarMatrix, todayKey } from "@/lib/date";
import { loadEntryOverviews } from "@/lib/local/sync";
import { useAuthStore } from "@/store/auth-store";
import styles from "@/styles/archive.module.css";

export function ArchiveHome() {
  const router = useRouter();
  const viewer = useAuthStore((state) => state.viewer);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [anchorDate, setAnchorDate] = useState(todayKey());
  const entryDate = todayKey();
  const query = useQuery({
    queryKey: ["entries", viewer?.id, "overview"],
    queryFn: () => loadEntryOverviews(viewer!),
    enabled: Boolean(viewer)
  });

  const entriesByDate = useMemo(
    () => new Map((query.data ?? []).map((entry) => [entry.entryDate, entry])),
    [query.data]
  );
  const weeks = buildCalendarMatrix(anchorDate);
  const recentEntries = (query.data ?? []).slice(0, 6);
  const todayOverview = entriesByDate.get(entryDate);

  const openEntry = (date: string) => {
    startTransition(() => {
      router.push(`/entry/${date}`);
    });
  };

  return (
    <div className={styles.page}>
      <section className={styles.heroRow}>
        <article className={styles.todayCard}>
          <span className={styles.sectionTag}>today quick entry</span>
          <h3>{todayOverview?.title || "Start today&apos;s page"}</h3>
          <p>
            {todayOverview?.previewText ||
              "Open a ready-made page with mood, checklist, diary text, photos, and handwriting space."}
          </p>
          <button className={styles.primaryAction} onClick={() => openEntry(entryDate)}>
            <Plus size={16} />
            {todayOverview ? "Continue today" : "Create today"}
          </button>
        </article>

        <article className={styles.recentCard}>
          <div className={styles.cardHeader}>
            <span className={styles.sectionTag}>recent entries</span>
            <button type="button" className={styles.plainButton} onClick={() => setViewMode("list")}>
              See list
            </button>
          </div>
          <div className={styles.recentStrip}>
            {recentEntries.map((entry) => (
              <button
                key={entry.entryDate}
                className={styles.recentChip}
                onClick={() => openEntry(entry.entryDate)}
              >
                <strong>{format(parseISO(entry.entryDate), "MMM d")}</strong>
                <span>{entry.title}</span>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className={styles.archiveCard}>
        <div className={styles.cardHeader}>
          <div>
            <span className={styles.sectionTag}>home archive</span>
            <h3>{format(parseISO(anchorDate), "MMMM yyyy")}</h3>
          </div>
          <div className={styles.controls}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setAnchorDate(format(subMonths(parseISO(anchorDate), 1), "yyyy-MM-dd"))}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setAnchorDate(format(addMonths(parseISO(anchorDate), 1), "yyyy-MM-dd"))}
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
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span key={day} className={styles.weekday}>
                {day}
              </span>
            ))}
            {weeks.flat().map((day) => {
              const entry = entriesByDate.get(day.date);
              return (
                <button
                  key={day.date}
                  className={styles.dayCell}
                  data-outside={!day.inMonth}
                  data-today={day.isToday}
                  data-filled={Boolean(entry)}
                  onClick={() => openEntry(day.date)}
                >
                  <span>{day.dayOfMonth}</span>
                  {entry ? <small>{entry.title}</small> : <small>Blank page</small>}
                </button>
              );
            })}
          </div>
        ) : (
          <div className={styles.listView}>
            {(query.data ?? []).map((entry) => (
              <button
                key={entry.entryDate}
                className={styles.entryRow}
                onClick={() => openEntry(entry.entryDate)}
              >
                <div>
                  <strong>{format(parseISO(entry.entryDate), "EEEE, MMM d")}</strong>
                  <p>{entry.title}</p>
                </div>
                <div className={styles.rowMeta}>
                  <span>{entry.todoCount} todos</span>
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
