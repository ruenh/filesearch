/**
 * Background Sync Manager
 * Handles syncing offline changes when connection is restored
 */

import {
  getPendingChanges,
  removePendingChange,
  updatePendingChangeRetry,
  type PendingChange,
} from "./offlineStorage";
import { apiClient } from "@/api/client";

const MAX_RETRY_COUNT = 3;
const SYNC_INTERVAL = 30000; // 30 seconds

type SyncStatus = "idle" | "syncing" | "error";
type SyncEventType =
  | "syncStart"
  | "syncComplete"
  | "syncError"
  | "changesSynced";

interface SyncEvent {
  type: SyncEventType;
  data?: unknown;
}

type SyncEventListener = (event: SyncEvent) => void;

class BackgroundSyncManager {
  private syncStatus: SyncStatus = "idle";
  private syncInterval: number | null = null;
  private listeners: Set<SyncEventListener> = new Set();

  /**
   * Start the background sync process
   */
  start(): void {
    if (this.syncInterval) return;

    // Initial sync
    this.sync();

    // Set up periodic sync
    this.syncInterval = window.setInterval(() => {
      if (navigator.onLine) {
        this.sync();
      }
    }, SYNC_INTERVAL);

    // Listen for online event
    window.addEventListener("online", this.handleOnline);
  }

  /**
   * Stop the background sync process
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    window.removeEventListener("online", this.handleOnline);
  }

  /**
   * Handle coming back online
   */
  private handleOnline = (): void => {
    console.log("Connection restored, syncing changes...");
    this.sync();
  };

  /**
   * Perform sync of pending changes
   */
  async sync(): Promise<void> {
    if (this.syncStatus === "syncing" || !navigator.onLine) {
      return;
    }

    this.syncStatus = "syncing";
    this.emit({ type: "syncStart" });

    try {
      const pendingChanges = await getPendingChanges();

      if (pendingChanges.length === 0) {
        this.syncStatus = "idle";
        this.emit({ type: "syncComplete", data: { synced: 0 } });
        return;
      }

      console.log(`Syncing ${pendingChanges.length} pending changes...`);

      let syncedCount = 0;
      const errors: Array<{ change: PendingChange; error: Error }> = [];

      for (const change of pendingChanges) {
        try {
          await this.processChange(change);
          await removePendingChange(change.id);
          syncedCount++;
        } catch (error) {
          console.error(`Failed to sync change ${change.id}:`, error);

          if (change.retryCount >= MAX_RETRY_COUNT) {
            // Remove after max retries
            await removePendingChange(change.id);
            errors.push({ change, error: error as Error });
          } else {
            await updatePendingChangeRetry(change.id);
          }
        }
      }

      this.syncStatus = errors.length > 0 ? "error" : "idle";
      this.emit({
        type: "syncComplete",
        data: { synced: syncedCount, errors: errors.length },
      });

      if (syncedCount > 0) {
        this.emit({ type: "changesSynced", data: { count: syncedCount } });
      }
    } catch (error) {
      console.error("Sync failed:", error);
      this.syncStatus = "error";
      this.emit({ type: "syncError", data: { error } });
    }
  }

  /**
   * Process a single pending change
   */
  private async processChange(change: PendingChange): Promise<void> {
    switch (change.type) {
      case "create":
        await this.syncCreate(change);
        break;
      case "update":
        await this.syncUpdate(change);
        break;
      case "delete":
        await this.syncDelete(change);
        break;
      default:
        console.warn(`Unknown change type: ${change.type}`);
    }
  }

  /**
   * Sync a create operation
   */
  private async syncCreate(change: PendingChange): Promise<void> {
    const data = change.data as {
      storageId: string;
      name: string;
      content: string;
    };
    await apiClient.post("/documents", data);
  }

  /**
   * Sync an update operation
   */
  private async syncUpdate(change: PendingChange): Promise<void> {
    const data = change.data as { content: string; name?: string };
    await apiClient.put(`/documents/${change.documentId}`, data);
  }

  /**
   * Sync a delete operation
   */
  private async syncDelete(change: PendingChange): Promise<void> {
    await apiClient.delete(`/documents/${change.documentId}`);
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return this.syncStatus;
  }

  /**
   * Add event listener
   */
  addEventListener(listener: SyncEventListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: SyncEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: SyncEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }
}

// Singleton instance
export const backgroundSync = new BackgroundSyncManager();

export type { SyncStatus, SyncEvent, SyncEventType };
