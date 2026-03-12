const DB_NAME = 'feedback-kiosk';
const DB_VERSION = 1;
const PENDING_STORE = 'pending-feedbacks';
const CONFIG_STORE = 'kiosk-config';

export interface FeedbackPayload {
  branchId: string;
  sentiment: string;
  followUpResponses: any;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  wantsCallback: boolean;
}

export interface PendingFeedback {
  id: string;
  payload: FeedbackPayload;
  createdAt: string;
  retryCount: number;
}

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        db.createObjectStore(PENDING_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(CONFIG_STORE)) {
        db.createObjectStore(CONFIG_STORE, { keyPath: 'branchId' });
      }
    };
  });
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueFeedback(payload: FeedbackPayload): Promise<string> {
  const db = await getDB();
  const id = crypto.randomUUID();
  const entry: PendingFeedback = {
    id,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
  const tx = db.transaction(PENDING_STORE, 'readwrite');
  tx.objectStore(PENDING_STORE).put(entry);
  return id;
}

export async function getPendingFeedbacks(): Promise<PendingFeedback[]> {
  const db = await getDB();
  const tx = db.transaction(PENDING_STORE, 'readonly');
  return idbRequest(tx.objectStore(PENDING_STORE).getAll());
}

export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  const tx = db.transaction(PENDING_STORE, 'readonly');
  return idbRequest(tx.objectStore(PENDING_STORE).count());
}

export async function removePendingFeedback(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(PENDING_STORE, 'readwrite');
  tx.objectStore(PENDING_STORE).delete(id);
}

export async function incrementRetry(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(PENDING_STORE, 'readwrite');
  const store = tx.objectStore(PENDING_STORE);
  const entry = await idbRequest(store.get(id));
  if (entry) {
    entry.retryCount += 1;
    store.put(entry);
  }
}

export async function cacheConfig(branchId: string, config: any): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(CONFIG_STORE, 'readwrite');
  tx.objectStore(CONFIG_STORE).put({ branchId, config, cachedAt: new Date().toISOString() });
}

export async function getCachedConfig(branchId: string): Promise<any | null> {
  const db = await getDB();
  const tx = db.transaction(CONFIG_STORE, 'readonly');
  const entry = await idbRequest(tx.objectStore(CONFIG_STORE).get(branchId));
  return entry?.config ?? null;
}
