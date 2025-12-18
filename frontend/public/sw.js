/**
 * Service Worker for File Search RAG PWA
 * Handles offline caching, background sync, and push notifications
 */

const CACHE_NAME = "file-search-cache-v1";
const DOCUMENT_CACHE_NAME = "file-search-documents-v1";
const API_CACHE_NAME = "file-search-api-v1";

// Static assets to cache on install
const STATIC_ASSETS = ["/", "/index.html", "/manifest.json"];

// API routes to cache
const CACHEABLE_API_ROUTES = [
  "/api/storage",
  "/api/documents",
  "/api/folders",
  "/api/tags",
];

/**
 * Install event - cache static assets
 */
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log("[SW] Service worker installed");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("[SW] Failed to cache static assets:", error);
      })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Delete old cache versions
              return (
                name.startsWith("file-search-") &&
                name !== CACHE_NAME &&
                name !== DOCUMENT_CACHE_NAME &&
                name !== API_CACHE_NAME
              );
            })
            .map((name) => {
              console.log("[SW] Deleting old cache:", name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log("[SW] Service worker activated");
        return self.clients.claim();
      })
  );
});

/**
 * Fetch event - serve from cache or network
 */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests for caching
  if (request.method !== "GET") {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets and navigation
  event.respondWith(handleStaticRequest(request));
});

/**
 * Handle API requests with network-first strategy
 */
async function handleApiRequest(request) {
  const url = new URL(request.url);

  // Check if this is a cacheable API route
  const isCacheable = CACHEABLE_API_ROUTES.some((route) =>
    url.pathname.startsWith(route)
  );

  try {
    // Try network first
    const networkResponse = await fetch(request);

    // Cache successful GET responses for cacheable routes
    if (networkResponse.ok && isCacheable) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log("[SW] Network request failed, trying cache:", url.pathname);

    // Fall back to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline response for API
    return new Response(
      JSON.stringify({
        error: "Offline",
        message: "You are currently offline. This data is not available.",
      }),
      {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handle static requests with cache-first strategy
 */
async function handleStaticRequest(request) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Fetch in background to update cache
    fetchAndCache(request);
    return cachedResponse;
  }

  try {
    // Fetch from network
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log("[SW] Network request failed:", request.url);

    // For navigation requests, return the cached index.html
    if (request.mode === "navigate") {
      const indexResponse = await caches.match("/index.html");
      if (indexResponse) {
        return indexResponse;
      }
    }

    // Return offline page or error
    return new Response("Offline", {
      status: 503,
      statusText: "Service Unavailable",
    });
  }
}

/**
 * Fetch and update cache in background
 */
async function fetchAndCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response);
    }
  } catch (error) {
    // Silently fail - we already have cached version
  }
}

/**
 * Background sync event
 */
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync event:", event.tag);

  if (event.tag === "sync-documents") {
    event.waitUntil(syncDocuments());
  }
});

/**
 * Sync documents with server
 */
async function syncDocuments() {
  console.log("[SW] Syncing documents...");

  // Notify clients to perform sync
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: "SYNC_REQUIRED",
      timestamp: Date.now(),
    });
  });
}

/**
 * Push notification event
 */
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received");

  const data = event.data?.json() || {};
  const title = data.title || "File Search RAG";
  const options = {
    body: data.body || "You have a new notification",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    data: data.data || {},
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * Notification click event
 */
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked");

  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        // Open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

/**
 * Message event - handle messages from clients
 */
self.addEventListener("message", (event) => {
  console.log("[SW] Message received:", event.data);

  const { type, payload } = event.data || {};

  switch (type) {
    case "SKIP_WAITING":
      self.skipWaiting();
      break;

    case "CACHE_DOCUMENT":
      cacheDocumentContent(payload);
      break;

    case "CLEAR_CACHE":
      clearAllCaches();
      break;

    default:
      console.log("[SW] Unknown message type:", type);
  }
});

/**
 * Cache document content
 */
async function cacheDocumentContent(document) {
  if (!document || !document.id) return;

  try {
    const cache = await caches.open(DOCUMENT_CACHE_NAME);
    const response = new Response(JSON.stringify(document), {
      headers: { "Content-Type": "application/json" },
    });
    await cache.put(`/api/documents/${document.id}`, response);
    console.log("[SW] Document cached:", document.id);
  } catch (error) {
    console.error("[SW] Failed to cache document:", error);
  }
}

/**
 * Clear all caches
 */
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name.startsWith("file-search-"))
        .map((name) => caches.delete(name))
    );
    console.log("[SW] All caches cleared");
  } catch (error) {
    console.error("[SW] Failed to clear caches:", error);
  }
}
