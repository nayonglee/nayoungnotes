import { createId } from "@/lib/utils";
import type {
  DayType,
  DiaryEntryRecord,
  DrawingBackground,
  DrawingItem,
  DrawingSheet,
  EntryOverview,
  PlannerBlock,
  PersistedEntryItemRow,
  PhotoItem,
  PresetRotation,
  StickerItem,
  TeachingPayload,
  TeachingSubject,
  ThemeConfig,
  TodoCard,
  Viewer
} from "@/types/diary";

const defaultTheme: ThemeConfig = {
  preset: "petal",
  texture: "paper",
  boardTone: "cream"
};

function baseStyle(rotation: PresetRotation = 0) {
  return { x: 0, y: 0, zIndex: 1, presetRotation: rotation };
}

function normalizePlannerTimeValue(value: unknown) {
  if (typeof value !== "string") return "12:00";
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "12:00";
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return "12:00";
  return `${String(Math.max(0, Math.min(hours, 23))).padStart(2, "0")}:${String(
    Math.max(0, Math.min(minutes, 59))
  ).padStart(2, "0")}`;
}

function dayOfWeekKey(entryDate: string) {
  const date = new Date(`${entryDate}T00:00:00+09:00`);
  return date.getDay();
}

function baseSubjects(): TeachingSubject[] {
  return [
    { id: "g1-korean", label: "G1 Korean", checked: false, note: "" },
    { id: "g2-csat-korean", label: "G2 CSAT Korean", checked: false, note: "" },
    { id: "g3-csat-korean", label: "G3 CSAT Korean", checked: false, note: "" },
    { id: "g2-physics", label: "G2 Physics", checked: false, note: "" },
    { id: "ap-physics", label: "AP Physics", checked: false, note: "" },
    { id: "g2-earth", label: "G2 Earth Sci", checked: false, note: "" },
    { id: "g3-earth", label: "G3 Earth Sci", checked: false, note: "" }
  ];
}

function applySubjectNotes(subjects: TeachingSubject[], config: Partial<Record<string, { checked?: boolean; note?: string }>>) {
  return subjects.map((subject) => {
    const next = config[subject.id];
    return next
      ? {
          ...subject,
          checked: next.checked ?? subject.checked,
          note: next.note ?? subject.note
        }
      : subject;
  });
}

