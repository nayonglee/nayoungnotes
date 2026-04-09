import {
  addDays,
  endOfMonth,
  format,
  getDate,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek
} from "date-fns";

export function todayKey() {
  return format(new Date(), "yyyy-MM-dd");
}

export function formatEntryDate(dateKey: string) {
  return format(parseISO(dateKey), "EEEE, MMMM d");
}

export function buildCalendarMatrix(dateKey: string) {
  const baseDate = parseISO(dateKey);
  const monthStart = startOfMonth(baseDate);
  const monthEnd = endOfMonth(baseDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const weeks: Date[][] = [];
  let cursor = gridStart;

  while (cursor <= monthEnd || weeks.length < 6) {
    const week = Array.from({ length: 7 }, (_, index) => addDays(cursor, index));
    weeks.push(week);
    cursor = addDays(cursor, 7);
    if (weeks.length === 6) break;
  }

  return weeks.map((week) =>
    week.map((day) => ({
      date: format(day, "yyyy-MM-dd"),
      dayOfMonth: getDate(day),
      inMonth: isSameMonth(day, baseDate),
      isToday: isToday(day)
    }))
  );
}

export function sameCalendarDay(a: string, b: string) {
  return isSameDay(parseISO(a), parseISO(b));
}
