/**
 * StorageList component
 * Displays list of storages with metadata and selection handling
 * Requirements: 2.2, 2.3
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store";
import { listStorages, deleteStorage, exportStorage } from "@/api/storage";
import { StorageCard } from "./StorageCard";
import type { Storage } from "@/types";

interface StorageListProps {
  onCreateClick?: () => void;
}

export function StorageList({ onCreateClick }: StorageListProps) {
  const queryClient = useQueryClient();
  const { currentStorageId, setCurrentStorageId, setStorages } = useAppStore();

  // Fetch storages
  const {
    data: storages = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["storages"],
    queryFn: () => listStorages("created_at", "desc"),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update global store when storages change
  if (storages.length > 0) {
    setStorages(storages);
  }

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (storageId: string) => deleteStorage(storageId),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["storages"] });
      // Clear selection if deleted storage was selected
      if (currentStorageId === deletedId) {
        setCurrentStorageId(null);
      }
    },
  });

  // Handle storage selection
  const handleSelect = (storage: Storage) => {
    setCurrentStorageId(storage.id);
  };

  // Handle storage deletion with confirmation
  const handleDelete = (storage: Storage) => {
    const confirmed = window.confirm(
      `Вы уверены, что хотите удалить хранилище "${storage.name}"?\n\nВсе документы в этом хранилище будут удалены безвозвратно.`
    );

    if (confirmed) {
      deleteMutation.mutate(storage.id);
    }
  };

  // Handle storage export
  // Requirements: 33.1, 33.2, 33.3
  const handleExport = async (storage: Storage) => {
    try {
      await exportStorage(storage.id, storage.name);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Не удалось экспортировать хранилище";
      alert(message);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Хранилища
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t dark:border-gray-700">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 text-red-500">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Ошибка загрузки
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Не удалось загрузить список хранилищ
        </p>
      </div>
    );
  }

  // Empty state
  if (storages.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Нет хранилищ
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Создайте первое хранилище для начала работы
        </p>
        {onCreateClick && (
          <button onClick={onCreateClick} className="btn btn-primary">
            Создать хранилище
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Хранилища
          <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
            ({storages.length})
          </span>
        </h2>
        {onCreateClick && (
          <button
            onClick={onCreateClick}
            className="btn btn-primary flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Создать
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {storages.map((storage) => (
          <StorageCard
            key={storage.id}
            storage={storage}
            isSelected={currentStorageId === storage.id}
            onSelect={handleSelect}
            onDelete={handleDelete}
            onExport={handleExport}
          />
        ))}
      </div>

      {/* Deletion loading overlay */}
      {deleteMutation.isPending && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center gap-3">
            <svg
              className="animate-spin h-5 w-5 text-sky-500"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-gray-900 dark:text-white">Удаление...</span>
          </div>
        </div>
      )}
    </div>
  );
}
