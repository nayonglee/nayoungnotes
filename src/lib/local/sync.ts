import { createBlankEntry, toEntryOverview } from "@/lib/entry";
import {
  buildDraftKey,
  deleteDraftRecord,
  deleteQueueItem,
  getDraftRecord,
  listDraftRecords,
  listQueueItems,
  putDraftRecord,
  putQueueItem
} from "@/lib/local/database";
import { deleteEntry, listEntries, loadEntryByDate, saveEntry } from "@/lib/supabase/repository";
import { viewerKey } from "@/lib/utils";
import type { DiaryEntryRecord, EntryOverview, Viewer } from "@/types/diary";

export async function loadEntryRecord(viewer: Viewer, entryDate: string) {
  const userKey = viewerKey(viewer);
  const draft = await getDraftRecord(userKey, entryDate);

  try {
    const remote = await loadEntryByDate(viewer, entryDate);
    if (draft?.dirty) return draft.record;

    if (remote) {
      await putDraftRecord({
        key: buildDraftKey(userKey, entryDate),
        userKey,
        entryDate,
        record: remote,
        dirty: false,
        serverUpdatedAt: remote.updatedAt,
        updatedAt: remote.updatedAt
      });
      return remote;
    }
  } catch {
    if (draft?.record) return draft.record;
  }

  if (draft?.record) return draft.record;
  return createBlankEntry(entryDate, viewer);
}

export async function loadEntryOverviews(viewer: Viewer, search = ""): Promise<EntryOverview[]> {
  const userKey = viewerKey(viewer);
  const [remoteEntries, localDrafts] = await Promise.allSettled([
    listEntries(viewer, search),
    listDraftRecords(userKey)
  ]);

  const merged = new Map<string, EntryOverview>();

  if (remoteEntries.status === "fulfilled") {
    for (const item of remoteEntries.value) merged.set(item.entryDate, item);
  }

  if (localDrafts.status === "fulfilled") {
    for (const draft of localDrafts.value) {
      const overview = toEntryOverview(draft.record);
      if (!search.trim()) {
        merged.set(overview.entryDate, overview);
        continue;
      }
      const haystack = `${overview.title} ${overview.previewText}`.toLowerCase();
      if (haystack.includes(search.trim().toLowerCase())) merged.set(overview.entryDate, overview);
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.entryDate.localeCompare(a.entryDate));
}

export async function persistDraft(viewer: Viewer, record: DiaryEntryRecord, dirty = true) {
  const userKey = viewerKey(viewer);
  const existing = await getDraftRecord(userKey, record.entryDate);

  await putDraftRecord({
    key: buildDraftKey(userKey, record.entryDate),
    userKey,
    entryDate: record.entryDate,
    record,
    dirty,
    serverUpdatedAt: existing?.serverUpdatedAt ?? record.updatedAt,
    updatedAt: new Date().toISOString()
  });
}

export async function queueSave(viewer: Viewer, record: DiaryEntryRecord, lastError?: string) {
  const userKey = viewerKey(viewer);
  await putQueueItem({
    key: buildDraftKey(userKey, record.entryDate),
    userKey,
    entryDate: record.entryDate,
    kind: "save",
    record,
    createdAt: new Date().toISOString(),
    lastError
  });
}

export async function queueDelete(viewer: Viewer, record: DiaryEntryRecord, lastError?: string) {
  const userKey = viewerKey(viewer);
  await putQueueItem({
    key: buildDraftKey(userKey, record.entryDate),
    userKey,
    entryDate: record.entryDate,
    kind: "delete",
    record,
    createdAt: new Date().toISOString(),
    lastError
  });
}

export async function clearPendingState(viewer: Viewer, entryDate: string) {
  await deleteQueueItem(buildDraftKey(viewerKey(viewer), entryDate));
}

export async function flushPendingQueue(viewer: Viewer) {
  const userKey = viewerKey(viewer);
  const queue = await listQueueItems(userKey);

  for (const item of queue) {
    try {
      if (item.kind === "delete" && item.record) {
        await deleteEntry(viewer, item.record);
        await deleteDraftRecord(userKey, item.entryDate);
      }

      if (item.kind === "save" && item.record) {
        const savedRecord = await saveEntry(viewer, item.record);
        await putDraftRecord({
          key: buildDraftKey(userKey, item.entryDate),
          userKey,
          entryDate: item.entryDate,
          record: savedRecord,
          dirty: false,
          serverUpdatedAt: savedRecord.updatedAt,
          updatedAt: savedRecord.updatedAt
        });
      }

      await deleteQueueItem(item.key);
    } catch {
      break;
    }
  }
}
