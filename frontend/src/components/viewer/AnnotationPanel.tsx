/**
 * AnnotationPanel component for displaying and managing document annotations
 * Requirements: 38.1, 38.2, 38.3
 */

import { useState, useEffect } from "react";
import { MessageSquare, Trash2, Edit2, X, Check } from "lucide-react";
import type { Annotation } from "../../api/annotations";
import {
  getDocumentAnnotations,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
} from "../../api/annotations";

interface AnnotationPanelProps {
  documentId: string;
  selectedText?: string;
  selectionRange?: { start: number; end: number };
  onAnnotationClick?: (annotation: Annotation) => void;
  onClose?: () => void;
}

const HIGHLIGHT_COLORS = [
  { name: "yellow", value: "#fef08a" },
  { name: "green", value: "#bbf7d0" },
  { name: "blue", value: "#bfdbfe" },
  { name: "pink", value: "#fbcfe8" },
  { name: "orange", value: "#fed7aa" },
];

export function AnnotationPanel({
  documentId,
  selectedText,
  selectionRange,
  onAnnotationClick,
  onClose,
}: AnnotationPanelProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [selectedColor, setSelectedColor] = useState("yellow");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");

  useEffect(() => {
    loadAnnotations();
  }, [documentId]);

  const loadAnnotations = async () => {
    try {
      setLoading(true);
      const response = await getDocumentAnnotations(documentId);
      setAnnotations(response.annotations);
    } catch (error) {
      console.error("Failed to load annotations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnotation = async () => {
    if (!selectedText || !selectionRange) return;

    try {
      const annotation = await createAnnotation({
        document_id: documentId,
        selected_text: selectedText,
        start_offset: selectionRange.start,
        end_offset: selectionRange.end,
        note: newNote || undefined,
        color: selectedColor,
      });
      setAnnotations([...annotations, annotation]);
      setNewNote("");
    } catch (error) {
      console.error("Failed to create annotation:", error);
    }
  };

  const handleUpdateAnnotation = async (id: string) => {
    try {
      const updated = await updateAnnotation(id, { note: editNote });
      setAnnotations(annotations.map((a) => (a.id === id ? updated : a)));
      setEditingId(null);
      setEditNote("");
    } catch (error) {
      console.error("Failed to update annotation:", error);
    }
  };

  const handleDeleteAnnotation = async (id: string) => {
    try {
      await deleteAnnotation(id);
      setAnnotations(annotations.filter((a) => a.id !== id));
    } catch (error) {
      console.error("Failed to delete annotation:", error);
    }
  };

  const startEditing = (annotation: Annotation) => {
    setEditingId(annotation.id);
    setEditNote(annotation.note || "");
  };

  const getColorValue = (colorName: string) => {
    return (
      HIGHLIGHT_COLORS.find((c) => c.name === colorName)?.value || "#fef08a"
    );
  };

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Annotations
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* New Annotation Form - shown when text is selected */}
      {selectedText && selectionRange && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Selected text:
          </p>
          <p className="text-sm bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded mb-3 line-clamp-3">
            "{selectedText}"
          </p>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note (optional)..."
            className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
            rows={2}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-1">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color.name}
                  onClick={() => setSelectedColor(color.name)}
                  className={`w-6 h-6 rounded-full border-2 ${
                    selectedColor === color.name
                      ? "border-gray-900 dark:border-white"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
            <button
              onClick={handleCreateAnnotation}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Annotations List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            Loading...
          </div>
        ) : annotations.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No annotations yet</p>
            <p className="text-sm mt-1">Select text to add an annotation</p>
          </div>
        ) : (
          annotations.map((annotation) => (
            <div
              key={annotation.id}
              className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer"
              style={{
                borderLeftColor: getColorValue(annotation.color),
                borderLeftWidth: "4px",
              }}
              onClick={() => onAnnotationClick?.(annotation)}
            >
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                "{annotation.selected_text}"
              </p>

              {editingId === annotation.id ? (
                <div className="mt-2">
                  <textarea
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                    rows={2}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleUpdateAnnotation(annotation.id)}
                      className="p-1 text-green-600 hover:text-green-700"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {annotation.note && (
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {annotation.note}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      {new Date(annotation.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(annotation);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAnnotation(annotation.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AnnotationPanel;
