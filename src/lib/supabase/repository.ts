import type { Session } from "@supabase/supabase-js";
import {
  createBlankEntry,
  createDrawingSheet,
  normalizePlannerBlocks,
  normalizeEntryRecord,
  recordToPersistenceItems,
  toEntryOverview,
  withSearchText
} from "@/lib/entry";
import {
  deleteLocalAsset,
  deletePreviewEntry,
  getLocalAsset,
  getPreviewEntry,
  listPreviewEntries,
  savePreviewEntry
} from "@/lib/local/database";
import {
  getStorageBucket,
  getSupabaseClient,
  isSupabaseConfigured
} from "@/lib/supabase/client";
import { viewerKey } from "@/lib/utils";
import type {
  DiaryEntryRecord,
  EntryItemType,
  EntryOverview,
  PhotoItem,
  ThemeConfig,
  Viewer
} from "@/types/diary";

interface EntryRow {
  id: string;
  user_id: string;
  entry_date: string;
  title: string | null;
  mood: string | null;
  theme_config: ThemeConfig | null;
  search_text: string | null;
  created_at: string;
  updated_at: string;
}

interface EntryItemRow {
  id: string;
  entry_id: string;
  item_type: EntryItemType;
  order_index: number;
  payload: Record<string, unknown>;
  style_config: Record<string, unknown>;
  updated_at: string;
}

function photoBucket() {
  return getStorageBucket();
}

function normalizeStyle(row: EntryItemRow) {
  return {
    x: Number(row.style_config.x ?? 0),
    y: Number(row.style_config.y ?? 0),
    zIndex: Number(row.style_config.zIndex ?? 1),
    presetRotation: Number(row.style_config.presetRotation ?? 0) as -5 | 0 | 5
  };
}

async function createSignedPhotoUrl(path: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return undefined;
  const { data } = await supabase.storage.from(photoBucket()).createSignedUrl(path, 21600);
  return data?.signedUrl;
}

async function hydrateSignedPhotoUrls(record: DiaryEntryRecord) {
  const photos = await Promise.all(
    record.photos.map(async (photo) => {
      if (!photo.payload.path) return photo;
      return {
        ...photo,
        payload: {
          ...photo.payload,
          url: await createSignedPhotoUrl(photo.payload.path)
        }
      };
    })
  );

  return { ...record, photos };
}

