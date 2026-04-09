import { createId } from "@/lib/utils";
import type {
  DiaryEntryRecord,
  DrawingItem,
  EntryOverview,
  PersistedEntryItemRow,
  PhotoItem,
  PresetRotation,
  StickerItem,
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

export function createBlankEntry(entryDate: string, viewer?: Viewer | null): DiaryEntryRecord {
  const now = new Date().toISOString();
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
      payload: { items: [] },
      styleConfig: baseStyle(),
      updatedAt: now
    },
    photos: [],
    stickers: [],
    drawing: {
      id: createId("drawing"),
      itemType: "drawing",
      orderIndex: 99,
      payload: { background: "dot", strokes: [] },
      styleConfig: baseStyle(),
      updatedAt: now
    }
  };
}

export function createTodoCard(text = ""): TodoCard {
  return { id: createId("todo_item"), text, checked: false };
}

export function buildSearchText(record: DiaryEntryRecord) {
  return [
    record.title,
    record.mood ?? "",
    record.text.payload.content,
    ...record.todo.payload.items.map((item) => item.text),
    ...record.photos.map((item) => item.payload.caption),
    ...record.stickers.map((item) => item.payload.label)
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function withSearchText(record: DiaryEntryRecord): DiaryEntryRecord {
  return { ...record, searchText: buildSearchText(record) };
}

export function toEntryOverview(record: DiaryEntryRecord): EntryOverview {
  return {
    id: record.id,
    entryDate: record.entryDate,
    title: record.title || "Untitled page",
    mood: record.mood,
    updatedAt: record.updatedAt,
    previewText: record.text.payload.content.slice(0, 140),
    photoCount: record.photos.length,
    todoCount: record.todo.payload.items.length,
    completedTodoCount: record.todo.payload.items.filter((item) => item.checked).length,
    themeConfig: record.themeConfig
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
