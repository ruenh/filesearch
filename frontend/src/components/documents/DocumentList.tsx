/**
 * DocumentList component
 * Displays list of documents with grid/list view toggle and sorting controls
 * Requirements: 8.3, 27.1, 27.2, 27.3, 51.1
 */
import { useCallback, useRef, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store";
import {
  listDocuments,
  updateDocument,
  deleteDocument,
  toggleArchive,
  type SortField,
  type SortOrder,
} from "@/api/documents";
import { DocumentCard } from "./DocumentCard";
import { BulkActionToolbar } from "./BulkActionToolbar";
import { ShareModal } from "@/components/collaboration/ShareModal";
import type { Document } from "@/types";

interface DocumentListProps {
  storageId: string;
  folderId?: string;
  tagFilter?: string | null;
  onDocumentSelect?: (document: Document) => void;
  onDocumentTagEdit?: (document: Document | null) => void;
  onUploadClick?: () => void;
}

const ITEMS_PER_PAGE = 20;

export function DocumentList({
  storageId,
  folderId,
  tagFilter,
  onDocumentSelect,
  onDocumentTagEdit,
  onUploadClick,
}: DocumentListProps) {
  const queryClient = useQueryClient();
  const {
    viewMode,
    setViewMode,
    selectionMode,
    setSelectionMode,
    selectedDocumentIds,
    toggleDocumentSelection,
    clearSelection,
    selectAll,
  } = useAppStore();

  const [sortBy, setSortBy] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const [shareDocument, setShareDocument] = useState<Document | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch documents
  const {
    data: allDocuments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["documents", storageId, folderId, tagFilter, sortBy, sortOrder],
    queryFn: () =>
      listDocuments({
        storageId,
        folderId,
        tag: tagFilter || undefined,
        sortBy,
        order: sortOrder,
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Paginated documents for display
  const documents = allDocuments.slice(0, displayCount);
  const hasMore = displayCount < allDocuments.length;

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading]);

  // Reset display count when storage/folder changes
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [storageId, folderId]);

  // Update document mutation (for favorites)
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { isFavorite?: boolean };
    }) => updateDocument(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", storageId] });
    },
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", storageId] });
      clearSelection();
    },
  });

  // Archive document mutation
  const archiveMutation = useMutation({
    mutationFn: (documentId: string) => toggleArchive(documentId, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", storageId] });
    },
  });

  // Handlers
  const handleDocumentSelect = useCallback(
    (document: Document) => {
      onDocumentSelect?.(document);
    },
    [onDocumentSelect]
  );

  const handleToggleSelection = useCallback(
    (document: Document) => {
      toggleDocumentSelection(document.id);
    },
    [toggleDocumentSelection]
  );

  const handleToggleFavorite = useCallback(
    (document: Document) => {
      updateMutation.mutate({
        id: document.id,
        data: { isFavorite: !document.isFavorite },
      });
    },
    [updateMutation]
  );

  const handleDelete = useCallback(
    (document: Document) => {
      const confirmed = window.confirm(
        `Вы уверены, что хотите удалить "${document.name}"?\n\nФайл будет перемещен в корзину.`
      );
      if (confirmed) {
        deleteMutation.mutate(document.id);
      }
    },
    [deleteMutation]
  );

  const handleDownload = useCallback((document: Document) => {
    // TODO: Implement download functionality
    alert(`Скачивание "${document.name}" пока не реализовано`);
  }, []);

  const handleArchive = useCallback(
    (document: Document) => {
      archiveMutation.mutate(document.id);
    },
    [archiveMutation]
  );

  const handleManageTags = useCallback(
    (document: Document) => {
      onDocumentTagEdit?.(document);
    },
    [onDocumentTagEdit]
  );

  const handleShare = useCallback((document: Document) => {
    setShareDocument(document);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
        </div>
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              : "space-y-2"
          }
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="w-16 h-16 mx-auto mb-3 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto" />
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
          Не удалось загрузить список документов
        </p>
      </div>
    );
  }

  // Empty state
  if (allDocuments.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Нет документов
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Загрузите первый документ для начала работы
        </p>
        {onUploadClick && (
          <button onClick={onUploadClick} className="btn btn-primary">
            Загрузить файл
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Action Toolbar - shown when documents are selected */}
      {selectionMode && selectedDocumentIds.length > 0 && (
        <BulkActionToolbar
          selectedIds={selectedDocumentIds}
          storageId={storageId}
          onClearSelection={() => {
            clearSelection();
            setSelectionMode(false);
          }}
          onSelectAll={() => selectAll(documents.map((d) => d.id))}
          totalCount={documents.length}
        />
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {allDocuments.length} документов
          </span>

          {/* Selection mode toggle */}
          <button
            onClick={() => setSelectionMode(!selectionMode)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              selectionMode
                ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            {selectionMode ? "Отменить выбор" : "Выбрать"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort dropdown */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split("-") as [
                SortField,
                SortOrder
              ];
              setSortBy(field);
              setSortOrder(order);
            }}
            className="px-3 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-sky-500"
          >
            <option value="created_at-desc">Новые</option>
            <option value="created_at-asc">Старые</option>
            <option value="name-asc">По имени (А-Я)</option>
            <option value="name-desc">По имени (Я-А)</option>
            <option value="size-desc">По размеру (большие)</option>
            <option value="size-asc">По размеру (маленькие)</option>
            <option value="updated_at-desc">Недавно изменённые</option>
          </select>

          {/* View mode toggle */}
          <div className="flex items-center border rounded-lg dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 transition-colors ${
                viewMode === "grid"
                  ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              aria-label="Сетка"
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
              className={`p-2 transition-colors ${
                viewMode === "list"
                  ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              aria-label="Список"
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

          {/* Upload button */}
          {onUploadClick && (
            <button
              onClick={onUploadClick}
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
              Загрузить
            </button>
          )}
        </div>
      </div>

      {/* Document grid/list */}
      <div
        className={
          viewMode === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            : "space-y-2"
        }
      >
        {documents.map((document) => (
          <DocumentCard
            key={document.id}
            document={document}
            isSelected={selectedDocumentIds.includes(document.id)}
            selectionMode={selectionMode}
            viewMode={viewMode}
            onSelect={handleDocumentSelect}
            onToggleSelection={handleToggleSelection}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDelete}
            onDownload={handleDownload}
            onManageTags={onDocumentTagEdit ? handleManageTags : undefined}
            onArchive={handleArchive}
            onShare={handleShare}
          />
        ))}
      </div>

      {/* Load more trigger for infinite scroll */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
        </div>
      )}

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

      {/* Share Modal */}
      {shareDocument && (
        <ShareModal
          isOpen={!!shareDocument}
          onClose={() => setShareDocument(null)}
          documentId={shareDocument.id}
          documentName={shareDocument.name}
        />
      )}
    </div>
  );
}
