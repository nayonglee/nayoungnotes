import type { Session } from "@supabase/supabase-js";
import {
  createBlankEntry,
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
            stickerId: String(row.payload.stickerId ?? "starry"),
            label: String(row.payload.label ?? ""),
            tint: String(row.payload.tint ?? "#f6ddea")
          },
          styleConfig: normalizeStyle(row),
          updatedAt: row.updated_at
        });
        break;
      case "drawing":
        record.drawing = {
          id: row.id,
          itemType: "drawing",
          orderIndex: row.order_index,
          payload: {
            background:
              row.payload.background === "plain" ||
              row.payload.background === "ruled" ||
              row.payload.background === "dot"
                ? row.payload.background
                : "dot",
            strokes: Array.isArray(row.payload.strokes)
              ? (row.payload.strokes as DiaryEntryRecord["drawing"]["payload"]["strokes"])
              : []
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
  const updatedRecord = withSearchText({
    ...record,
    updatedAt: new Date().toISOString(),
    userId: viewer.id
  });
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

  return (data as EntryRow[]).map((row) =>
    toEntryOverview({
      ...createBlankEntry(row.entry_date, viewer),
      id: row.id,
      userId: row.user_id,
      title: row.title ?? "",
      mood: (row.mood ?? undefined) as DiaryEntryRecord["mood"],
      themeConfig: row.theme_config ?? createBlankEntry(row.entry_date, viewer).themeConfig,
      searchText: row.search_text ?? "",
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })
  );
}

export async function loadEntryByDate(viewer: Viewer, entryDate: string) {
  if (viewer.mode === "preview" || !isSupabaseConfigured()) {
    const preview = await getPreviewEntry(viewerKey(viewer), entryDate);
    return preview?.record ?? null;
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
  const normalized = withSearchText(withUploadedPhotos);
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