function mapRowsToRecord(entryRow: EntryRow, itemRows: EntryItemRow[]) {
  const base = createBlankEntry(entryRow.entry_date, {
    id: entryRow.user_id,
    email: null,
    mode: "supabase"
  });

  const record: DiaryEntryRecord = {
    ...base,
    id: entryRow.id,
    userId: entryRow.user_id,
    title: entryRow.title ?? "",
    mood: (entryRow.mood ?? undefined) as DiaryEntryRecord["mood"],
    themeConfig: entryRow.theme_config ?? base.themeConfig,
    searchText: entryRow.search_text ?? "",
    createdAt: entryRow.created_at,
    updatedAt: entryRow.updated_at
  };

  for (const row of itemRows) {
    switch (row.item_type) {
      case "text":
        record.text = {
          id: row.id,
          itemType: "text",
          orderIndex: row.order_index,
          payload: { content: String(row.payload.content ?? "") },
          styleConfig: normalizeStyle(row),
          updatedAt: row.updated_at
        };
        break;
      case "todo":
        record.todo = {
          id: row.id,
          itemType: "todo",
          orderIndex: row.order_index,
          payload: {
            items: Array.isArray(row.payload.items)
              ? (row.payload.items as DiaryEntryRecord["todo"]["payload"]["items"])
              : []
          },
          styleConfig: normalizeStyle(row),
          updatedAt: row.updated_at
        };
        break;
      case "planner":
        record.planner = {
          id: row.id,
          itemType: "planner",
          orderIndex: row.order_index,
          payload: {
            blocks: normalizePlannerBlocks(row.payload.blocks)
          },
          styleConfig: normalizeStyle(row),
          updatedAt: row.updated_at
        };
        break;
      case "baseball":
        record.baseball = {
          id: row.id,
          itemType: "baseball",
          orderIndex: row.order_index,
          payload: {
            matchup: String(row.payload.matchup ?? ""),
            ballpark: String(row.payload.ballpark ?? ""),
            player: String(row.payload.player ?? ""),
            note: String(row.payload.note ?? ""),
            moment: String(row.payload.moment ?? "")
          },
          styleConfig: normalizeStyle(row),
          updatedAt: row.updated_at
        };
        break;
      case "teaching":
        record.teaching = {
          id: row.id,
          itemType: "teaching",
          orderIndex: row.order_index,
          payload: {
            dayType:
              row.payload.dayType === "school" ||
              row.payload.dayType === "teaching" ||
              row.payload.dayType === "prep" ||
              row.payload.dayType === "reset"
                ? row.payload.dayType
                : "school",
            medSchoolFocus: String(row.payload.medSchoolFocus ?? ""),
            academyWork: String(row.payload.academyWork ?? ""),
            pokePrompt: String(row.payload.pokePrompt ?? ""),
            subjects: Array.isArray(row.payload.subjects)
              ? row.payload.subjects.map((subject, index) => {
                  const source = subject && typeof subject === "object" ? (subject as Record<string, unknown>) : {};
                  return {
                    id: typeof source.id === "string" ? source.id : `subject_${index + 1}`,
                    label: typeof source.label === "string" ? source.label : `Subject ${index + 1}`,
                    checked: Boolean(source.checked),
                    note: typeof source.note === "string" ? source.note : ""
                  };
                })
              : []
          },
          styleConfig: normalizeStyle(row),
          updatedAt: row.updated_at
        };
        break;
      case "photo":
        record.photos.push({
          id: row.id,
          itemType: "photo",
          orderIndex: row.order_index,
          payload: {
            caption: String(row.payload.caption ?? ""),
            width: Number(row.payload.width ?? 0),
            height: Number(row.payload.height ?? 0),
            path: row.payload.path ? String(row.payload.path) : undefined
          },
          styleConfig: normalizeStyle(row),
          updatedAt: row.updated_at
        });
        break;
      case "sticker":
        record.stickers.push({
          id: row.id,
          itemType: "sticker",
          orderIndex: row.order_index,
          payload: {
            stickerId: String(row.payload.stickerId ?? "star-sugar"),
            label: String(row.payload.label ?? ""),
            tint: String(row.payload.tint ?? "#f6ddea")
          },
          styleConfig: normalizeStyle(row),
          updatedAt: row.updated_at
        });
        break;
      case "drawing":
        const legacyBackground =
          row.payload.background === "plain" ||
          row.payload.background === "ruled" ||
          row.payload.background === "dot"
            ? row.payload.background
            : "dot";
        const legacyStrokes = Array.isArray(row.payload.strokes)
          ? (row.payload.strokes as DiaryEntryRecord["drawing"]["payload"]["sheets"][number]["strokes"])
          : [];
        const sheets = Array.isArray(row.payload.sheets)
          ? (row.payload.sheets as DiaryEntryRecord["drawing"]["payload"]["sheets"]).map(
              (sheet, index) => ({
                id: sheet.id || `${row.id}_sheet_${index + 1}`,
                title: sheet.title || `Sheet ${index + 1}`,
                background:
                  sheet.background === "plain" ||
                  sheet.background === "ruled" ||
                  sheet.background === "dot"
                    ? sheet.background
                    : legacyBackground,
                strokes: Array.isArray(sheet.strokes) ? sheet.strokes : []
              })
            )
          : [
              {
                ...createDrawingSheet(0, legacyBackground, "Sheet 1"),
                id: `${row.id}_sheet_1`,
                strokes: legacyStrokes
              }
            ];
        const activeSheetId =
          typeof row.payload.activeSheetId === "string" &&
          sheets.some((sheet) => sheet.id === row.payload.activeSheetId)
            ? row.payload.activeSheetId
            : sheets[0]?.id;
        record.drawing = {
          id: row.id,
          itemType: "drawing",
          orderIndex: row.order_index,
          payload: {
            activeSheetId: activeSheetId ?? `${row.id}_sheet_1`,
            sheets
          },
          styleConfig: normalizeStyle(row),
          updatedAt: row.updated_at
        };
        break;
      default:
        break;
    }
  }

  record.photos.sort((a, b) => a.styleConfig.zIndex - b.styleConfig.zIndex);
  record.stickers.sort((a, b) => a.styleConfig.zIndex - b.styleConfig.zIndex);
  return record;
}

