/**
 * TagManager component
 * Displays tag list with counts and allows adding/removing tags from documents
 * Requirements: 23.1, 23.2, 23.3
 */
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listTags,
  createTag,
  deleteTag,
  updateDocumentTags,
  type TagWithCount,
} from "@/api/tags";
import type { Document } from "@/types";

interface TagManagerProps {
  storageId: string;
  selectedDocument?: Document | null;
  onTagFilter?: (tagName: string | null) => void;
  activeTagFilter?: string | null;
}

// Predefined tag colors
const TAG_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
];

export function TagManager({
  storageId,
  selectedDocument,
  onTagFilter,
  activeTagFilter,
}: TagManagerProps) {
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch tags for the storage
  const {
    data: tags = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["tags", storageId],
    queryFn: () => listTags(storageId),
    enabled: !!storageId,
  });

  // Create tag mutation
  const createTagMutation = useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) =>
      createTag(storageId, name, color),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags", storageId] });
      setNewTagName("");
      setIsCreating(false);
    },
  });

  // Delete tag mutation
  const deleteTagMutation = useMutation({
    mutationFn: (tagId: string) => deleteTag(tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags", storageId] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  // Update document tags mutation
  const updateDocTagsMutation = useMutation({
    mutationFn: ({ docId, tagNames }: { docId: string; tagNames: string[] }) =>
      updateDocumentTags(docId, tagNames),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["tags", storageId] });
    },
  });

  // Close color picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(event.target as Node)
      ) {
        setShowColorPicker(false);
      }
    }

    if (showColorPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showColorPicker]);

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagName.trim()) {
      createTagMutation.mutate({ name: newTagName.trim(), color: newTagColor });
    }
  };

  const handleDeleteTag = (tag: TagWithCount) => {
    if (
      window.confirm(
        `Удалить тег "${tag.name}"? Он будет удален со всех документов.`
      )
    ) {
      deleteTagMutation.mutate(tag.id);
      // Clear filter if deleting the active filter tag
      if (activeTagFilter === tag.name && onTagFilter) {
        onTagFilter(null);
      }
    }
  };

  const handleTagClick = (tag: TagWithCount) => {
    if (onTagFilter) {
      // Toggle filter
      if (activeTagFilter === tag.name) {
        onTagFilter(null);
      } else {
        onTagFilter(tag.name);
      }
    }
  };

  const handleToggleDocumentTag = (tag: TagWithCount) => {
    if (!selectedDocument) return;

    const currentTagNames = selectedDocument.tags.map((t) => t.name);
    const hasTag = currentTagNames.includes(tag.name);

    const newTagNames = hasTag
      ? currentTagNames.filter((n) => n !== tag.name)
      : [...currentTagNames, tag.name];

    updateDocTagsMutation.mutate({
      docId: selectedDocument.id,
      tagNames: newTagNames,
    });
  };

  const isTagOnDocument = (tag: TagWithCount): boolean => {
    if (!selectedDocument) return false;
    return selectedDocument.tags.some((t) => t.name === tag.name);
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 dark:text-red-400">
        Ошибка загрузки тегов
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900 dark:text-white">Теги</h3>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
          >
            + Добавить
          </button>
        )}
      </div>

      {/* Create tag form */}
      {isCreating && (
        <form onSubmit={handleCreateTag} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Название тега"
              className="flex-1 px-3 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              autoFocus
            />
            <div className="relative" ref={colorPickerRef}>
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-8 h-8 rounded-lg border dark:border-gray-600"
                style={{ backgroundColor: newTagColor }}
                title="Выбрать цвет"
              />
              {showColorPicker && (
                <div className="absolute right-0 top-10 z-10 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 grid grid-cols-4 gap-1">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        setNewTagColor(color);
                        setShowColorPicker(false);
                      }}
                      className={`w-6 h-6 rounded ${
                        newTagColor === color
                          ? "ring-2 ring-offset-1 ring-gray-400"
                          : ""
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!newTagName.trim() || createTagMutation.isPending}
              className="flex-1 px-3 py-1.5 text-sm bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createTagMutation.isPending ? "Создание..." : "Создать"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setNewTagName("");
              }}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      {/* Selected document info */}
      {selectedDocument && (
        <div className="text-xs text-gray-500 dark:text-gray-400 pb-2 border-b dark:border-gray-700">
          Выбран: {selectedDocument.name}
        </div>
      )}

      {/* Tag list */}
      <div className="space-y-1">
        {tags.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Нет тегов. Создайте первый тег.
          </p>
        ) : (
          tags.map((tag) => (
            <div
              key={tag.id}
              className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                activeTagFilter === tag.name
                  ? "bg-sky-100 dark:bg-sky-900/30"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {/* Tag checkbox for document */}
              {selectedDocument && (
                <input
                  type="checkbox"
                  checked={isTagOnDocument(tag)}
                  onChange={() => handleToggleDocumentTag(tag)}
                  disabled={updateDocTagsMutation.isPending}
                  className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                />
              )}

              {/* Tag color indicator */}
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: tag.color }}
              />

              {/* Tag name and count - clickable for filtering */}
              <button
                onClick={() => handleTagClick(tag)}
                className="flex-1 flex items-center justify-between text-left"
              >
                <span
                  className={`text-sm ${
                    activeTagFilter === tag.name
                      ? "font-medium text-sky-700 dark:text-sky-300"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {tag.name}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {tag.documentCount}
                </span>
              </button>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTag(tag);
                }}
                disabled={deleteTagMutation.isPending}
                className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                title="Удалить тег"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Clear filter button */}
      {activeTagFilter && onTagFilter && (
        <button
          onClick={() => onTagFilter(null)}
          className="w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg"
        >
          Сбросить фильтр
        </button>
      )}
    </div>
  );
}
