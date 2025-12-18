/**
 * Offline Indicator Component
 * Shows offline status and sync information
 */

import {
  Wifi,
  WifiOff,
  RefreshCw,
  Cloud,
  CloudOff,
  Download,
} from "lucide-react";
import { usePWA } from "@/hooks/usePWA";

export function OfflineIndicator() {
  const {
    isOnline,
    offlineModeEnabled,
    syncStatus,
    pendingChangesCount,
    syncNow,
    updateAvailable,
    updateServiceWorker,
  } = usePWA();

  // Don't show anything if online and no pending changes
  if (isOnline && pendingChangesCount === 0 && !updateAvailable) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {/* Update available banner */}
      {updateAvailable && (
        <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <Download className="w-4 h-4" />
          <span className="text-sm">Доступно обновление</span>
          <button
            onClick={updateServiceWorker}
            className="ml-2 px-2 py-1 bg-white text-blue-500 rounded text-xs font-medium hover:bg-blue-50"
          >
            Обновить
          </button>
        </div>
      )}

      {/* Offline indicator */}
      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm">Вы офлайн</span>
          {offlineModeEnabled && (
            <span className="text-xs opacity-75">• Офлайн режим активен</span>
          )}
        </div>
      )}

      {/* Pending changes indicator */}
      {pendingChangesCount > 0 && (
        <div className="bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          {syncStatus === "syncing" ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Синхронизация...</span>
            </>
          ) : (
            <>
              <CloudOff className="w-4 h-4" />
              <span className="text-sm">
                {pendingChangesCount} несинхронизированных изменений
              </span>
              {isOnline && (
                <button
                  onClick={syncNow}
                  className="ml-2 px-2 py-1 bg-white text-gray-800 rounded text-xs font-medium hover:bg-gray-100"
                >
                  Синхронизировать
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact offline status for header
 */
export function OfflineStatusBadge() {
  const { isOnline, offlineModeEnabled, pendingChangesCount, syncStatus } =
    usePWA();

  if (isOnline && pendingChangesCount === 0) {
    if (offlineModeEnabled) {
      return (
        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <Cloud className="w-4 h-4" />
          <span className="text-xs">Офлайн режим</span>
        </div>
      );
    }
    return null;
  }

  return (
    <div
      className={`flex items-center gap-1 ${
        isOnline
          ? "text-gray-600 dark:text-gray-400"
          : "text-amber-600 dark:text-amber-400"
      }`}
    >
      {!isOnline ? (
        <WifiOff className="w-4 h-4" />
      ) : syncStatus === "syncing" ? (
        <RefreshCw className="w-4 h-4 animate-spin" />
      ) : (
        <Wifi className="w-4 h-4" />
      )}
      {pendingChangesCount > 0 && (
        <span className="text-xs bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 rounded-full">
          {pendingChangesCount}
        </span>
      )}
    </div>
  );
}