async function uploadPendingPhotos(viewer: Viewer, entryDate: string, photos: PhotoItem[]) {
  const supabase = getSupabaseClient();
  if (!supabase) return photos;

  return Promise.all(
    photos.map(async (photo) => {
      if (!photo.payload.localAssetId) return photo;
      const asset = await getLocalAsset(photo.payload.localAssetId);
      if (!asset) return photo;

      const extension = asset.mimeType.split("/")[1] || "jpg";
      const path = `${viewer.id}/${entryDate}/${photo.id}.${extension}`;
      const { error } = await supabase.storage.from(photoBucket()).upload(path, asset.blob, {
        cacheControl: "3600",
        upsert: true,
        contentType: asset.mimeType
      });
      if (error) throw error;

      await deleteLocalAsset(asset.id);
      return {
        ...photo,
        payload: {
          ...photo.payload,
          localAssetId: undefined,
          path,
          url: await createSignedPhotoUrl(path)
        }
      };
    })
  );
}

async function savePreviewModeEntry(viewer: Viewer, record: DiaryEntryRecord) {
  const updatedRecord = withSearchText(normalizeEntryRecord({
    ...record,
    updatedAt: new Date().toISOString(),
    userId: viewer.id
  }, viewer));
  await savePreviewEntry(viewerKey(viewer), updatedRecord);
  return updatedRecord;
}

export async function loadSession() {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session satisfies Session | null;
}

export async function listEntries(viewer: Viewer, search = ""): Promise<EntryOverview[]> {
  if (viewer.mode === "preview" || !isSupabaseConfigured()) {
    const previewRows = await listPreviewEntries(viewerKey(viewer));
    return previewRows
      .map((row) => toEntryOverview(row.record))
      .filter((entry) => {
        if (!search.trim()) return true;
        const haystack = `${entry.title} ${entry.previewText}`.toLowerCase();
        return haystack.includes(search.trim().toLowerCase());
      })
      .sort((a, b) => b.entryDate.localeCompare(a.entryDate));
  }

  const supabase = getSupabaseClient();
  if (!supabase) return [];

  let query = supabase.from("entries").select("*").order("entry_date", { ascending: false }).limit(240);
  if (search.trim()) query = query.ilike("search_text", `%${search.trim()}%`);

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as EntryRow[];
  if (rows.length === 0) return [];

  const entryIds = rows.map((row) => row.id);
  const { data: itemData, error: itemError } = await supabase
    .from("entry_items")
    .select("entry_id,item_type,order_index,payload,style_config,id,updated_at")
    .in("entry_id", entryIds)
    .order("order_index", { ascending: true });

  if (itemError) throw itemError;

  const grouped = new Map<string, EntryItemRow[]>();
  for (const item of (itemData ?? []) as EntryItemRow[]) {
    const bucket = grouped.get(item.entry_id) ?? [];
    bucket.push(item);
    grouped.set(item.entry_id, bucket);
  }

  return Promise.all(
    rows.map(async (row) => {
      const itemRows = grouped.get(row.id) ?? [];
      const textRow = itemRows.find((item) => item.item_type === "text");
      const todoRow = itemRows.find((item) => item.item_type === "todo");
      const plannerRow = itemRows.find((item) => item.item_type === "planner");
      const photoRows = itemRows.filter((item) => item.item_type === "photo");

      const todoItems = Array.isArray(todoRow?.payload.items)
        ? (todoRow?.payload.items as DiaryEntryRecord["todo"]["payload"]["items"])
        : [];
      const plannerBlocks = normalizePlannerBlocks(plannerRow?.payload.blocks);
      const coverPhotoPath = photoRows.find((item) => typeof item.payload.path === "string")?.payload
        .path as string | undefined;

      return {
        id: row.id,
        entryDate: row.entry_date,
        title: row.title ?? "Untitled page",
        mood: (row.mood ?? undefined) as DiaryEntryRecord["mood"],
        updatedAt: row.updated_at,
        previewText: String(textRow?.payload.content ?? "").slice(0, 140),
        photoCount: photoRows.length,
        todoCount: todoItems.length,
        completedTodoCount: todoItems.filter((item) => item.checked).length,
        plannerCount: plannerBlocks.filter((item) => item.title?.trim() || item.note?.trim()).length,
        coverPhotoUrl: coverPhotoPath ? await createSignedPhotoUrl(coverPhotoPath) : undefined,
        themeConfig: row.theme_config ?? createBlankEntry(row.entry_date, viewer).themeConfig
      } satisfies EntryOverview;
    })
  );
}

