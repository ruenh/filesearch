/**
 * Offline Storage Manager
 * Handles caching documents for offline access using IndexedDB
 */

const DB_NAME = "file-search-offline";
const DB_VERSION = 1;
const DOCUMENTS_STORE = "documents";
const PENDING_CHANGES_STORE = "pendingChanges";

interface CachedDocument {
  id: string;
  storageId: string;
  name: string;
  type: string;
  size: number;
  content: string;
  cachedAt: number;
  metadata: Record<string, unknown>;
}

interface PendingChange {
  id: string;
  documentId: string;
  type: "create" | "update" | "delete";
  data: unknown;
  timestamp: number;
  retryCount: number;
}

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB for offline storage
 */
export async function initOfflineStorage(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("Failed to open IndexedDB"));
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Documents store
      if (!database.objectStoreNames.contains(DOCUMENTS_STORE)) {
        const docStore = database.createObjectStore(DOCUMENTS_STORE, {
          keyPath: "id",
        });
        docStore.createIndex("storageId", "storageId", { unique: false });
        docStore.createIndex("cachedAt", "cachedAt", { unique: false });
      }

      // Pending changes store for background sync
      if (!database.objectStoreNames.contains(PENDING_CHANGES_STORE)) {
        const changesStore = database.createObjectStore(PENDING_CHANGES_STORE, {
          keyPath: "id",
        });
        changesStore.createIndex("documentId", "documentId", { unique: false });
        changesStore.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
  });
}

/**
 * Cache a document for offline access
 */
export async function cacheDocument(document: CachedDocument): Promise<void> {
  const database = await initOfflineStorage();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([DOCUMENTS_STORE], "readwrite");
    const store = transaction.objectStore(DOCUMENTS_STORE);

    const request = store.put({
      ...document,
      cachedAt: Date.now(),
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error("Failed to cache document"));
  });
}

/**
 * Get a cached document by ID
 */
export async function getCachedDocument(
  id: string
): Promise<CachedDocument | null> {
  const database = await initOfflineStorage();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([DOCUMENTS_STORE], "readonly");
    const store = transaction.objectStore(DOCUMENTS_STORE);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(new Error("Failed to get cached document"));
  });
}

/**
 * Get all cached documents for a storage
 */
export async function getCachedDocumentsByStorage(
  storageId: string
): Promise<CachedDocument[]> {
  const database = await initOfflineStorage();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([DOCUMENTS_STORE], "readonly");
    const store = transaction.objectStore(DOCUMENTS_STORE);
    const index = store.index("storageId");
    const request = index.getAll(storageId);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(new Error("Failed to get cached documents"));
  });
}

/**
 * Get all cached documents
 */
export async function getAllCachedDocuments(): Promise<CachedDocument[]> {
  const database = await initOfflineStorage();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([DOCUMENTS_STORE], "readonly");
    const store = transaction.objectStore(DOCUMENTS_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () =>
      reject(new Error("Failed to get all cached documents"));
  });
}

/**
 * Remove a cached document
 */
export async function removeCachedDocument(id: string): Promise<void> {
  const database = await initOfflineStorage();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([DOCUMENTS_STORE], "readwrite");
    const store = transaction.objectStore(DOCUMENTS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(new Error("Failed to remove cached document"));
  });
}

/**
 * Clear all cached documents
 */
export async function clearCachedDocuments(): Promise<void> {
  const database = await initOfflineStorage();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([DOCUMENTS_STORE], "readwrite");
    const store = transaction.objectStore(DOCUMENTS_STORE);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(new Error("Failed to clear cached documents"));
  });
}

/**
 * Add a pending change for background sync
 */
export async function addPendingChange(
  change: Omit<PendingChange, "id" | "timestamp" | "retryCount">
): Promise<string> {
  const database = await initOfflineStorage();
  const id = `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      [PENDING_CHANGES_STORE],
      "readwrite"
    );
    const store = transaction.objectStore(PENDING_CHANGES_STORE);

    const request = store.add({
      ...change,
      id,
      timestamp: Date.now(),
      retryCount: 0,
    });

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(new Error("Failed to add pending change"));
  });
}

/**
 * Get all pending changes
 */
export async function getPendingChanges(): Promise<PendingChange[]> {
  const database = await initOfflineStorage();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      [PENDING_CHANGES_STORE],
      "readonly"
    );
    const store = transaction.objectStore(PENDING_CHANGES_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(new Error("Failed to get pending changes"));
  });
}

/**
 * Remove a pending change after successful sync
 */
export async function removePendingChange(id: string): Promise<void> {
  const database = await initOfflineStorage();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      [PENDING_CHANGES_STORE],
      "readwrite"
    );
    const store = transaction.objectStore(PENDING_CHANGES_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(new Error("Failed to remove pending change"));
  });
}

/**
 * Update retry count for a pending change
 */
export async function updatePendingChangeRetry(id: string): Promise<void> {
  const database = await initOfflineStorage();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      [PENDING_CHANGES_STORE],
      "readwrite"
    );
    const store = transaction.objectStore(PENDING_CHANGES_STORE);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const change = getRequest.result;
      if (change) {
        change.retryCount += 1;
        const putRequest = store.put(change);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () =>
          reject(new Error("Failed to update retry count"));
      } else {
        resolve();
      }
    };
    getRequest.onerror = () =>
      reject(new Error("Failed to get pending change"));
  });
}

/**
 * Get storage usage info
 */
export async function getOfflineStorageInfo(): Promise<{
  documentCount: number;
  totalSize: number;
}> {
  const documents = await getAllCachedDocuments();
  const totalSize = documents.reduce(
    (sum, doc) => sum + (doc.content?.length || 0),
    0
  );

  return {
    documentCount: documents.length,
    totalSize,
  };
}

export type { CachedDocument, PendingChange };
