/**
 * BookmarkPanel component for managing document bookmarks
 * Requirements: 39.1, 39.2, 39.3
 */

import { useState, useEffect } from "react";
import {
  Bookmark as BookmarkIcon,
  Trash2,
  Edit2,
  X,
  Check,
  Plus,
} from "lucide-react";
import type { Bookmark } from "../../api/bookmarks";
import {
  getDocumentBookmarks,
  createBookmark,
  updateBookmark,
  deleteBookmark,
} from "../../api/bookmarks";

interface BookmarkPanelProps {
  documentId: string;
  currentPosition?: number;
  positionType?: "offset" | "page" | "line";
  onBookmarkClick?: (bookmark: Bookmark) => void;
  onClose?: () => void;
}

export function BookmarkPanel({
  documentId,
  currentPosition,
  positionType = "offset",
  onBookmarkClick,
  onClose,
}: BookmarkPanelProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    loadBookmarks();
  }, [documentId]);

  const loadBookmarks = async () => {
    try {
      setLoading(true);
      const response = await getDocumentBookmarks(documentId);
      setBookmarks(response.bookmarks);
    } catch (error) {
      console.error("Failed to load bookmarks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBookmark = async () => {
    if (!newName.trim() || currentPosition === undefined) return;

    try {
      const bookmark = await createBookmark({
        document_id: documentId,
        name: newName.trim(),
        position: currentPosition,
        position_type: positionType,
      });
      setBookmarks(
        [...bookmarks, bookmark].sort((a, b) => a.position - b.position)
      );
      setNewName("");
      setShowAddForm(false);
    } catch (error) {
      console.error("Failed to create bookmark:", error);
    }
  };

  const handleUpdateBookmark = async (id: string) => {
    if (!editName.trim()) return;

    try {
      const updated = await updateBookmark(id, { name: editName.trim() });
      setBookmarks(bookmarks.map((b) => (b.id === id ? updated : b)));
      setEditingId(null);
      setEditName("");
    } catch (error) {
      console.error("Failed to update bookmark:", error);
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    try {
      await deleteBookmark(id);
      setBookmarks(bookmarks.filter((b) => b.id !== id));
    } catch (error) {
      console.error("Failed to delete bookmark:", error);
    }
  };

  const startEditing = (bookmark: Bookmark) => {
    setEditingId(bookmark.id);
    setEditName(bookmark.name);
  };

  const getPositionLabel = (bookmark: Bookmark) => {
    switch (bookmark.position_type) {
      case "page":
        return `Page ${bookmark.position}`;
      case "line":
        return `Line ${bookmark.position}`;
      default:
        return `Position ${bookmark.position}`;
    }
  };

  return (
    <div className="w-72 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BookmarkIcon className="w-5 h-5" />
          Bookmarks
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="p-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
            title="Add bookmark"
          >
            <Plus className="w-5 h-5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Add Bookmark Form */}
      {showAddForm && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Bookmark name..."
            className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCreateBookmark()}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateBookmark}
              disabled={!newName.trim() || currentPosition === undefined}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Bookmarks List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            Loading...
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <BookmarkIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No bookmarks yet</p>
            <p className="text-sm mt-1">Click + to add a bookmark</p>
          </div>
        ) : (
          bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-colors"
              onClick={() => onBookmarkClick?.(bookmark)}
            >
              {editingId === bookmark.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 p-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    autoFocus
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleUpdateBookmark(bookmark.id)
                    }
                  />
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1 text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleUpdateBookmark(bookmark.id)}
                    className="p-1 text-green-600 hover:text-green-700"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white text-sm">
                      {bookmark.name}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(bookmark);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Edit"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBookmark(bookmark.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {getPositionLabel(bookmark)}
                  </span>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default BookmarkPanel;
