import { NextResponse } from "next/server";

type GameInfo = {
  date: string;
  time: string;
  venue: string;
  opponent: string;
  status: string;
};

const baseUrl = "https://www.samsunglions.com/m/score/score_2_calendar.asp?srchgame=";

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeDateParam(dateParam: string | null) {
  const fallback = new Date();
  if (!dateParam) return fallback;
  const parsed = new Date(`${dateParam}T00:00:00+09:00`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function shiftMonth(date: Date, offset: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + offset);
  return next;
}

function buildUrl(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${baseUrl}&strMonth=${month}&strYear=${year}`;
}

function stripTagText(line: string) {
  return decodeHtml(line.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function parseGames(html: string, year: number) {
  const items = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
  const games: GameInfo[] = [];

  for (const item of items) {
    const text = stripTagText(item[1] ?? "");
    if (!text.includes("삼성 라이온즈") || !text.includes("VS")) continue;

    const match = text.match(
      /(\d{2})월(\d{2})일\s+(\d{2}:\d{2})\s+\([^)]+\)\s+(.+?)\s+삼성 라이온즈\s+VS\s+(.+?)\s+(.+)/
    );
    if (!match) continue;

    const [, month, day, time, venue, opponent, status] = match;
    games.push({
      date: `${year}-${month}-${day}`,
      time,
      venue: venue.trim(),
      opponent: opponent.trim(),
      status: status.trim()
    });
  }

  return games;
}

function pickClosestGame(games: GameInfo[], targetDate: string) {
  const exact = games.find((game) => game.date === targetDate);
  if (exact) return exact;

  const future = games
    .filter((game) => game.date > targetDate)
    .sort((left, right) => left.date.localeCompare(right.date))[0];
  if (future) return future;

  return games
    .filter((game) => game.date < targetDate)
    .sort((left, right) => right.date.localeCompare(left.date))[0];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const baseDate = normalizeDateParam(searchParams.get("date"));
  const targetDate = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, "0")}-${String(
    baseDate.getDate()
  ).padStart(2, "0")}`;

  try {
    const months = [shiftMonth(baseDate, -1), baseDate, shiftMonth(baseDate, 1)];
    const responses = await Promise.all(
      months.map(async (monthDate) => {
        const url = buildUrl(monthDate);
        const response = await fetch(url, {
          headers: {
            "user-agent": "Mozilla/5.0 nayoungnotes/1.0"
          },
          next: { revalidate: 60 * 60 * 3 }
        });
        if (!response.ok) throw new Error(`Failed to fetch ${url}`);
        return {
          url,
          year: monthDate.getFullYear(),
          html: await response.text()
        };
      })
    );

    const games = responses.flatMap((entry) => parseGames(entry.html, entry.year));
    const uniqueGames = Array.from(
      new Map(games.map((game) => [`${game.date}-${game.time}-${game.venue}-${game.opponent}`, game])).values()
    ).sort((left, right) => `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`));

    return NextResponse.json({
      team: "Samsung Lions",
      targetDate,
      sourceUrl: responses[1]?.url ?? buildUrl(baseDate),
      game: pickClosestGame(uniqueGames, targetDate) ?? null
    });
  } catch {
    return NextResponse.json(
      {
        team: "Samsung Lions",
        targetDate,
        game: null
      },
      { status: 200 }
    );
  }
}
