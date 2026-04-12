import { formatEntryDate } from "@/lib/date";
import { createPlannerBlock, createTodoCard } from "@/lib/entry";
import type { DayType, PlannerBlock, TeachingPayload, TeachingSubject, TodoCard } from "@/types/diary";

type PlanningApplyResult = {
  teaching: TeachingPayload;
  planner?: PlannerBlock[];
  todo?: TodoCard[];
};

const dayTypeNotes: Record<DayType, string> = {
  school: "Campus-heavy day with only light academy maintenance at night.",
  teaching: "Teaching-heavy day with classes, follow-up, and short med protection only.",
  prep: "Prep-focused day for building packets, editing lessons, and catching up.",
  reset: "Lighter recovery day for reset, backlog cleanup, and planning."
};

const subjectAliases: Record<string, string[]> = {
  "g1-korean": ["g1 korean", "grade 1 korean", "high1 korean", "고1 국어", "고1내신국어"],
  "g2-csat-korean": ["g2 csat korean", "grade 2 csat korean", "고2 수능 국어", "고2국어", "고2 csat korean"],
  "g3-csat-korean": ["g3 csat korean", "grade 3 csat korean", "고3 수능 국어", "고3국어", "고3 csat korean"],
  "g2-physics": ["g2 physics", "grade 2 physics", "고2 물리", "고2물리"],
  "ap-physics": ["ap physics", "apphy", "ap physics tutoring", "ap 과외", "ap 물리"],
  "g2-earth": ["g2 earth sci", "g2 earth science", "grade 2 earth science", "고2 지구", "고2지구"],
  "g3-earth": ["g3 earth sci", "g3 earth science", "grade 3 earth science", "고3 지구", "고3지구"]
};

function cleanLine(line: string) {
  return line.replace(/^[\-\*\u2022]\s*/, "").trim();
}

function textAfterColon(line: string) {
  const index = line.indexOf(":");
  return index >= 0 ? line.slice(index + 1).trim() : "";
}

function normalizeTime(raw: string) {
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const ampm = match[3]?.toLowerCase();

  if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes > 59) return null;
  if (ampm === "pm" && hours < 12) hours += 12;
  if (ampm === "am" && hours === 12) hours = 0;

  if (hours > 23) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function parseDayType(value: string, fallback: DayType): DayType {
  const lower = value.toLowerCase();
  if (lower.includes("teach")) return "teaching";
  if (lower.includes("prep")) return "prep";
  if (lower.includes("reset")) return "reset";
  if (lower.includes("school")) return "school";
  return fallback;
}

function findSubject(line: string, subjects: TeachingSubject[]) {
  const lower = line.toLowerCase();
  return subjects.find((subject) => {
    const aliases = subjectAliases[subject.id] ?? [subject.label.toLowerCase()];
    return aliases.some((alias) => lower.includes(alias));
  });
}

function parseSubjectLine(line: string, subjects: TeachingSubject[]) {
  const target = findSubject(line, subjects);
  if (!target) return null;

  const cleaned = cleanLine(line);
  const unchecked = /\[\s*\]|skip|off|hold|later|not this week/i.test(cleaned);
  const checked = unchecked ? false : /\[x\]|checked|focus|main|yes/i.test(cleaned) || true;
  const fragments = cleaned.split("|").map((fragment) => fragment.trim());
  const note = fragments.slice(1).join(" | ") || cleaned.replace(target.label, "").replace(/\[\s*[x ]\s*\]/gi, "").trim();

  return {
    id: target.id,
    checked,
    note: note.replace(/^[\-\:\u2014\s]+/, "")
  };
}

function parsePlannerLine(line: string) {
  const cleaned = cleanLine(line);
  const match = cleaned.match(
    /^(\d{1,2}:\d{2}(?:\s*[AaPp][Mm])?)\s*(?:\||-|—|–|:)\s*([^|]+?)(?:\s*(?:\||-|—|–)\s*(.+))?$/
  );
  if (!match) return null;

  const time = normalizeTime(match[1]);
  if (!time) return null;

  return {
    ...createPlannerBlock(time),
    title: match[2].trim(),
    note: match[3]?.trim() ?? ""
  } satisfies PlannerBlock;
}

function parseTodoLine(line: string) {
  const cleaned = cleanLine(line);
  if (!cleaned) return null;
  return {
    ...createTodoCard(cleaned.replace(/^\[\s*[x ]\s*\]\s*/i, "")),
    checked: /\[\s*x\s*\]/i.test(cleaned)
  } satisfies TodoCard;
}

function subjectSummary(subjects: TeachingSubject[]) {
  return subjects.map((subject) => `- ${subject.label}`).join("\n");
}

