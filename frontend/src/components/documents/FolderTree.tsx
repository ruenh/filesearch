/**
 * FolderTree component
 * Hierarchical tree view with drag & drop support and breadcrumb navigation
 * Requirements: 22.2, 22.3, 28.1, 28.2, 28.3
 */
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFolderTree,
  createFolder,
  updateFolder,
  deleteFolder,
  getFolderBreadcrumb,
} from "@/api/folders";
import { updateDocument } from "@/api/documents";
import type { Folder } from "@/types";

interface FolderTreeProps {
  storageId: string;
  selectedFolderId?: string | null;
  onFolderSelect?: (folderId: string | null) => void;
  showBreadcrumb?: boolean;
}

interface FolderNodeProps {
  folder: Folder;
  level: number;
  selectedFolderId?: string | null;
  expandedFolders: Set<string>;
  onToggleExpand: (folderId: string) => void;
  onSelect: (folderId: string) => void;
  onRename: (folderId: string, newName: string) => void;
  onDelete: (folderId: string) => void;
  onDrop: (documentId: string, folderId: string) => void;
}

function FolderNode({
  folder,
  level,
  selectedFolderId,
  expandedFolders,
  onToggleExpand,
  onSelect,
  onRename,
  onDelete,
  onDrop,
}: FolderNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const [isDragOver, setIsDragOver] = useState(false);

  const isExpanded = expandedFolders.has(folder.id);
  const isSelected = selectedFolderId === folder.id;
  const hasChildren = folder.children && folder.children.length > 0;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const documentId = e.dataTransfer.getData("documentId");
    if (documentId) {
      onDrop(documentId, folder.id);
    }
  };

  const handleRenameSubmit = () => {
    if (editName.trim() && editName !== folder.name) {
      onRename(folder.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      setEditName(folder.name);
      setIsEditing(false);
    }
  };

  return (
    <div>
      <div
        className={`
          flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer
          transition-colors group
          ${
            isSelected
              ? "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300"
              : "hover:bg-gray-100 dark:hover:bg-gray-700"
          }
          ${
            isDragOver ? "ring-2 ring-sky-500 bg-sky-50 dark:bg-sky-900/20" : ""
          }
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(folder.id)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Expand/collapse button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(folder.id);
          }}
          className={`w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
            !hasChildren ? "invisible" : ""
          }`}
        >
          <svg
            className={`w-4 h-4 transition-transform ${
              isExpanded ? "rotate-90" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        {/* Folder icon */}
        <svg
          className={`w-5 h-5 ${
            isSelected ? "text-sky-600 dark:text-sky-400" : "text-yellow-500"
          }`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          {isExpanded ? (
            <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2z" />
          ) : (
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          )}
        </svg>

        {/* Folder name */}
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleKeyDown}
            className="flex-1 px-1 py-0.5 text-sm bg-white dark:bg-gray-800 border rounded focus:ring-2 focus:ring-sky-500"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 text-sm truncate">{folder.name}</span>
        )}

        {/* Actions */}
        <div className="hidden group-hover:flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            title="Переименовать"
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
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Удалить папку "${folder.name}"?`)) {
                onDelete(folder.id);
              }
            }}
            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
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
          </button>
        </div>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {folder.children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              expandedFolders={expandedFolders}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({
  storageId,
  selectedFolderId,
  onFolderSelect,
  showBreadcrumb = true,
}: FolderTreeProps) {
  const queryClient = useQueryClient();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Fetch folder tree
  const { data: folders = [], isLoading } = useQuery({
    queryKey: ["folders", storageId],
    queryFn: () => getFolderTree(storageId),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch breadcrumb for selected folder
  const { data: breadcrumb = [] } = useQuery({
    queryKey: ["folder-breadcrumb", selectedFolderId],
    queryFn: () =>
      selectedFolderId
        ? getFolderBreadcrumb(selectedFolderId)
        : Promise.resolve([]),
    enabled: !!selectedFolderId && showBreadcrumb,
  });

  // Create folder mutation
  const createMutation = useMutation({
    mutationFn: (name: string) =>
      createFolder(name, storageId, selectedFolderId || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders", storageId] });
      setIsCreating(false);
      setNewFolderName("");
    },
  });

  // Update folder mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateFolder(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders", storageId] });
    },
  });

  // Delete folder mutation
  const deleteMutation = useMutation({
    mutationFn: (folderId: string) => deleteFolder(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders", storageId] });
      if (selectedFolderId) {
        onFolderSelect?.(null);
      }
    },
  });

  // Move document to folder mutation
  const moveDocumentMutation = useMutation({
    mutationFn: ({
      documentId,
      folderId,
    }: {
      documentId: string;
      folderId: string;
    }) => updateDocument(documentId, { folderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", storageId] });
    },
  });

  const handleToggleExpand = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (folderId: string) => {
      onFolderSelect?.(folderId === selectedFolderId ? null : folderId);
    },
    [onFolderSelect, selectedFolderId]
  );

  const handleRename = useCallback(
    (folderId: string, newName: string) => {
      updateMutation.mutate({ id: folderId, name: newName });
    },
    [updateMutation]
  );

  const handleDelete = useCallback(
    (folderId: string) => {
      deleteMutation.mutate(folderId);
    },
    [deleteMutation]
  );

  const handleDrop = useCallback(
    (documentId: string, folderId: string) => {
      moveDocumentMutation.mutate({ documentId, folderId });
    },
    [moveDocumentMutation]
  );

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createMutation.mutate(newFolderName.trim());
    }
  };

  const handleCreateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreateFolder();
    } else if (e.key === "Escape") {
      setIsCreating(false);
      setNewFolderName("");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Breadcrumb navigation */}
      {showBreadcrumb && breadcrumb.length > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 dark:text-gray-400 overflow-x-auto">
          <button
            onClick={() => onFolderSelect?.(null)}
            className="hover:text-sky-600 dark:hover:text-sky-400 whitespace-nowrap"
          >
            Корень
          </button>
          {breadcrumb.map((item, index) => (
            <span key={item.id} className="flex items-center gap-1">
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <button
                onClick={() => onFolderSelect?.(item.id)}
                className={`hover:text-sky-600 dark:hover:text-sky-400 whitespace-nowrap ${
                  index === breadcrumb.length - 1
                    ? "font-medium text-gray-900 dark:text-white"
                    : ""
                }`}
              >
                {item.name}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Root folder option */}
      <div
        className={`
          flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer
          transition-colors
          ${
            !selectedFolderId
              ? "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300"
              : "hover:bg-gray-100 dark:hover:bg-gray-700"
          }
        `}
        onClick={() => onFolderSelect?.(null)}
      >
        <svg
          className="w-5 h-5 text-gray-500"
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
        <span className="text-sm">Все документы</span>
      </div>

      {/* Folder tree */}
      <div className="space-y-0.5">
        {folders.map((folder) => (
          <FolderNode
            key={folder.id}
            folder={folder}
            level={0}
            selectedFolderId={selectedFolderId}
            expandedFolders={expandedFolders}
            onToggleExpand={handleToggleExpand}
            onSelect={handleSelect}
            onRename={handleRename}
            onDelete={handleDelete}
            onDrop={handleDrop}
          />
        ))}
      </div>

      {/* Create new folder */}
      {isCreating ? (
        <div className="flex items-center gap-2 px-2 py-1.5">
          <svg
            className="w-5 h-5 text-yellow-500"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={() => {
              if (!newFolderName.trim()) {
                setIsCreating(false);
              }
            }}
            onKeyDown={handleCreateKeyDown}
            placeholder="Имя папки"
            className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-800 border rounded focus:ring-2 focus:ring-sky-500"
            autoFocus
          />
          <button
            onClick={handleCreateFolder}
            disabled={!newFolderName.trim() || createMutation.isPending}
            className="p-1 rounded bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50"
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
                d="M5 13l4 4L19 7"
              />
            </svg>
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
          <span>Новая папка</span>
        </button>
      )}
    </div>
  );
}