export function createTeachingPayload(entryDate: string): TeachingPayload {
  const day = dayOfWeekKey(entryDate);
  const subjects = baseSubjects();

  if (day === 0) {
    return {
      dayType: "teaching",
      medSchoolFocus: "Quick med review only. Keep energy for long teaching blocks.",
      academyWork: "Run Korean-heavy teaching day, collect homework reactions, and leave short feedback.",
      pokePrompt:
        "Draft a Sunday teaching recap for Nayoung: summarize Korean classes, list weak points, and propose homework by level.",
      subjects: applySubjectNotes(subjects, {
        "g1-korean": { checked: true, note: "School exam style passages" },
        "g2-csat-korean": { checked: true, note: "Reading speed + inference set" },
        "g3-csat-korean": { checked: true, note: "Hard passage + review" }
      })
    };
  }

  if (day === 1) {
    return {
      dayType: "teaching",
      medSchoolFocus: "Protect a short morning med block, then switch fully to teaching mode.",
      academyWork: "Science-heavy lesson day. Finish board notes and send follow-up homework before bed.",
      pokePrompt:
        "Prepare a Monday science teaching recap: physics and earth science class flow, common mistakes, and next homework.",
      subjects: applySubjectNotes(subjects, {
        "g2-physics": { checked: true, note: "Core formula + short drill" },
        "ap-physics": { checked: true, note: "FRQ logic + English wording" },
        "g2-earth": { checked: true, note: "Concept map + quick quiz" },
        "g3-earth": { checked: true, note: "Mock-style problem review" }
      })
    };
  }

  if (day >= 2 && day <= 4) {
    const focusByDay: Record<number, Partial<Record<string, { checked?: boolean; note?: string }>>> = {
      2: {
        "g1-korean": { checked: true, note: "Edit worksheets" },
        "g2-csat-korean": { checked: true, note: "Trim lesson flow" }
      },
      3: {
        "g2-physics": { checked: true, note: "Tighten examples" },
        "ap-physics": { checked: true, note: "Check derivation wording" }
      },
      4: {
        "g2-earth": { checked: true, note: "Review diagrams" },
        "g3-earth": { checked: true, note: "Select mock questions" }
      }
    };

    return {
      dayType: "school",
      medSchoolFocus: "Main identity is school day. Keep one serious med study block and one short review block.",
      academyWork: "Do only minimum academy maintenance: feedback, small edits, and tomorrow prep.",
      pokePrompt:
        "Turn today's school + tutoring notes into a tight evening checklist with one med block and one academy block.",
      subjects: applySubjectNotes(subjects, focusByDay[day] ?? {})
    };
  }

  if (day === 5) {
    return {
      dayType: "prep",
      medSchoolFocus: "Catch up on med work before deep lesson prep.",
      academyWork: "Build next week's Korean packets, physics/AP packet, and admin list.",
      pokePrompt:
        "Make a Friday prep checklist for Nayoung: med catch-up, Korean packet build, physics/AP packet build, and admin.",
      subjects: applySubjectNotes(subjects, {
        "g1-korean": { checked: true, note: "Print or revise school-exam sheets" },
        "g2-csat-korean": { checked: true, note: "Reading packet" },
        "g3-csat-korean": { checked: true, note: "High-level passage set" },
        "g2-physics": { checked: true, note: "Short concept drill" },
        "ap-physics": { checked: true, note: "FRQ and rubric" }
      })
    };
  }

  return {
    dayType: "prep",
    medSchoolFocus: "Long med study block if possible, then finish lesson production.",
    academyWork: "Science packet build, print check, and next-week reset.",
    pokePrompt:
      "Create a Saturday prep plan: science packet build, lesson polish, print checklist, and short reset routine.",
    subjects: applySubjectNotes(subjects, {
      "g2-earth": { checked: true, note: "Concept summary sheet" },
      "g3-earth": { checked: true, note: "Mock-style set" },
      "g2-physics": { checked: true, note: "Board examples" },
      "ap-physics": { checked: true, note: "Extension problem" }
    })
  };
}

export function createPlannerTemplate(entryDate: string): PlannerBlock[] {
  const day = dayOfWeekKey(entryDate);

  if (day === 0) {
    return [
      createPlannerBlock("08:30"),
      createPlannerBlock("10:00"),
      createPlannerBlock("12:00"),
      createPlannerBlock("15:00"),
      createPlannerBlock("18:00"),
      createPlannerBlock("21:00")
    ].map((block, index) => ({
      ...block,
      title: ["Warm-up prep", "G1 + G2 Korean", "Lunch + reset", "G3 Korean", "Homework check", "Recap"][index],
      note: ["Open materials", "Main teaching block", "", "Past papers / reading", "Collect reactions", "Short wrap-up"][index]
    }));
  }

  if (day === 1) {
    return [
      createPlannerBlock("08:30"),
      createPlannerBlock("11:00"),
      createPlannerBlock("13:30"),
      createPlannerBlock("16:00"),
      createPlannerBlock("18:30"),
      createPlannerBlock("21:00")
    ].map((block, index) => ({
      ...block,
      title: ["Prep + med review", "G2 Physics", "AP Physics", "G2 / G3 Earth", "Feedback", "Wrap-up"][index],
      note: ["Short med block first", "Core concepts", "FRQ / derivation", "Science lesson run", "Send homework", "Only recap, no new prep"][index]
    }));
  }

  if (day >= 2 && day <= 4) {
    return [
      createPlannerBlock("08:00"),
      createPlannerBlock("18:30"),
      createPlannerBlock("20:00"),
      createPlannerBlock("21:30")
    ].map((block, index) => ({
      ...block,
      title: ["Campus / school", "Med review", "Academy maintenance", "Poke prompt + tomorrow edit"][index],
      note: ["Main daytime role", "One serious study block", "Feedback + files", "Keep it short"][index]
    }));
  }

  if (day === 5) {
    return [
      createPlannerBlock("09:30"),
      createPlannerBlock("12:00"),
      createPlannerBlock("15:00"),
      createPlannerBlock("18:30"),
      createPlannerBlock("21:00")
    ].map((block, index) => ({
      ...block,
      title: ["Med catch-up", "Korean packet build", "Physics + AP prep", "Academy ops", "Light reset"][index],
      note: ["Protect first block", "G1/G2/G3 split", "Shared concept core", "Roster / homework / messaging", "Do not overwork"][index]
    }));
  }

  return [
    createPlannerBlock("10:00"),
    createPlannerBlock("13:00"),
    createPlannerBlock("16:00"),
    createPlannerBlock("19:30")
  ].map((block, index) => ({
    ...block,
    title: ["Earth science packet", "Mock lesson polish", "Med review", "Weekly reset"][index],
    note: ["G2/G3 materials", "Print check + edits", "Catch-up only", "Plan next week lightly"][index]
  }));
}

