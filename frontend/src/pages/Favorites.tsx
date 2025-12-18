/**
 * Favorites page
 * Displays all favorite documents across all storages
 * Requirements: 24.1, 24.2, 24.3
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store";
import { DocumentCard } from "@/components/documents";
import {
  listFavorites,
  toggleFavorite,
  deleteDocument,
  getDocumentDownloadUrl,
} from "@/api/documents";
import type { Document } from "@/types";

type ViewMode = "grid" | "list";
type SortField = "name" | "created_at" | "updated_at" | "size";
type SortOrder = "asc" | "desc";

export function Favorites() {
  const navigate = useNavigate();
  const { storages } = useAppStore();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortField>("updated_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedStorageFilter, setSelectedStorageFilter] = useState<
    string | null
  >(null);

  // Load favorites
  useEffect(() => {
    loadFavorites();
  }, [sortBy, sortOrder, selectedStorageFilter]);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      setError(null);
      const favorites = await listFavorites({
        storageId: selectedStorageFilter || undefined,
        sortBy,
        order: sortOrder,
      });
      setDocuments(favorites);
    } catch (err) {
      setError("Не удалось загрузить избранные документы");
      console.error("Failed to load favorites:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentSelect = (document: Document) => {
    navigate(`/documents/${document.id}`);
  };

  const handleToggleFavorite = async (document: Document) => {
    try {
      await toggleFavorite(document.id, false);
      // Remove from list since it's no longer a favorite
      setDocuments((prev) => prev.filter((d) => d.id !== document.id));
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  const handleDelete = async (document: Document) => {
    if (!confirm(`Удалить "${document.name}"?`)) return;
    try {
      await deleteDocument(document.id);
      setDocuments((prev) => prev.filter((d) => d.id !== document.id));
    } catch (err) {
      console.error("Failed to delete document:", err);
    }
  };

  const handleDownload = (document: Document) => {
    const url = getDocumentDownloadUrl(document.id);
    window.open(url, "_blank");
  };

  const handleSortChange = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // Get storage name by ID
  const getStorageName = (storageId: string) => {
    const storage = storages.find((s) => s.id === storageId);
    return storage?.name || "Неизвестное хранилище";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg
              className="w-7 h-7 text-yellow-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            Избранное
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {documents.length} документов в избранном
          </p>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Storage Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">
            Хранилище:
          </label>
          <select
            value={selectedStorageFilter || ""}
            onChange={(e) => setSelectedStorageFilter(e.target.value || null)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
          >
            <option value="">Все хранилища</option>
            {storages.map((storage) => (
              <option key={storage.id} value={storage.id}>
                {storage.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">
            Сортировка:
          </label>
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value as SortField)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
          >
            <option value="updated_at">По дате изменения</option>
            <option value="created_at">По дате создания</option>
            <option value="name">По имени</option>
            <option value="size">По размеру</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={sortOrder === "asc" ? "По возрастанию" : "По убыванию"}
          >
            <svg
              className={`w-5 h-5 transition-transform ${
                sortOrder === "asc" ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === "grid"
                ? "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            title="Сетка"
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
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === "list"
                ? "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            title="Список"
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
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!error && documents.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Нет избранных документов
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Нажмите на звездочку на документе, чтобы добавить его в избранное
          </p>
        </div>
      )}

      {/* Documents Grid/List */}
      {documents.length > 0 && (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              : "space-y-2"
          }
        >
          {documents.map((doc) => (
            <div key={doc.id} className="relative">
              <DocumentCard
                document={doc}
                isSelected={false}
                selectionMode={false}
                viewMode={viewMode}
                onSelect={handleDocumentSelect}
                onToggleSelection={() => {}}
                onToggleFavorite={handleToggleFavorite}
                onDelete={handleDelete}
                onDownload={handleDownload}
              />
              {/* Storage badge */}
              {viewMode === "grid" && (
                <div className="absolute bottom-12 left-2 right-2">
                  <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full truncate block text-center">
                    {getStorageName(doc.storageId)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
