// Qayta tiklanadigan (resumable) yuklash ombori:
// - video fayl (Blob) IndexedDB'da saqlanadi — page refresh'dan keyin ham topiladi
// - meta + progress localStorage'da saqlanadi
// - server qaysi bo'laklar yetganini aytadi (/api/upload/chunk GET),
//   client faqat yetishmaganlarni yuboradi — 0 dan boshlanmaydi.

export interface ResumableMeta {
  uploadId: string;
  name: string;
  size: number;
  type: string;
  title: string;
  description: string;
  category: string;
  visibility: string;
  madeForKids: boolean;
  ageRestricted: boolean;
  aiGenerated: boolean;
  scheduleAt: string;
  duration: number;
  uploadedBytes: number;
}

export const UPLOAD_CHUNK_SIZE = 8 * 1024 * 1024; // 8MB

const LS_KEY = "lumina:upload:active";
const DB_NAME = "lumina-uploads";
const DB_STORE = "files";

function canUseIDB(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

/** Fayl tarkibidan barqaror id (nom+hajm+vaqt+oddiy hash). */
export function makeUploadId(file: File): string {
  let h = 0;
  const s = `${file.name}|${file.size}|${file.lastModified}`;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  }
  const hex = (h >>> 0).toString(36);
  return `${file.size.toString(36)}-${file.lastModified.toString(36)}-${hex}`.replace(/[^A-Za-z0-9-]/g, "");
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!canUseIDB()) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(DB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IDB open failed"));
  });
}

export async function saveBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IDB put failed"));
    });
  } finally {
    db.close();
  }
}

export async function loadBlob(id: string): Promise<Blob | null> {
  const db = await openDB();
  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readonly");
      const rq = tx.objectStore(DB_STORE).get(id);
      rq.onsuccess = () => resolve((rq.result as Blob | undefined) ?? null);
      rq.onerror = () => reject(rq.error ?? new Error("IDB get failed"));
    });
  } finally {
    db.close();
  }
}

export async function deleteBlob(id: string): Promise<void> {
  try {
    const db = await openDB();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(DB_STORE, "readwrite");
        tx.objectStore(DB_STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("IDB delete failed"));
      });
    } finally {
      db.close();
    }
  } catch {
    /* ignore */
  }
}

function canUseLS(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function saveActive(meta: ResumableMeta): void {
  if (!canUseLS()) return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(meta));
  } catch {
    /* quota — davom etamiz, lekin refresh'da tiklanmaydi */
  }
}

export function loadActive(): ResumableMeta | null {
  if (!canUseLS()) return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as ResumableMeta;
    if (!m || typeof m.uploadId !== "string" || typeof m.size !== "number") return null;
    return m;
  } catch {
    return null;
  }
}

export function clearActive(): void {
  if (!canUseLS()) return;
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}
