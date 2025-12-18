/**
 * Offline Settings Component
 * Allows users to configure offline mode and manage cached documents
 */

import { useState } from "react";
import {
  Cloud,
  CloudOff,
  Trash2,
  HardDrive,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { usePWA } from "@/hooks/usePWA";

interface OfflineSettingsProps {
  className?: string;
}

export function OfflineSettings({ className = "" }: OfflineSettingsProps) {
  const {
    isOnline,
    offlineModeEnabled,
    syncStatus,
    pendingChangesCount,
    storageInfo,
    storageEstimate,
    enableOfflineMode,
    disableOfflineMode,
    syncNow,
    clearCache,
  } = usePWA();

  const [isClearing, setIsClearing] = useState(false);

  const handleToggleOfflineMode = async () => {
    if (offlineModeEnabled) {
      await disableOfflineMode();
    } else {
      await enableOfflineMode();
    }
  };

  const handleClearCache = async () => {
    if (
      confirm("Вы уверены, что хотите очистить все кэшированные документы?")
    ) {
      setIsClearing(true);
      try {
        await clearCache();
      } finally {
        setIsClearing(false);
      }
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Б";
    const k = 1024;
    const sizes = ["Б", "КБ", "МБ", "ГБ"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const usagePercent = storageEstimate
    ? Math.round((storageEstimate.usage / storageEstimate.quota) * 100)
    : 0;

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Cloud className="w-5 h-5" />
        Офлайн режим
      </h3>

      {/* Connection status */}
      <div className="mb-6 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-700 dark:text-green-400">
                Подключено к сети
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <span className="text-amber-700 dark:text-amber-400">
                Нет подключения к сети
              </span>
            </>
          )}
        </div>
      </div>

      {/* Offline mode toggle */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              Офлайн режим
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Кэшировать документы для работы без интернета
            </p>
          </div>
          <button
            onClick={handleToggleOfflineMode}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              offlineModeEnabled
                ? "bg-blue-600"
                : "bg-gray-200 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                offlineModeEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Storage info */}
      {storageInfo && (
        <div className="mb-6 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Кэшированные данные
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Документов</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {storageInfo.documentCount}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Размер</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {formatBytes(storageInfo.totalSize)}
              </p>
            </div>
          </div>

          {storageEstimate && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>Использовано хранилище</span>
                <span>{usagePercent}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatBytes(storageEstimate.usage)} из{" "}
                {formatBytes(storageEstimate.quota)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pending changes */}
      {pendingChangesCount > 0 && (
        <div className="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm text-amber-700 dark:text-amber-300">
                {pendingChangesCount} несинхронизированных изменений
              </span>
            </div>
            {isOnline && (
              <button
                onClick={syncNow}
                disabled={syncStatus === "syncing"}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3 h-3 ${
                    syncStatus === "syncing" ? "animate-spin" : ""
                  }`}
                />
                {syncStatus === "syncing"
                  ? "Синхронизация..."
                  : "Синхронизировать"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleClearCache}
          disabled={isClearing || storageInfo?.documentCount === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          {isClearing ? "Очистка..." : "Очистить кэш"}
        </button>
      </div>

      {/* Help text */}
      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Офлайн режим позволяет просматривать кэшированные документы без
        подключения к интернету. Изменения будут синхронизированы при
        восстановлении соединения.
      </p>
    </div>
  );
}
