"use client";

import type {
  TouchEvent as ReactTouchEvent,
  WheelEvent as ReactWheelEvent
} from "react";
import { startTransition, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { addMonths, format, parseISO, subMonths } from "date-fns";
import { ChevronDown, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { ScrapIcon } from "@/components/ui/scrap-icon";
import { buildCalendarMatrix, todayKey } from "@/lib/date";
import { loadEntryOverviews } from "@/lib/local/sync";
import { useAuthStore } from "@/store/auth-store";
import type { EntryOverview } from "@/types/diary";
import styles from "@/styles/archive.module.css";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EMPTY_ENTRIES: EntryOverview[] = [];
const binderRings = [0, 1, 2, 3, 4, 5];

export function ArchiveHome() {
  const router = useRouter();
  const viewer = useAuthStore((state) => state.viewer);
  const [anchorDate, setAnchorDate] = useState(todayKey());
  const [coverOpened, setCoverOpened] = useState(false);
  const touchStartY = useRef<number | null>(null);
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
  const monthEntries = useMemo(
    () => entries.filter((entry) => entry.entryDate.startsWith(anchorDate.slice(0, 7))),
    [anchorDate, entries]
  );
  const monthPhotoCount = monthEntries.reduce((sum, entry) => sum + entry.photoCount, 0);

  const openEntry = (date: string) => {
    startTransition(() => {
      router.push(`/entry/${date}`);
    });
  };

  const openCover = () => {
    if (coverOpened) return;
    setCoverOpened(true);
  };

  const handleCoverWheel = (event: ReactWheelEvent<HTMLElement>) => {
    if (coverOpened || event.deltaY <= 6) return;
    openCover();
  };

  const handleTouchStart = (event: ReactTouchEvent<HTMLElement>) => {
    touchStartY.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (event: ReactTouchEvent<HTMLElement>) => {
    if (coverOpened || touchStartY.current === null) return;
    const endY = event.changedTouches[0]?.clientY ?? touchStartY.current;
    if (touchStartY.current - endY > 24) openCover();
    touchStartY.current = null;
  };

  return (
    <div className={styles.page}>
      <section
        className={styles.coverStage}
        data-open={coverOpened}
        onWheel={handleCoverWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className={styles.bookScene}>
          <div className={styles.calendarSpread} data-open={coverOpened}>
            <div className={styles.spreadNotebook}>
              <div className={`${styles.spreadPage} ${styles.spreadPageLeft}`} />
              <div className={`${styles.spreadPage} ${styles.spreadPageRight}`} />

              <div className={styles.spreadContent}>
                <div className={styles.spreadHeader}>
                  <div className={styles.spreadHeaderTop}>
                    <strong>{format(parseISO(anchorDate), "MMMM yyyy")}</strong>
                    <div className={styles.spreadNav}>
                      <button
                        type="button"
                        className={styles.spreadIconButton}
                        onClick={() => setAnchorDate(format(subMonths(parseISO(anchorDate), 1), "yyyy-MM-dd"))}
                        aria-label="Previous month"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        type="button"
                        className={styles.spreadIconButton}
                        onClick={() => setAnchorDate(format(addMonths(parseISO(anchorDate), 1), "yyyy-MM-dd"))}
                        aria-label="Next month"
                      >
                        <ChevronRight size={14} />
                      </button>
                      <button
                        type="button"
                        className={styles.spreadTodayButton}
                        onClick={() => openEntry(todayDate)}
                      >
                        <Plus size={13} />
                        Today
                      </button>
                    </div>
                  </div>
                  <small className={styles.spreadMeta}>
                    {monthEntries.length} pages and {monthPhotoCount} photos this month. Tap any date to open the page.
                  </small>
                </div>

                <div className={styles.spreadCalendar}>
                  {weekdayLabels.map((day) => (
                    <span key={day} className={styles.spreadWeekday}>
                      {day}
                    </span>
                  ))}

                  {weeks.flat().map((day) => {
                    const entry = entriesByDate.get(day.date);
                    return (
                      <button
                        key={day.date}
                        type="button"
                        className={styles.spreadDay}
                        data-outside={!day.inMonth}
                        data-filled={Boolean(entry)}
                        data-today={day.isToday}
                        onClick={() => openEntry(day.date)}
                      >
                        <span className={styles.spreadDayNumber}>{day.dayOfMonth}</span>
                        {entry ? (
                          <>
                            <strong className={styles.spreadDayTitle}>{entry.title}</strong>
                            <small className={styles.spreadDayMeta}>
                              {entry.photoCount > 0
                                ? `${entry.photoCount} photos`
                                : entry.plannerCount > 0
                                  ? `${entry.plannerCount} plans`
                                  : "Open page"}
                            </small>
                          </>
                        ) : day.isToday ? (
                          <small className={styles.spreadDayHint}>Start here</small>
                        ) : (
                          <span className={styles.spreadDayLine} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={styles.spreadRings} aria-hidden="true">
                {binderRings.map((ring) => (
                  <span key={ring} className={styles.spreadRing} />
                ))}
              </div>
            </div>
          </div>

          <div className={styles.coverBook} data-open={coverOpened}>
            <div className={styles.coverSpine}>
              <div className={styles.coverCharm}>
                <span className={styles.coverChain} />
                <span className={styles.coverPendant}>
                  <ScrapIcon kind="swirl" size={24} />
                </span>
              </div>
            </div>

            <div className={styles.coverPaper}>
              <div className={styles.coverTabs}>
                <span />
                <span />
                <span />
                <span />
              </div>

              <div className={styles.coverHeader}>
                <span className={styles.coverSeal}>
                  <ScrapIcon kind="flower" size={20} />
                </span>
                <div className={styles.coverTitleBlock}>
                  <small>quiet scrapbook planner</small>
                  <h2>nayoungnotes</h2>
                </div>
              </div>

              <div className={styles.coverLabelFrame}>
                <span className={styles.coverLabelSeal}>
                  <ScrapIcon kind="swirl" size={18} />
                </span>
              </div>

              <div className={styles.coverWritingLines}>
                <div>
                  <small>Name</small>
                  <span />
                </div>
                <div>
                  <small>Date</small>
                  <span />
                </div>
              </div>

              <div className={styles.coverMiniCard}>
                <span className={styles.coverMiniMark}>
                  <ScrapIcon kind="heart" size={16} />
                </span>
                <div className={styles.coverMiniList}>
                  <span>calendar</span>
                  <span>diary</span>
                  <span>photos</span>
                  <span>notes</span>
                </div>
              </div>

              <div className={styles.coverFooterTag}>
                <span>
                  <ScrapIcon kind="spark" size={14} />
                </span>
                <small>daily private planner</small>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.coverPrompt} data-open={coverOpened}>
          <button type="button" className={styles.openButton} onClick={openCover}>
            Open diary
          </button>
          <span className={styles.scrollHint}>
            <ChevronDown size={14} />
            Or scroll to open
          </span>
        </div>
      </section>
    </div>
  );
}