export function createTodoTemplate(entryDate: string): TodoCard[] {
  const day = dayOfWeekKey(entryDate);
  if (day === 0 || day === 1) {
    return ["Check attendance", "Leave student feedback", "Upload homework", "Log tomorrow edits"].map((text) =>
      createTodoCard(text)
    );
  }

  if (day >= 2 && day <= 4) {
    return ["Finish school task", "One med block", "Reply to academy messages", "Edit next lesson only"].map((text) =>
      createTodoCard(text)
    );
  }

  return ["Finish med block", "Build next lesson pack", "Check AP Physics sheet", "Prepare weekend reset"].map((text) =>
    createTodoCard(text)
  );
}

export function normalizePlannerBlocks(blocks: unknown): PlannerBlock[] {
  if (!Array.isArray(blocks)) return [];

  return blocks.map((block) => {
    const source = block && typeof block === "object" ? (block as Record<string, unknown>) : {};
    return {
      id: typeof source.id === "string" ? source.id : createId("plan_block"),
      time: normalizePlannerTimeValue(source.time ?? source.start),
      title: typeof source.title === "string" ? source.title : "",
      note: typeof source.note === "string" ? source.note : ""
    };
  });
}

export function createDrawingSheet(
  index = 0,
  background: DrawingBackground = "dot",
  title?: string
): DrawingSheet {
  return {
    id: createId("sheet"),
    title: title ?? `Sheet ${index + 1}`,
    background,
    strokes: []
  };
}

export function createBlankEntry(entryDate: string, viewer?: Viewer | null): DiaryEntryRecord {
  const now = new Date().toISOString();
  const firstSheet = createDrawingSheet(0);
  const teaching = createTeachingPayload(entryDate);
  return {
    id: createId("entry"),
    userId: viewer?.id,
    entryDate,
    title: "",
    mood: undefined,
    themeConfig: defaultTheme,
    searchText: "",
    createdAt: now,
    updatedAt: now,
    text: {
      id: createId("text"),
      itemType: "text",
      orderIndex: 0,
      payload: { content: "" },
      styleConfig: baseStyle(),
      updatedAt: now
    },
    todo: {
      id: createId("todo"),
      itemType: "todo",
      orderIndex: 1,
      payload: { items: createTodoTemplate(entryDate) },
      styleConfig: baseStyle(),
      updatedAt: now
    },
    planner: {
      id: createId("planner"),
      itemType: "planner",
      orderIndex: 2,
      payload: { blocks: createPlannerTemplate(entryDate) },
      styleConfig: baseStyle(),
      updatedAt: now
    },
    baseball: {
      id: createId("baseball"),
      itemType: "baseball",
      orderIndex: 3,
      payload: {
        matchup: "",
        ballpark: "",
        player: "",
        note: "",
        moment: ""
      },
      styleConfig: baseStyle(),
      updatedAt: now
    },
    teaching: {
      id: createId("teaching"),
      itemType: "teaching",
      orderIndex: 4,
      payload: teaching,
      styleConfig: baseStyle(),
      updatedAt: now
    },
    photos: [],
    stickers: [],
    drawing: {
      id: createId("drawing"),
      itemType: "drawing",
      orderIndex: 99,
      payload: {
        activeSheetId: firstSheet.id,
        sheets: [firstSheet]
      },
      styleConfig: baseStyle(),
      updatedAt: now
    }
  };
}

export function createTodoCard(text = ""): TodoCard {
  return { id: createId("todo_item"), text, checked: false };
}

