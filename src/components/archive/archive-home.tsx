"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { addMonths, format, parseISO, subMonths } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarRange, ChevronLeft, ChevronRight, List, Plus, Star } from "lucide-react";
import { buildCalendarMatrix, todayKey } from "@/lib/date";
import { loadEntryOverviews } from "@/lib/local/sync";
import { useAuthStore } from "@/store/auth-store";
import styles from "@/styles/archive.module.css";

const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

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
          <span className={styles.sectionTag}>today</span>
          <h3>{todayOverview?.title || "오늘 페이지 만들기"}</h3>
          <p>
            {todayOverview?.previewText ||
              "오늘 기록용 페이지를 열고 제목, 체크리스트, 본문, 사진, 손글씨를 바로 적을 수 있습니다."}
          </p>

          <div className={styles.quickMeta}>
            <span>체크 {todayOverview?.todoCount ?? 0}</span>
            <span>사진 {todayOverview?.photoCount ?? 0}</span>
            <span>손글씨 보드 포함</span>
          </div>

          <button className={styles.primaryAction} onClick={() => openEntry(entryDate)}>
            <Plus size={16} />
            {todayOverview ? "오늘 이어쓰기" : "오늘 시작하기"}
          </button>
        </article>

        <article className={styles.recentCard}>
          <div className={styles.cardHeader}>
            <div>
              <span className={styles.sectionTag}>recent</span>
              <h3>최근 페이지</h3>
            </div>
            <button type="button" className={styles.plainButton} onClick={() => setViewMode("list")}>
              리스트 보기
            </button>
          </div>

          <div className={styles.recentStrip}>
            {recentEntries.map((entry) => (
              <button
                key={entry.entryDate}
                className={styles.recentChip}
                onClick={() => openEntry(entry.entryDate)}
              >
                <strong>{format(parseISO(entry.entryDate), "M.d", { locale: ko })}</strong>
                <span>{entry.title}</span>
                <small>
                  사진 {entry.photoCount} · 할 일 {entry.todoCount}
                </small>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className={styles.archiveCard}>
        <div className={styles.cardHeader}>
          <div>
            <span className={styles.sectionTag}>archive</span>
            <h3>{format(parseISO(anchorDate), "yyyy년 M월", { locale: ko })}</h3>
          </div>
          <div className={styles.controls}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setAnchorDate(format(subMonths(parseISO(anchorDate), 1), "yyyy-MM-dd"))}
              aria-label="이전 달"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setAnchorDate(format(addMonths(parseISO(anchorDate), 1), "yyyy-MM-dd"))}
              aria-label="다음 달"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              className={viewMode === "calendar" ? styles.activeToggle : styles.toggle}
              onClick={() => setViewMode("calendar")}
            >
              <CalendarRange size={16} />
              달력
            </button>
            <button
              type="button"
              className={viewMode === "list" ? styles.activeToggle : styles.toggle}
              onClick={() => setViewMode("list")}
            >
              <List size={16} />
              리스트
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
                    <span>{day.dayOfMonth}</span>
                    {entry ? <Star size={12} /> : null}
                  </div>
                  {entry ? (
                    <>
                      <strong>{entry.title}</strong>
                      <small>
                        사진 {entry.photoCount} · 할 일 {entry.todoCount}
                      </small>
                    </>
                  ) : (
                    <small>새 페이지</small>
                  )}
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
                  <strong>{format(parseISO(entry.entryDate), "M월 d일 EEEE", { locale: ko })}</strong>
                  <p>{entry.title}</p>
                </div>
                <div className={styles.rowMeta}>
                  <span>체크 {entry.todoCount}</span>
                  <span>사진 {entry.photoCount}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