export async function loadEntryByDate(viewer: Viewer, entryDate: string) {
  if (viewer.mode === "preview" || !isSupabaseConfigured()) {
    const preview = await getPreviewEntry(viewerKey(viewer), entryDate);
    return preview?.record ? normalizeEntryRecord(preview.record, viewer) : null;
  }

  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: entryRow, error } = await supabase
    .from("entries")
    .select("*")
    .eq("entry_date", entryDate)
    .maybeSingle();

  if (error) throw error;
  if (!entryRow) return null;

  const { data: itemRows, error: itemError } = await supabase
    .from("entry_items")
    .select("*")
    .eq("entry_id", (entryRow as EntryRow).id)
    .order("order_index", { ascending: true });

  if (itemError) throw itemError;

  const mapped = mapRowsToRecord(entryRow as EntryRow, (itemRows ?? []) as EntryItemRow[]);
  return hydrateSignedPhotoUrls(mapped);
}

export async function saveEntry(viewer: Viewer, record: DiaryEntryRecord) {
  if (viewer.mode === "preview" || !isSupabaseConfigured()) {
    return savePreviewModeEntry(viewer, record);
  }

  const supabase = getSupabaseClient();
  if (!supabase) return savePreviewModeEntry({ ...viewer, mode: "preview" }, record);

  const withUploadedPhotos = {
    ...record,
    userId: viewer.id,
    photos: await uploadPendingPhotos(viewer, record.entryDate, record.photos)
  };
  const normalized = withSearchText(normalizeEntryRecord(withUploadedPhotos, viewer));
  const items = recordToPersistenceItems(normalized);

  const { error } = await supabase.rpc("save_diary_entry", {
    p_entry_id: normalized.id.startsWith("entry_") ? null : normalized.id,
    p_entry_date: normalized.entryDate,
    p_title: normalized.title,
    p_mood: normalized.mood ?? null,
    p_theme_config: normalized.themeConfig,
    p_search_text: normalized.searchText,
    p_items: items
  });

  if (error) throw error;

  return loadEntryByDate(viewer, normalized.entryDate).then((saved) => saved ?? normalized);
}

export async function deleteEntry(viewer: Viewer, record: DiaryEntryRecord) {
  if (viewer.mode === "preview" || !isSupabaseConfigured()) {
    await deletePreviewEntry(viewerKey(viewer), record.entryDate);
    return;
  }

  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.rpc("delete_diary_entry", {
    p_entry_id: record.id.startsWith("entry_") ? null : record.id,
    p_entry_date: record.entryDate
  });

  if (error) throw error;
}