export function createPlannerBlock(time = "12:00"): PlannerBlock {
  return {
    id: createId("plan_block"),
    time: normalizePlannerTimeValue(time),
    title: "",
    note: ""
  };
}

export function normalizeEntryRecord(
  record: DiaryEntryRecord,
  viewer?: Viewer | null
): DiaryEntryRecord {
  const base = createBlankEntry(record.entryDate, viewer);
  const plannerBlocks = normalizePlannerBlocks(record.planner?.payload?.blocks);
  const drawingPayload =
    record.drawing?.payload && Array.isArray(record.drawing.payload.sheets)
      ? record.drawing.payload
      : base.drawing.payload;

  return {
    ...base,
    ...record,
    text: {
      ...base.text,
      ...record.text,
      payload: { content: record.text?.payload?.content ?? "" }
    },
    todo: {
      ...base.todo,
      ...record.todo,
      payload: { items: record.todo?.payload?.items ?? [] }
    },
    planner: {
      ...base.planner,
      ...record.planner,
      payload: {
        blocks: plannerBlocks.length > 0 ? plannerBlocks : record.planner?.payload?.blocks === undefined ? base.planner.payload.blocks : []
      }
    },
    baseball: {
      ...base.baseball,
      ...record.baseball,
      payload: {
        matchup: record.baseball?.payload?.matchup ?? "",
        ballpark: record.baseball?.payload?.ballpark ?? "",
        player: record.baseball?.payload?.player ?? "",
        note: record.baseball?.payload?.note ?? "",
        moment: record.baseball?.payload?.moment ?? ""
      }
    },
    teaching: {
      ...base.teaching,
      ...record.teaching,
      payload: {
        dayType: (record.teaching?.payload?.dayType as DayType | undefined) ?? base.teaching.payload.dayType,
        medSchoolFocus: record.teaching?.payload?.medSchoolFocus ?? base.teaching.payload.medSchoolFocus,
        academyWork: record.teaching?.payload?.academyWork ?? base.teaching.payload.academyWork,
        pokePrompt: record.teaching?.payload?.pokePrompt ?? base.teaching.payload.pokePrompt,
        subjects: Array.isArray(record.teaching?.payload?.subjects)
          ? (record.teaching?.payload?.subjects as TeachingSubject[]).map((subject, index) => ({
              id: subject.id || `subject_${index + 1}`,
              label: subject.label || `Subject ${index + 1}`,
              checked: Boolean(subject.checked),
              note: subject.note || ""
            }))
          : base.teaching.payload.subjects
      }
    },
    photos: record.photos ?? [],
    stickers: record.stickers ?? [],
    drawing: {
      ...base.drawing,
      ...record.drawing,
      payload: drawingPayload
    }
  };
}

