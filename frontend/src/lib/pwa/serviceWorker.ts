/**
 * Service Worker Registration and Management
 * Handles PWA installation, updates, and offline capabilities
 */

// Cache names
const CACHE_NAME = "file-search-cache-v1";
const DOCUMENT_CACHE_NAME = "file-search-documents-v1";
const API_CACHE_NAME = "file-search-api-v1";

// URLs to cache on install
const STATIC_ASSETS = ["/", "/index.html", "/manifest.json"];

interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

/**
 * Register the service worker
 */
export async function registerServiceWorker(
  config?: ServiceWorkerConfig
): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service workers are not supported in this browser");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.onstatechange = () => {
        if (installingWorker.state === "installed") {
          if (navigator.serviceWorker.controller) {
            // New content is available
            console.log("New content is available; please refresh.");
            config?.onUpdate?.(registration);
          } else {
            // Content is cached for offline use
            console.log("Content is cached for offline use.");
            config?.onSuccess?.(registration);
          }
        }
      };
    };

    // Listen for online/offline events
    window.addEventListener("online", () => {
      console.log("Back online");
      config?.onOnline?.();
    });

    window.addEventListener("offline", () => {
      console.log("Gone offline");
      config?.onOffline?.();
    });

    return registration;
  } catch (error) {
    console.error("Service worker registration failed:", error);
    return null;
  }
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.unregister();
  } catch (error) {
    console.error("Service worker unregistration failed:", error);
    return false;
  }
}

/**
 * Check if the app is running in standalone mode (installed PWA)
 */
export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Request persistent storage for offline data
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage || !navigator.storage.persist) {
    return false;
  }

  try {
    const isPersisted = await navigator.storage.persist();
    console.log(`Persistent storage ${isPersisted ? "granted" : "denied"}`);
    return isPersisted;
  } catch (error) {
    console.error("Failed to request persistent storage:", error);
    return false;
  }
}

/**
 * Get storage estimate
 */
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
} | null> {
  if (!navigator.storage || !navigator.storage.estimate) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  } catch (error) {
    console.error("Failed to get storage estimate:", error);
    return null;
  }
}

export { CACHE_NAME, DOCUMENT_CACHE_NAME, API_CACHE_NAME, STATIC_ASSETS };
