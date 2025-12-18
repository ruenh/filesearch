import { useState, useEffect } from "react";
import {
  useShortcutsStore,
  defaultShortcuts,
  getShortcutKey,
  formatShortcutKey,
} from "../../store/useShortcutsStore";
import type { ShortcutAction } from "../../store/useShortcutsStore";

/**
 * Settings component for managing keyboard shortcuts
 * Requirements: 79.2 - Display all available shortcuts
 * Requirements: 79.3 - Save custom bindings
 */
export function ShortcutsSettings() {
  const {
    customShortcuts,
    setCustomShortcut,
    resetShortcut,
    resetAllShortcuts,
  } = useShortcutsStore();

  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

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

  // Check for conflicts
  const checkConflict = (newKey: string, excludeId: string): string | null => {
    for (const shortcut of defaultShortcuts) {
      if (shortcut.id === excludeId) continue;
      const existingKey = getShortcutKey(shortcut.id, customShortcuts);
      if (existingKey === newKey) {
        return shortcut.name;
      }
    }
    return null;
  };

  // Handle key recording for customization
  useEffect(() => {
    if (!editingShortcut) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        setEditingShortcut(null);
        setRecordedKeys([]);
        setConflictWarning(null);
        return;
      }

      if (e.key === "Enter" && recordedKeys.length > 0) {
        const newKey = recordedKeys.join(" ");
        const conflict = checkConflict(newKey, editingShortcut);

        if (conflict) {
          setConflictWarning(`Конфликт с "${conflict}"`);
          return;
        }

        setCustomShortcut(editingShortcut, newKey);
        setEditingShortcut(null);
        setRecordedKeys([]);
        setConflictWarning(null);
        return;
      }

      // Record the key
      let key = e.key;
      if (key === " ") key = "Space";

      // Limit sequence to 3 keys
      if (recordedKeys.length < 3) {
        const newKeys = [...recordedKeys, key];
        setRecordedKeys(newKeys);

        // Check for conflicts as user types
        const newKey = newKeys.join(" ");
        const conflict = checkConflict(newKey, editingShortcut);
        setConflictWarning(conflict ? `Конфликт с "${conflict}"` : null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingShortcut, recordedKeys, customShortcuts, setCustomShortcut]);

  const customizedCount = Object.keys(customShortcuts).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Горячие клавиши
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Настройте клавиатурные сокращения для быстрого доступа к функциям
          </p>
        </div>
        {customizedCount > 0 && (
          <button
            onClick={resetAllShortcuts}
            className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Сбросить все ({customizedCount})
          </button>
        )}
      </div>

      {/* Shortcuts by category */}
      <div className="space-y-8">
        {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
          <div key={category} className="card">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              {categoryLabels[category] || category}
            </h3>
            <div className="space-y-3">
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
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isEditing
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                        : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {shortcut.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {shortcut.description}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      {isEditing ? (
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            <kbd
                              className={`px-3 py-1.5 text-sm font-mono rounded border ${
                                conflictWarning
                                  ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700"
                                  : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700"
                              }`}
                            >
                              {recordedKeys.length > 0
                                ? formatShortcutKey(recordedKeys.join(" "))
                                : "Нажмите клавиши..."}
                            </kbd>
                            <button
                              onClick={() => {
                                setEditingShortcut(null);
                                setRecordedKeys([]);
                                setConflictWarning(null);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
                          {conflictWarning ? (
                            <span className="text-xs text-red-500">
                              {conflictWarning}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">
                              Enter - сохранить, Esc - отмена
                            </span>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <kbd
                              className={`px-3 py-1.5 text-sm font-mono rounded border ${
                                isCustomized
                                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600"
                              }`}
                            >
                              {formatShortcutKey(effectiveKey)}
                            </kbd>
                            {isCustomized && (
                              <span className="text-xs text-blue-500 dark:text-blue-400">
                                (изменено)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingShortcut(shortcut.id);
                                setRecordedKeys([]);
                                setConflictWarning(null);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
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
                                className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                title="Сбросить к значению по умолчанию"
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
                          </div>
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

      {/* Help text */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
          Советы
        </h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>
            • Нажмите{" "}
            <kbd className="px-1 py-0.5 text-xs font-mono bg-gray-200 dark:bg-gray-700 rounded">
              ?
            </kbd>{" "}
            в любом месте приложения, чтобы открыть справку по горячим клавишам
          </li>
          <li>
            • Многоклавишные сочетания (например, "g h") выполняются
            последовательным нажатием клавиш
          </li>
          <li>
            • Горячие клавиши не работают, когда фокус находится в поле ввода
          </li>
        </ul>
      </div>
    </div>
  );
}