export function buildSearchText(record: DiaryEntryRecord) {
  const normalized = normalizeEntryRecord(record);
  return [
    normalized.title,
    normalized.mood ?? "",
    normalized.text.payload.content,
    ...normalized.todo.payload.items.map((item) => item.text),
    ...normalized.planner.payload.blocks.flatMap((item) => [item.time, item.title, item.note]),
    normalized.baseball.payload.matchup,
    normalized.baseball.payload.ballpark,
    normalized.baseball.payload.player,
    normalized.baseball.payload.note,
    normalized.baseball.payload.moment,
    normalized.teaching.payload.dayType,
    normalized.teaching.payload.medSchoolFocus,
    normalized.teaching.payload.academyWork,
    normalized.teaching.payload.pokePrompt,
    ...normalized.teaching.payload.subjects.flatMap((subject) => [subject.label, subject.note]),
    ...normalized.photos.map((item) => item.payload.caption),
    ...normalized.stickers.map((item) => item.payload.label)
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function withSearchText(record: DiaryEntryRecord): DiaryEntryRecord {
  return { ...record, searchText: buildSearchText(record) };
}

export function toEntryOverview(record: DiaryEntryRecord): EntryOverview {
  const normalized = normalizeEntryRecord(record);
  return {
    id: normalized.id,
    entryDate: normalized.entryDate,
    title: normalized.title || "Untitled page",
    mood: normalized.mood,
    updatedAt: normalized.updatedAt,
    previewText:
      normalized.text.payload.content.slice(0, 140) || normalized.planner.payload.blocks[0]?.title || "",
    photoCount: normalized.photos.length,
    todoCount: normalized.todo.payload.items.length,
    completedTodoCount: normalized.todo.payload.items.filter((item) => item.checked).length,
    plannerCount: normalized.planner.payload.blocks.filter(
      (item) => item.title.trim() || item.note.trim()
    ).length,
    coverPhotoUrl: normalized.photos[0]?.payload.url,
    coverPhotoLocalAssetId: normalized.photos[0]?.payload.localAssetId,
    themeConfig: normalized.themeConfig
  };
}

export function recordToPersistenceItems(record: DiaryEntryRecord): PersistedEntryItemRow[] {
  const photos = record.photos.map((photo, index) => ({
    id: photo.id,
    item_type: "photo" as const,
    order_index: 10 + index,
    payload: photo.payload as unknown as Record<string, unknown>,
    style_config: photo.styleConfig as unknown as Record<string, unknown>
  }));

  const stickers = record.stickers.map((sticker, index) => ({
    id: sticker.id,
    item_type: "sticker" as const,
    order_index: 40 + index,
    payload: sticker.payload as unknown as Record<string, unknown>,
    style_config: sticker.styleConfig as unknown as Record<string, unknown>
  }));

  return [
    {
      id: record.text.id,
      item_type: "text",
      order_index: 0,
      payload: record.text.payload as unknown as Record<string, unknown>,
      style_config: record.text.styleConfig as unknown as Record<string, unknown>
    },
    {
      id: record.todo.id,
      item_type: "todo",
      order_index: 1,
      payload: record.todo.payload as unknown as Record<string, unknown>,
      style_config: record.todo.styleConfig as unknown as Record<string, unknown>
    },
    {
      id: record.planner.id,
      item_type: "planner",
      order_index: 2,
      payload: record.planner.payload as unknown as Record<string, unknown>,
      style_config: record.planner.styleConfig as unknown as Record<string, unknown>
    },
    {
      id: record.baseball.id,
      item_type: "baseball",
      order_index: 3,
      payload: record.baseball.payload as unknown as Record<string, unknown>,
      style_config: record.baseball.styleConfig as unknown as Record<string, unknown>
    },
    {
      id: record.teaching.id,
      item_type: "teaching",
      order_index: 4,
      payload: record.teaching.payload as unknown as Record<string, unknown>,
      style_config: record.teaching.styleConfig as unknown as Record<string, unknown>
    },
    ...photos,
    ...stickers,
    {
      id: record.drawing.id,
      item_type: "drawing",
      order_index: 99,
      payload: record.drawing.payload as unknown as Record<string, unknown>,
      style_config: record.drawing.styleConfig as unknown as Record<string, unknown>
    }
  ];
}

export function cyclePresetRotation(rotation: PresetRotation): PresetRotation {
  if (rotation === -5) return 0;
  if (rotation === 0) return 5;
  return -5;
}

export function createPhotoDraftItem(params: {
  assetId: string;
  width: number;
  height: number;
  x: number;
  y: number;
  rotation?: PresetRotation;
}): PhotoItem {
  return {
    id: createId("photo"),
    itemType: "photo",
    orderIndex: 10,
    payload: {
      caption: "",
      width: params.width,
      height: params.height,
      localAssetId: params.assetId
    },
    styleConfig: {
      x: params.x,
      y: params.y,
      zIndex: 2,
      presetRotation: params.rotation ?? 0
    }
  };
}

export function createStickerDraftItem(params: {
  stickerId: string;
  label: string;
  tint: string;
  x: number;
  y: number;
  rotation?: PresetRotation;
}): StickerItem {
  return {
    id: createId("sticker"),
    itemType: "sticker",
    orderIndex: 40,
    payload: {
      stickerId: params.stickerId,
      label: params.label,
      tint: params.tint
    },
    styleConfig: {
      x: params.x,
      y: params.y,
      zIndex: 4,
      presetRotation: params.rotation ?? 0
    }
  };
}

export function updateDrawing(record: DiaryEntryRecord, drawing: DrawingItem): DiaryEntryRecord {
  return { ...record, drawing, updatedAt: new Date().toISOString() };
}
