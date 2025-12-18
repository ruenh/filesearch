/**
 * PWA Module Exports
 */

export {
  registerServiceWorker,
  unregisterServiceWorker,
  isStandalone,
  isOnline,
  requestPersistentStorage,
  getStorageEstimate,
  CACHE_NAME,
  DOCUMENT_CACHE_NAME,
  API_CACHE_NAME,
} from "./serviceWorker";

export {
  initOfflineStorage,
  cacheDocument,
  getCachedDocument,
  getCachedDocumentsByStorage,
  getAllCachedDocuments,
  removeCachedDocument,
  clearCachedDocuments,
  addPendingChange,
  getPendingChanges,
  removePendingChange,
  getOfflineStorageInfo,
  type CachedDocument,
  type PendingChange,
} from "./offlineStorage";

export {
  backgroundSync,
  type SyncStatus,
  type SyncEvent,
} from "./backgroundSync";
