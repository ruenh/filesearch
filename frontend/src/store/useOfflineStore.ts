/**
 * Offline State Store
 * Manages PWA offline mode state and cached documents
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  cacheDocument,
  getCachedDocument,
  getAllCachedDocuments,
  removeCachedDocument,
  clearCachedDocuments,
  addPendingChange,
  getPendingChanges,
  getOfflineStorageInfo,
  type CachedDocument,
  type PendingChange,
} from "@/lib/pwa";

interface OfflineState {
  // Online status
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;

  // Offline mode enabled
  offlineModeEnabled: boolean;
  setOfflineModeEnabled: (enabled: boolean) => void;

  // Cached document IDs (for quick lookup)
  cachedDocumentIds: Set<string>;
  setCachedDocumentIds: (ids: Set<string>) => void;

  // Pending changes count
  pendingChangesCount: number;
  setPendingChangesCount: (count: number) => void;

  // Sync status
  syncStatus: "idle" | "syncing" | "error";
  setSyncStatus: (status: "idle" | "syncing" | "error") => void;

  // Last sync time
  lastSyncTime: number | null;
  setLastSyncTime: (time: number | null) => void;

  // Storage info
  storageInfo: { documentCount: number; totalSize: number } | null;
  setStorageInfo: (
    info: { documentCount: number; totalSize: number } | null
  ) => void;

  // Actions
  cacheDocumentForOffline: (document: CachedDocument) => Promise<void>;
  removeCachedDocumentById: (id: string) => Promise<void>;
  clearAllCachedDocuments: () => Promise<void>;
  getCachedDocumentById: (id: string) => Promise<CachedDocument | null>;
  getAllCached: () => Promise<CachedDocument[]>;
  isDocumentCached: (id: string) => boolean;
  addOfflineChange: (
    change: Omit<PendingChange, "id" | "timestamp" | "retryCount">
  ) => Promise<string>;
  refreshOfflineState: () => Promise<void>;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      // Initial state
      isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
      offlineModeEnabled: false,
      cachedDocumentIds: new Set(),
      pendingChangesCount: 0,
      syncStatus: "idle",
      lastSyncTime: null,
      storageInfo: null,

      // Setters
      setIsOnline: (online) => set({ isOnline: online }),
      setOfflineModeEnabled: (enabled) => set({ offlineModeEnabled: enabled }),
      setCachedDocumentIds: (ids) => set({ cachedDocumentIds: ids }),
      setPendingChangesCount: (count) => set({ pendingChangesCount: count }),
      setSyncStatus: (status) => set({ syncStatus: status }),
      setLastSyncTime: (time) => set({ lastSyncTime: time }),
      setStorageInfo: (info) => set({ storageInfo: info }),

      // Cache a document for offline access
      cacheDocumentForOffline: async (document) => {
        await cacheDocument(document);
        const { cachedDocumentIds } = get();
        const newIds = new Set(cachedDocumentIds);
        newIds.add(document.id);
        set({ cachedDocumentIds: newIds });

        // Update storage info
        const info = await getOfflineStorageInfo();
        set({ storageInfo: info });
      },

      // Remove a cached document
      removeCachedDocumentById: async (id) => {
        await removeCachedDocument(id);
        const { cachedDocumentIds } = get();
        const newIds = new Set(cachedDocumentIds);
        newIds.delete(id);
        set({ cachedDocumentIds: newIds });

        // Update storage info
        const info = await getOfflineStorageInfo();
        set({ storageInfo: info });
      },

      // Clear all cached documents
      clearAllCachedDocuments: async () => {
        await clearCachedDocuments();
        set({
          cachedDocumentIds: new Set(),
          storageInfo: { documentCount: 0, totalSize: 0 },
        });
      },

      // Get a cached document by ID
      getCachedDocumentById: async (id) => {
        return getCachedDocument(id);
      },

      // Get all cached documents
      getAllCached: async () => {
        return getAllCachedDocuments();
      },

      // Check if a document is cached
      isDocumentCached: (id) => {
        return get().cachedDocumentIds.has(id);
      },

      // Add an offline change for background sync
      addOfflineChange: async (change) => {
        const id = await addPendingChange(change);
        const pendingChanges = await getPendingChanges();
        set({ pendingChangesCount: pendingChanges.length });
        return id;
      },

      // Refresh offline state from IndexedDB
      refreshOfflineState: async () => {
        try {
          const [documents, pendingChanges, storageInfo] = await Promise.all([
            getAllCachedDocuments(),
            getPendingChanges(),
            getOfflineStorageInfo(),
          ]);

          set({
            cachedDocumentIds: new Set(documents.map((d) => d.id)),
            pendingChangesCount: pendingChanges.length,
            storageInfo,
          });
        } catch (error) {
          console.error("Failed to refresh offline state:", error);
        }
      },
    }),
    {
      name: "offline-storage",
      partialize: (state) => ({
        offlineModeEnabled: state.offlineModeEnabled,
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);
