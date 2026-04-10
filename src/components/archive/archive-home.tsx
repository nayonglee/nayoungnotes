"use client";

import type { CSSProperties } from "react";
import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { addMonths, format, parseISO, subMonths } from "date-fns";
import { ko } from "date-fns/locale";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Heart,
  List,
  Plus,
  Sticker
} from "lucide-react";
import { buildCalendarMatrix, todayKey } from "@/lib/date";
import { loadEntryOverviews } from "@/lib/local/sync";
import type { EntryOverview, MoodKey, ThemePreset } from "@/types/diary";
import { useAuthStore } from "@/store/auth-store";
import styles from "@/styles/archive.module.css";

const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];
const rotations = ["-3deg", "2deg", "-2deg", "3deg"];
const EMPTY_ENTRIES: EntryOverview[] = [];

const moodStampMap: Record<MoodKey, { glyph: string; label: string }> = {
  glowy: { glyph: "★", label: "반짝" },
  calm: { glyph: "☁", label: "차분" },
  proud: { glyph: "♡", label: "뿌듯" },
  busy: { glyph: "✎", label: "분주" },
  dreamy: { glyph: "✿", label: "몽글" },
  gentle: { glyph: "◎", label: "가벼움" }
};

function scrapbookTag(entry: EntryOverview) {
  return entry.mood ? moodStampMap[entry.mood] : { glyph: "☆", label: "기록" };
}

function themeLabel(theme: ThemePreset) {
  if (theme === "mint") return "mint";
  if (theme === "berry") return "berry";
  return "petal";
}

function ScrapCard({
  entry,
  rotation,
  onOpen
}: {
  entry: EntryOverview;
  rotation: string;
  onOpen: (date: string) => void;
}) {
  const stamp = scrapbookTag(entry);

  return (
    <button
      type="button"
      className={styles.scrapCard}
      data-theme={themeLabel(entry.themeConfig.preset)}
      style={{ "--rotation": rotation } as CSSProperties}
      onClick={() => onOpen(entry.entryDate)}
    >
      <div className={styles.scrapTape} />
      <div className={styles.scrapHeader}>
        <span className={styles.dateChip}>
          {format(parseISO(entry.entryDate), "M월 d일", { locale: ko })}
        </span>
        <span className={styles.moodStamp}>
          <span>{stamp.glyph}</span>
          {stamp.label}
        </span>
      </div>
      <strong>{entry.title}</strong>
      <p>{entry.previewText || "짧게 적은 메모가 여기에 보여요."}</p>
      <div className={styles.scrapFooter}>
        <span>사진 {entry.photoCount}</span>
        <span>할 일 {entry.todoCount}</span>
      </div>
    </button>
  );
}

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

  const entries = query.data ?? EMPTY_ENTRIES;
  const entriesByDate = useMemo(
    () => new Map(entries.map((entry) => [entry.entryDate, entry])),
    [entries]
  );
  const weeks = buildCalendarMatrix(anchorDate);
  const recentEntries = entries.slice(0, 4);
  const todayOverview = entriesByDate.get(entryDate);
  const monthEntries = useMemo(
    () => entries.filter((entry) => entry.entryDate.startsWith(anchorDate.slice(0, 7))),
    [anchorDate, entries]
  );

  const monthPhotoCount = monthEntries.reduce((sum, entry) => sum + entry.photoCount, 0);
  const monthTodoDone = monthEntries.reduce((sum, entry) => sum + entry.completedTodoCount, 0);
  const monthTodoTotal = monthEntries.reduce((sum, entry) => sum + entry.todoCount, 0);

  const openEntry = (date: string) => {
    startTransition(() => {
      router.push(`/entry/${date}`);
    });
  };

  return (
    <div className={styles.page}>
      <section className={styles.heroRow}>
        <article className={styles.todayCard}>
          <div className={styles.todayTop}>
            <span className={styles.sectionTag}>today</span>
            <span className={styles.todayBadge}>
              <Heart size={14} />
              quick start
            </span>
          </div>
          <h3>{todayOverview?.title || "오늘 페이지 만들기"}</h3>
          <p>
            {todayOverview?.previewText ||
              "오늘 날짜 페이지를 열고 제목, 체크리스트, 본문, 사진, 손글씨를 바로 적을 수 있습니다."}
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

        <article className={styles.previewBoard}>
          <div className={styles.previewHeader}>
            <div>
              <span className={styles.sectionTag}>scrap board</span>
              <h3>최근 페이지 미리보기</h3>
            </div>
            <span className={styles.boardBadge}>
              <Sticker size={14} />
              scrapbook
            </span>
          </div>

          <div className={styles.statsRow}>
            <span className={styles.statChip}>이번 달 페이지 {monthEntries.length}</span>
            <span className={styles.statChip}>사진 {monthPhotoCount}</span>
            <span className={styles.statChip}>
              체크 완료 {monthTodoDone}/{monthTodoTotal || 0}
            </span>
          </div>

          {recentEntries.length > 0 ? (
            <div className={styles.scrapGrid}>
              {recentEntries.map((entry, index) => (
                <ScrapCard
                  key={entry.entryDate}
                  entry={entry}
                  rotation={rotations[index % rotations.length]}
                  onOpen={openEntry}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyBoard}>
              <strong>첫 페이지를 만들어 보세요.</strong>
              <p>기록이 쌓이면 여기에서 종이 메모처럼 한눈에 보이게 정리됩니다.</p>
            </div>
          )}
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
              const stamp = entry ? scrapbookTag(entry) : null;
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
                    {stamp ? <span className={styles.dayMood}>{stamp.glyph}</span> : null}
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
            {entries.map((entry) => (
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
                  <span>{scrapbookTag(entry).label}</span>
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
