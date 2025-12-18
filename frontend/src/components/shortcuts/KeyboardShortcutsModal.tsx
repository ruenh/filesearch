import { useState, useEffect, useRef } from "react";
import {
  useShortcutsStore,
  defaultShortcuts,
  getShortcutKey,
  formatShortcutKey,
} from "../../store/useShortcutsStore";
import type { ShortcutAction } from "../../store/useShortcutsStore";

/**
 * Modal component for displaying and customizing keyboard shortcuts
 * Requirements: 79.2 - Display all available shortcuts
 * Requirements: 79.3 - Save custom bindings
 */
export function KeyboardShortcutsModal() {
  const {
    isHelpModalOpen,
    closeHelpModal,
    customShortcuts,
    setCustomShortcut,
    resetShortcut,
    resetAllShortcuts,
  } = useShortcutsStore();

  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);

  // Group shortcuts by category
  const groupedShortcuts = defaultShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutAction[]>);

  const categoryLabels: Record<string, string> = {
    navigation: "Навигация",
    documents: "Документы",
    search: "Поиск",
    general: "Общие",
  };

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isHelpModalOpen && !editingShortcut) {
        closeHelpModal();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isHelpModalOpen, closeHelpModal, editingShortcut]);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        if (!editingShortcut) {
          closeHelpModal();
        }
      }
    };
    if (isHelpModalOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isHelpModalOpen, closeHelpModal, editingShortcut]);

  // Handle key recording for customization - Requirements 79.3
  useEffect(() => {
    if (!editingShortcut) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        setEditingShortcut(null);
        setRecordedKeys([]);
        return;
      }

      if (e.key === "Enter" && recordedKeys.length > 0) {
        // Save the shortcut
        const newKey = recordedKeys.join(" ");
        setCustomShortcut(editingShortcut, newKey);
        setEditingShortcut(null);
        setRecordedKeys([]);
        return;
      }

      // Record the key
      let key = e.key;
      if (key === " ") key = "Space";

      // Limit sequence to 3 keys
      if (recordedKeys.length < 3) {
        setRecordedKeys((prev) => [...prev, key]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingShortcut, recordedKeys, setCustomShortcut]);

  if (!isHelpModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Горячие клавиши
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={resetAllShortcuts}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Сбросить все
            </button>
            <button
              onClick={closeHelpModal}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                {categoryLabels[category] || category}
              </h3>
              <div className="space-y-2">
                {shortcuts.map((shortcut) => {
                  const effectiveKey = getShortcutKey(
                    shortcut.id,
                    customShortcuts
                  );
                  const isCustomized = !!customShortcuts[shortcut.id];
                  const isEditing = editingShortcut === shortcut.id;

                  return (
                    <div
                      key={shortcut.id}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        isEditing
                          ? "bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {shortcut.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {shortcut.description}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <kbd className="px-2 py-1 text-sm font-mono bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded border border-yellow-300 dark:border-yellow-700">
                              {recordedKeys.length > 0
                                ? formatShortcutKey(recordedKeys.join(" "))
                                : "Нажмите клавиши..."}
                            </kbd>
                            <span className="text-xs text-gray-500">
                              Enter - сохранить, Esc - отмена
                            </span>
                          </div>
                        ) : (
                          <>
                            <kbd
                              className={`px-2 py-1 text-sm font-mono rounded border ${
                                isCustomized
                                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600"
                              }`}
                            >
                              {formatShortcutKey(effectiveKey)}
                            </kbd>
                            <button
                              onClick={() => {
                                setEditingShortcut(shortcut.id);
                                setRecordedKeys([]);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              title="Изменить"
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
                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                              </svg>
                            </button>
                            {isCustomized && (
                              <button
                                onClick={() => resetShortcut(shortcut.id)}
                                className="p-1 text-gray-400 hover:text-red-500"
                                title="Сбросить"
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
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                  />
                                </svg>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Нажмите{" "}
            <kbd className="px-1 py-0.5 text-xs font-mono bg-gray-200 dark:bg-gray-700 rounded">
              ?
            </kbd>{" "}
            в любом месте, чтобы открыть эту справку
          </p>
        </div>
      </div>
    </div>
  );
}
