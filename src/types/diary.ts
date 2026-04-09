export type AuthMode = "supabase" | "preview";

export interface Viewer {
  id: string;
  email: string | null;
  mode: AuthMode;
}

export type MoodKey =
  | "glowy"
  | "calm"
  | "proud"
  | "busy"
  | "dreamy"
  | "gentle";

export type ThemePreset = "petal" | "mint" | "berry";
export type TexturePreset = "paper" | "dot" | "ruled";
export type BoardTone = "cream" | "mint" | "blush";
export type PresetRotation = -5 | 0 | 5;
export type EntryItemType = "text" | "todo" | "photo" | "drawing" | "sticker";
export type SaveState = "saved" | "syncing" | "offline-draft" | "error" | "idle";

export interface ThemeConfig {
  preset: ThemePreset;
  texture: TexturePreset;
  boardTone: BoardTone;
}

export interface BaseStyleConfig {
  x: number;
  y: number;
  zIndex: number;
  presetRotation: PresetRotation;
}

export interface TextPayload {
  content: string;
}

export interface TodoCard {
  id: string;
  text: string;
  checked: boolean;
}

export interface TodoPayload {
  items: TodoCard[];
}

export interface PhotoPayload {
  path?: string;
  url?: string;
  caption: string;
  width: number;
  height: number;
  localAssetId?: string;
}

export interface StickerPayload {
  stickerId: string;
  label: string;
  tint: string;
}

export type DrawingTool = "pen" | "highlighter";
export type DrawingBackground = "plain" | "ruled" | "dot";
export type StrokePoint = [number, number, number?];

export interface DrawingStroke {
  id: string;
  tool: DrawingTool;
  color: string;
  width: number;
  opacity: number;
  points: StrokePoint[];
}

export interface DrawingPayload {
  background: DrawingBackground;
  strokes: DrawingStroke[];
}

export interface BaseEntryItem<TPayload> {
  id: string;
  itemType: EntryItemType;
  orderIndex: number;
  payload: TPayload;
  styleConfig: BaseStyleConfig;
  updatedAt?: string;
}

export type TextItem = BaseEntryItem<TextPayload> & { itemType: "text" };
export type TodoItem = BaseEntryItem<TodoPayload> & { itemType: "todo" };
export type PhotoItem = BaseEntryItem<PhotoPayload> & { itemType: "photo" };
export type StickerItem = BaseEntryItem<StickerPayload> & { itemType: "sticker" };
export type DrawingItem = BaseEntryItem<DrawingPayload> & { itemType: "drawing" };

export interface DiaryEntryRecord {
  id: string;
  userId?: string;
  entryDate: string;
  title: string;
  mood?: MoodKey;
  themeConfig: ThemeConfig;
  searchText: string;
  createdAt: string;
  updatedAt: string;
  text: TextItem;
  todo: TodoItem;
  photos: PhotoItem[];
  stickers: StickerItem[];
  drawing: DrawingItem;
}

export interface EntryOverview {
  id: string;
  entryDate: string;
  title: string;
  mood?: MoodKey;
  updatedAt: string;
  previewText: string;
  photoCount: number;
  todoCount: number;
  completedTodoCount: number;
  themeConfig: ThemeConfig;
}

export interface PersistedEntryItemRow {
  id: string;
  item_type: EntryItemType;
  order_index: number;
  payload: Record<string, unknown>;
  style_config: Record<string, unknown>;
}

export interface DraftRecord {
  key: string;
  userKey: string;
  entryDate: string;
  record: DiaryEntryRecord;
  dirty: boolean;
  serverUpdatedAt: string | null;
  updatedAt: string;
}

export interface SyncQueueItem {
  key: string;
  userKey: string;
  entryDate: string;
  kind: "save" | "delete";
  record?: DiaryEntryRecord;
  createdAt: string;
  lastError?: string;
}

export interface LocalAssetRecord {
  id: string;
  blob: Blob;
  mimeType: string;
  createdAt: string;
}

export interface PinPreferences {
  enabled: boolean;
  timeoutMinutes: number;
  lockOnBackground: boolean;
}

export interface StoredPinConfig {
  salt: string;
  hash: string;
}