export function buildPlanningPrompt(entryDate: string, payload: TeachingPayload) {
  const selectedSubjects = payload.subjects
    .filter((subject) => subject.checked || subject.note.trim())
    .map((subject) => `- ${subject.label}${subject.note.trim() ? ` | ${subject.note.trim()}` : ""}`)
    .join("\n");

  const customInstruction = payload.pokePrompt.trim()
    ? `Extra instruction from Nayoung:\n${payload.pokePrompt.trim()}\n\n`
    : "";

  return `Help plan one diary page for ${formatEntryDate(entryDate)}.

Profile:
- Nayoung is a med student.
- Sunday and Monday are often full teaching days.
- Tuesday, Wednesday, and Thursday are usually school-heavy days.
- The weekly schedule changes often, so do not force a rigid routine.
- She teaches: G1 Korean, G2 CSAT Korean, G3 CSAT Korean, G2 Physics, AP Physics, G2 Earth Sci, G3 Earth Sci.

Current day type guess:
- ${payload.dayType}
- ${dayTypeNotes[payload.dayType]}

Weekly changes:
${payload.weekContext.trim() || "- No extra weekly changes written yet."}

Subjects already marked:
${selectedSubjects || subjectSummary(payload.subjects)}

${customInstruction}Return plain text in exactly this format:
Day Type: school | teaching | prep | reset
Med Focus: one concise sentence
Academy Work: one concise sentence
Subjects:
- [x] G1 Korean | short note
- [ ] AP Physics | short note
Time Blocks:
- 08:00 | Main block | note
- 12:00 PM | Lunch | note
Todos:
- task one
- task two
AI Note: one short sentence

Keep it flexible, realistic, and tailored to the weekly changes above.`;
}

export function applyPlanningDraft(
  payload: TeachingPayload,
  draft: string
): PlanningApplyResult {
  const lines = draft.replace(/\r/g, "").split("\n");
  let section: "subjects" | "planner" | "todo" | null = null;
  let dayType = payload.dayType;
  let medSchoolFocus = payload.medSchoolFocus;
  let academyWork = payload.academyWork;
  let pokePrompt = payload.pokePrompt;
  let sawSubjectSection = false;
  const subjectMap = new Map(
    payload.subjects.map((subject) => [
      subject.id,
      {
        ...subject,
        checked: false,
        note: ""
      }
    ])
  );
  const nextPlanner: PlannerBlock[] = [];
  const nextTodo: TodoCard[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const lower = line.toLowerCase();

    if (lower.startsWith("day type")) {
      dayType = parseDayType(textAfterColon(line), dayType);
      section = null;
      continue;
    }

    if (lower.startsWith("med focus")) {
      medSchoolFocus = textAfterColon(line);
      section = null;
      continue;
    }

    if (lower.startsWith("academy work")) {
      academyWork = textAfterColon(line);
      section = null;
      continue;
    }

    if (lower.startsWith("ai note") || lower.startsWith("poke prompt") || lower.startsWith("prompt")) {
      pokePrompt = textAfterColon(line);
      section = null;
      continue;
    }

    if (/^subjects?\s*:?\s*$/i.test(line)) {
      section = "subjects";
      sawSubjectSection = true;
      continue;
    }

    if (/^(time blocks?|schedule|plans?)\s*:?\s*$/i.test(line)) {
      section = "planner";
      continue;
    }

    if (/^(todos?|checklist)\s*:?\s*$/i.test(line)) {
      section = "todo";
      continue;
    }

    if (section === "subjects") {
      const parsed = parseSubjectLine(line, payload.subjects);
      if (parsed) {
        subjectMap.set(parsed.id, {
          ...subjectMap.get(parsed.id)!,
          checked: parsed.checked,
          note: parsed.note
        });
      }
      continue;
    }

    if (section === "planner" || /^\s*[\-\*\u2022]?\s*\d{1,2}:\d{2}/.test(line)) {
      const parsed = parsePlannerLine(line);
      if (parsed) {
        nextPlanner.push(parsed);
      }
      continue;
    }

    if (section === "todo") {
      const parsed = parseTodoLine(line);
      if (parsed) nextTodo.push(parsed);
    }
  }

  const nextSubjects = sawSubjectSection
    ? payload.subjects.map((subject) => subjectMap.get(subject.id) ?? subject)
    : payload.subjects;

  return {
    teaching: {
      ...payload,
      dayType,
      medSchoolFocus,
      academyWork,
      pokePrompt,
      aiDraft: draft,
      subjects: nextSubjects
    },
    planner: nextPlanner.length > 0 ? nextPlanner : undefined,
    todo: nextTodo.length > 0 ? nextTodo : undefined
  };
}
