/**
 * BulkActionToolbar component
 * Displays bulk action buttons when documents are selected
 * Requirements: 27.1, 27.2, 27.3
 */
import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  bulkDeleteDocuments,
  bulkMoveDocuments,
  bulkTagDocuments,
  bulkArchiveDocuments,
  bulkFavoriteDocuments,
} from "@/api/documents";
import { listFolders } from "@/api/folders";
import { listTags } from "@/api/tags";

interface BulkActionToolbarProps {
  selectedIds: string[];
  storageId: string;
  onClearSelection: () => void;
  onSelectAll: () => void;
  totalCount: number;
}

export function BulkActionToolbar({
  selectedIds,
  storageId,
  onClearSelection,
  onSelectAll,
  totalCount,
}: BulkActionToolbarProps) {
  const queryClient = useQueryClient();
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagAction, setTagAction] = useState<"add" | "replace">("add");

  // Fetch folders for move modal
  const { data: folders = [] } = useQuery({
    queryKey: ["folders", storageId],
    queryFn: () => listFolders(storageId),
    enabled: showMoveModal,
  });

  // Fetch tags for tag modal
  const { data: tags = [] } = useQuery({
    queryKey: ["tags", storageId],
    queryFn: () => listTags(storageId),
    enabled: showTagModal,
  });

  // Bulk delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => bulkDeleteDocuments(selectedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", storageId] });
      onClearSelection();
    },
  });

  // Bulk move mutation
  const moveMutation = useMutation({
    mutationFn: (folderId: string | null) =>
      bulkMoveDocuments(selectedIds, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", storageId] });
      onClearSelection();
      setShowMoveModal(false);
    },
  });

  // Bulk tag mutation
  const tagMutation = useMutation({
    mutationFn: () => bulkTagDocuments(selectedIds, selectedTags, tagAction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", storageId] });
      queryClient.invalidateQueries({ queryKey: ["tags", storageId] });
      onClearSelection();
      setShowTagModal(false);
      setSelectedTags([]);
    },
  });

  // Bulk archive mutation
  const archiveMutation = useMutation({
    mutationFn: () => bulkArchiveDocuments(selectedIds, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", storageId] });
      onClearSelection();
    },
  });

  // Bulk favorite mutation
  const favoriteMutation = useMutation({
    mutationFn: () => bulkFavoriteDocuments(selectedIds, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", storageId] });
      onClearSelection();
    },
  });

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Вы уверены, что хотите удалить ${selectedIds.length} документов?\n\nФайлы будут перемещены в корзину.`
    );
    if (confirmed) {
      deleteMutation.mutate();
    }
  };

  const handleMove = (folderId: string | null) => {
    moveMutation.mutate(folderId);
  };

  const handleTag = () => {
    if (selectedTags.length > 0) {
      tagMutation.mutate();
    }
  };

  const toggleTagSelection = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    );
  };

  const isLoading =
    deleteMutation.isPending ||
    moveMutation.isPending ||
    tagMutation.isPending ||
    archiveMutation.isPending ||
    favoriteMutation.isPending;

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 bg-sky-50 dark:bg-sky-900/20 rounded-lg border border-sky-200 dark:border-sky-800">
        <span className="text-sm font-medium text-sky-700 dark:text-sky-300">
          Выбрано: {selectedIds.length}
        </span>

        <div className="h-4 w-px bg-sky-300 dark:bg-sky-700 mx-1" />

        <button
          onClick={() =>
            selectedIds.length === totalCount
              ? onClearSelection()
              : onSelectAll()
          }
          className="px-3 py-1.5 text-sm text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/30 rounded-lg transition-colors"
        >
          {selectedIds.length === totalCount ? "Снять все" : "Выбрать все"}
        </button>

        <div className="h-4 w-px bg-sky-300 dark:bg-sky-700 mx-1" />

        {/* Move button */}
        <button
          onClick={() => setShowMoveModal(true)}
          disabled={isLoading}
          className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-sky-100 dark:hover:bg-sky-900/30 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
          title="Переместить"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          Переместить
        </button>

        {/* Tag button */}
        <button
          onClick={() => setShowTagModal(true)}
          disabled={isLoading}
          className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-sky-100 dark:hover:bg-sky-900/30 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
          title="Добавить теги"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          Теги
        </button>

        {/* Favorite button */}
        <button
          onClick={() => favoriteMutation.mutate()}
          disabled={isLoading}
          className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-sky-100 dark:hover:bg-sky-900/30 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
          title="Добавить в избранное"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
          В избранное
        </button>

        {/* Archive button */}
        <button
          onClick={() => archiveMutation.mutate()}
          disabled={isLoading}
          className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-sky-100 dark:hover:bg-sky-900/30 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
          title="Архивировать"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
            />
          </svg>
          Архивировать
        </button>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          disabled={isLoading}
          className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
          title="Удалить"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Удалить
        </button>

        <div className="flex-1" />

        {/* Cancel selection */}
        <button
          onClick={onClearSelection}
          className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Отменить
        </button>
      </div>

      {/* Move Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Переместить {selectedIds.length} документов
              </h3>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto">
              <button
                onClick={() => handleMove(null)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Корневая папка
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleMove(folder.id)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>
                  {folder.name}
                </button>
              ))}
              {folders.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  Нет папок. Создайте папку для перемещения документов.
                </p>
              )}
            </div>
            <div className="p-4 border-t dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setShowMoveModal(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tag Modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Добавить теги к {selectedIds.length} документам
              </h3>
            </div>
            <div className="p-4">
              {/* Action selector */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setTagAction("add")}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    tagAction === "add"
                      ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                >
                  Добавить
                </button>
                <button
                  onClick={() => setTagAction("replace")}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    tagAction === "replace"
                      ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                >
                  Заменить все
                </button>
              </div>

              {/* Tag list */}
              <div className="max-h-48 overflow-y-auto space-y-1">
                {tags.map((tag) => (
                  <label
                    key={tag.id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag.name)}
                      onChange={() => toggleTagSelection(tag.name)}
                      className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span
                      className="px-2 py-0.5 text-sm rounded-full"
                      style={{
                        backgroundColor: tag.color + "20",
                        color: tag.color,
                      }}
                    >
                      {tag.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({tag.documentCount})
                    </span>
                  </label>
                ))}
                {tags.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    Нет тегов. Теги будут созданы автоматически.
                  </p>
                )}
              </div>

              {/* New tag input */}
              <div className="mt-4">
                <input
                  type="text"
                  placeholder="Введите новый тег и нажмите Enter"
                  className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-sky-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const value = (e.target as HTMLInputElement).value.trim();
                      if (value && !selectedTags.includes(value)) {
                        setSelectedTags([...selectedTags, value]);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }
                  }}
                />
              </div>

              {/* Selected tags preview */}
              {selectedTags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 rounded-full flex items-center gap-1"
                    >
                      {tag}
                      <button
                        onClick={() => toggleTagSelection(tag)}
                        className="hover:text-sky-900 dark:hover:text-sky-100"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowTagModal(false);
                  setSelectedTags([]);
                }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Отмена
              </button>
              <button
                onClick={handleTag}
                disabled={selectedTags.length === 0 || tagMutation.isPending}
                className="px-4 py-2 text-sm bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {tagMutation.isPending ? "Применение..." : "Применить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
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
            <span className="text-gray-900 dark:text-white">Обработка...</span>
          </div>
        </div>
      )}
    </>
  );
}
