/**
 * PWA Hook
 * Provides PWA functionality including offline status, service worker, and caching
 */

import { useEffect, useCallback, useState } from "react";
import { useOfflineStore } from "@/store/useOfflineStore";
import {
  registerServiceWorker,
  isOnline as checkOnline,
  isStandalone,
  requestPersistentStorage,
  getStorageEstimate,
  backgroundSync,
  type CachedDocument,
} from "@/lib/pwa";

interface UsePWAReturn {
  // Status
  isOnline: boolean;
  isStandalone: boolean;
  offlineModeEnabled: boolean;
  syncStatus: "idle" | "syncing" | "error";
  pendingChangesCount: number;

  // Storage info
  storageInfo: { documentCount: number; totalSize: number } | null;
  storageEstimate: { usage: number; quota: number } | null;

  // Actions
  enableOfflineMode: () => Promise<void>;
  disableOfflineMode: () => Promise<void>;
  cacheDocument: (document: CachedDocument) => Promise<void>;
  uncacheDocument: (id: string) => Promise<void>;
  isDocumentCached: (id: string) => boolean;
  syncNow: () => Promise<void>;
  clearCache: () => Promise<void>;

  // Service worker
  updateAvailable: boolean;
  updateServiceWorker: () => void;
}

export function usePWA(): UsePWAReturn {
  const {
    isOnline,
    setIsOnline,
    offlineModeEnabled,
    setOfflineModeEnabled,
    syncStatus,
    setSyncStatus,
    pendingChangesCount,
    storageInfo,
    cacheDocumentForOffline,
    removeCachedDocumentById,
    clearAllCachedDocuments,
    isDocumentCached,
    refreshOfflineState,
  } = useOfflineStore();

  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [swRegistration, setSwRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [storageEstimate, setStorageEstimate] = useState<{
    usage: number;
    quota: number;
  } | null>(null);

  // Initialize PWA
  useEffect(() => {
    const initPWA = async () => {
      // Register service worker
      const registration = await registerServiceWorker({
        onSuccess: () => {
          console.log("Service worker registered successfully");
        },
        onUpdate: (reg) => {
          console.log("New service worker available");
          setUpdateAvailable(true);
          setSwRegistration(reg);
        },
        onOffline: () => {
          setIsOnline(false);
        },
        onOnline: () => {
          setIsOnline(true);
          // Trigger sync when coming back online
          backgroundSync.sync();
        },
      });

      if (registration) {
        setSwRegistration(registration);
      }

      // Request persistent storage
      await requestPersistentStorage();

      // Get storage estimate
      const estimate = await getStorageEstimate();
      setStorageEstimate(estimate);

      // Refresh offline state from IndexedDB
      await refreshOfflineState();

      // Start background sync
      backgroundSync.start();

      // Listen for sync events
      backgroundSync.addEventListener((event) => {
        switch (event.type) {
          case "syncStart":
            setSyncStatus("syncing");
            break;
          case "syncComplete":
            setSyncStatus("idle");
            refreshOfflineState();
            break;
          case "syncError":
            setSyncStatus("error");
            break;
        }
      });
    };

    initPWA();

    // Set initial online status
    setIsOnline(checkOnline());

    // Cleanup
    return () => {
      backgroundSync.stop();
    };
  }, [setIsOnline, setSyncStatus, refreshOfflineState]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setIsOnline]);

  // Enable offline mode
  const enableOfflineMode = useCallback(async () => {
    setOfflineModeEnabled(true);
    await refreshOfflineState();
  }, [setOfflineModeEnabled, refreshOfflineState]);

  // Disable offline mode
  const disableOfflineMode = useCallback(async () => {
    setOfflineModeEnabled(false);
  }, [setOfflineModeEnabled]);

  // Cache a document
  const cacheDocument = useCallback(
    async (document: CachedDocument) => {
      await cacheDocumentForOffline(document);

      // Also notify service worker
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "CACHE_DOCUMENT",
          payload: document,
        });
      }
    },
    [cacheDocumentForOffline]
  );

  // Uncache a document
  const uncacheDocument = useCallback(
    async (id: string) => {
      await removeCachedDocumentById(id);
    },
    [removeCachedDocumentById]
  );

  // Sync now
  const syncNow = useCallback(async () => {
    await backgroundSync.sync();
  }, []);

  // Clear cache
  const clearCache = useCallback(async () => {
    await clearAllCachedDocuments();

    // Also notify service worker
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "CLEAR_CACHE",
      });
    }
  }, [clearAllCachedDocuments]);

  // Update service worker
  const updateServiceWorker = useCallback(() => {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
      window.location.reload();
    }
  }, [swRegistration]);

  return {
    isOnline,
    isStandalone: isStandalone(),
    offlineModeEnabled,
    syncStatus,
    pendingChangesCount,
    storageInfo,
    storageEstimate,
    enableOfflineMode,
    disableOfflineMode,
    cacheDocument,
    uncacheDocument,
    isDocumentCached,
    syncNow,
    clearCache,
    updateAvailable,
    updateServiceWorker,
  };
}
