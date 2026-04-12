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
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
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

async function readPageText(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 nayoungnotes/1.0"
    },
    next: { revalidate: 60 * 60 * 3 }
  });

  if (!response.ok) throw new Error(`Failed to fetch ${url}`);

  const buffer = await response.arrayBuffer();
  const decoder = new TextDecoder("euc-kr", { fatal: false });
  const decoded = decoder.decode(buffer);
  return decoded;
}

function toCandidateLines(html: string) {
  return decodeHtml(
    html
      .replace(/<\/li>/gi, "\n")
      .replace(/<\/tr>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function parseScheduledGame(rest: string, venue: string, date: string, time: string) {
  const scheduledMatch = rest.match(/삼성\s*라이온즈\s*(?:VS|vs|대)\s*(.+?)\s*(예정|경기전|취소|우천취소)?$/);
  if (scheduledMatch) {
    return {
      date,
      time,
      venue,
      opponent: scheduledMatch[1].trim(),
      status: scheduledMatch[2]?.trim() || "Scheduled"
    } satisfies GameInfo;
  }

  const homeAwayMatch = rest.match(/^삼성\s*라이온즈\s+(\d+:\d+)\s+(.+?)\s+(승|패|무)$/);
  if (homeAwayMatch) {
    return {
      date,
      time,
      venue,
      opponent: homeAwayMatch[2].trim(),
      status: `${homeAwayMatch[1]} ${homeAwayMatch[3]}`
    } satisfies GameInfo;
  }

  const reverseMatch = rest.match(/^(.+?)\s+(\d+:\d+)\s+삼성\s*라이온즈\s+(승|패|무)$/);
  if (reverseMatch) {
    return {
      date,
      time,
      venue,
      opponent: reverseMatch[1].trim(),
      status: `${reverseMatch[2]} ${reverseMatch[3]}`
    } satisfies GameInfo;
  }

  return null;
}

function parseGames(html: string, year: number) {
  const lines = toCandidateLines(html);
  const games: GameInfo[] = [];

  for (const line of lines) {
    if (!line.includes("삼성")) continue;

    const headMatch = line.match(/^(\d{2})월\s*(\d{2})일\s+(\d{2}:\d{2})\s+\([^)]+\)\s+(.+)$/);
    if (!headMatch) continue;

    const [, month, day, time, remainder] = headMatch;
    const date = `${year}-${month}-${day}`;
    const cleanedRemainder = remainder.replace(/Image:/gi, " ").replace(/\s+/g, " ").trim();

    const venueMatch = cleanedRemainder.match(/^(.+?)\s+(삼성\s*라이온즈.+)$/);
    if (!venueMatch) continue;

    const venue = venueMatch[1].trim();
    const rest = venueMatch[2].trim();
    const parsed = parseScheduledGame(rest, venue, date, time);
    if (parsed) games.push(parsed);
  }

  return games;
}

function pickClosestGame(games: GameInfo[], targetDate: string) {
  const exact = games.find((game) => game.date === targetDate);
  if (exact) return exact;

  const future = games
    .filter((game) => game.date > targetDate)
    .sort((left, right) => `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`))[0];
  if (future) return future;

  return games
    .filter((game) => game.date < targetDate)
    .sort((left, right) => `${right.date} ${right.time}`.localeCompare(`${left.date} ${left.time}`))[0];
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
        return {
          url,
          year: monthDate.getFullYear(),
          html: await readPageText(url)
        };
      })
    );

    const games = responses.flatMap((entry) => parseGames(entry.html, entry.year));
    const uniqueGames = Array.from(
      new Map(games.map((game) => [`${game.date}-${game.time}-${game.venue}-${game.opponent}`, game])).values()
    );

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
