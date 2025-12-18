import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";
import { registerServiceWorker, initOfflineStorage } from "./lib/pwa";

// Initialize offline storage
initOfflineStorage().catch(console.error);

// Register service worker for PWA support
registerServiceWorker({
  onSuccess: () => {
    console.log("PWA: Service worker registered successfully");
  },
  onUpdate: () => {
    console.log("PWA: New content available, please refresh");
  },
  onOffline: () => {
    console.log("PWA: App is now offline");
  },
  onOnline: () => {
    console.log("PWA: App is back online");
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
