import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export type EntityStoreName = 'artifacts' | 'exhibitions' | 'annotations' | 'tours';

export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
  createdAt: string;
}

interface CraftGalleryDB extends DBSchema {
  artifacts: {
    key: string;
    value: { id: string; [key: string]: unknown };
  };
  exhibitions: {
    key: string;
    value: { id: string; [key: string]: unknown };
  };
  annotations: {
    key: string;
    value: { id: string; [key: string]: unknown };
  };
  tours: {
    key: string;
    value: { id: string; [key: string]: unknown };
  };
  files: {
    key: string;
    value: StoredFile;
  };
}

const DB_NAME = 'craft-gallery-local';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<CraftGalleryDB>> | null = null;
const objectUrls = new Map<string, string>();

export function createId(prefix = 'item'): string {
  const randomPart = crypto.getRandomValues(new Uint32Array(2)).join('');
  return `${prefix}-${Date.now().toString(36)}-${randomPart}`;
}

export function getDatabase(): Promise<IDBPDatabase<CraftGalleryDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CraftGalleryDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        for (const storeName of ['artifacts', 'exhibitions', 'annotations', 'tours', 'files'] as const) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        }
      }
    });
  }

  return dbPromise;
}

export async function getAllRecords<T extends { id: string }>(storeName: EntityStoreName): Promise<T[]> {
  const db = await getDatabase();
  return (await db.getAll(storeName)) as T[];
}

export async function getRecord<T extends { id: string }>(storeName: EntityStoreName, id: string): Promise<T | undefined> {
  const db = await getDatabase();
  return (await db.get(storeName, id)) as T | undefined;
}

export async function putRecord<T extends { id: string }>(storeName: EntityStoreName, value: T): Promise<void> {
  const db = await getDatabase();
  await db.put(storeName, value);
}

export async function putManyRecords<T extends { id: string }>(storeName: EntityStoreName, values: T[]): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(storeName, 'readwrite');
  await Promise.all(values.map((value) => tx.store.put(value)));
  await tx.done;
}

export async function deleteRecord(storeName: EntityStoreName, id: string): Promise<void> {
  const db = await getDatabase();
  await db.delete(storeName, id);
}

export async function clearRecords(storeName: EntityStoreName): Promise<void> {
  const db = await getDatabase();
  await db.clear(storeName);
}

export async function saveBlobFile(file: Blob, fileName = 'local-file'): Promise<StoredFile> {
  const db = await getDatabase();
  const storedFile: StoredFile = {
    id: createId('file'),
    name: 'name' in file && typeof file.name === 'string' ? file.name : fileName,
    type: file.type || 'application/octet-stream',
    size: file.size,
    blob: file,
    createdAt: new Date().toISOString()
  };

  await db.put('files', storedFile);
  return storedFile;
}

export async function getBlobFile(fileId: string): Promise<StoredFile | undefined> {
  const db = await getDatabase();
  return db.get('files', fileId);
}

export async function createBlobUrl(fileId: string): Promise<string | undefined> {
  if (objectUrls.has(fileId)) {
    return objectUrls.get(fileId);
  }

  const storedFile = await getBlobFile(fileId);
  if (!storedFile) return undefined;

  const url = URL.createObjectURL(storedFile.blob);
  objectUrls.set(fileId, url);
  return url;
}

export function revokeBlobUrl(fileId: string): void {
  const url = objectUrls.get(fileId);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrls.delete(fileId);
  }
}

export async function deleteBlobFile(fileId: string): Promise<void> {
  const db = await getDatabase();
  revokeBlobUrl(fileId);
  await db.delete('files', fileId);
}

export function revokeAllBlobUrls(): void {
  objectUrls.forEach((url) => URL.revokeObjectURL(url));
  objectUrls.clear();
}
