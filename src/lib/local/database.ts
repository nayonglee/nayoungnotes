import Dexie, { type Table } from "dexie";
import type {
  DraftRecord,
  DiaryEntryRecord,
  LocalAssetRecord,
  SyncQueueItem
} from "@/types/diary";

interface PreviewEntryRecord {
  key: string;
  userKey: string;
  entryDate: string;
  record: DiaryEntryRecord;
  updatedAt: string;
}

class NayoungNotesDatabase extends Dexie {
  drafts!: Table<DraftRecord, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  assets!: Table<LocalAssetRecord, string>;
  previewEntries!: Table<PreviewEntryRecord, string>;

  constructor() {
    super("nayoungnotes");
    this.version(1).stores({
      drafts: "&key, userKey, entryDate, dirty, updatedAt",
      syncQueue: "&key, userKey, entryDate, createdAt",
      assets: "&id, createdAt",
      previewEntries: "&key, userKey, entryDate, updatedAt"
    });
  }
}

export const appDB = new NayoungNotesDatabase();

export function buildDraftKey(userKey: string, entryDate: string) {
  return `${userKey}:${entryDate}`;
}

export async function putDraftRecord(draft: DraftRecord) {
  await appDB.drafts.put(draft);
}

export async function getDraftRecord(userKey: string, entryDate: string) {
  return appDB.drafts.get(buildDraftKey(userKey, entryDate));
}

export async function deleteDraftRecord(userKey: string, entryDate: string) {
  await appDB.drafts.delete(buildDraftKey(userKey, entryDate));
}

export async function listDraftRecords(userKey: string) {
  return appDB.drafts.where("userKey").equals(userKey).toArray();
}

export async function putQueueItem(item: SyncQueueItem) {
  await appDB.syncQueue.put(item);
}

export async function listQueueItems(userKey: string) {
  return appDB.syncQueue.where("userKey").equals(userKey).sortBy("createdAt");
}

export async function deleteQueueItem(key: string) {
  await appDB.syncQueue.delete(key);
}

export async function putLocalAsset(record: LocalAssetRecord) {
  await appDB.assets.put(record);
}

export async function getLocalAsset(id: string) {
  return appDB.assets.get(id);
}

export async function deleteLocalAsset(id: string) {
  await appDB.assets.delete(id);
}

export async function savePreviewEntry(userKey: string, record: DiaryEntryRecord) {
  await appDB.previewEntries.put({
    key: buildDraftKey(userKey, record.entryDate),
    userKey,
    entryDate: record.entryDate,
    record,
    updatedAt: record.updatedAt
  });
}

export async function getPreviewEntry(userKey: string, entryDate: string) {
  return appDB.previewEntries.get(buildDraftKey(userKey, entryDate));
}

export async function listPreviewEntries(userKey: string) {
  return appDB.previewEntries.where("userKey").equals(userKey).toArray();
}

export async function deletePreviewEntry(userKey: string, entryDate: string) {
  await appDB.previewEntries.delete(buildDraftKey(userKey, entryDate));
}
