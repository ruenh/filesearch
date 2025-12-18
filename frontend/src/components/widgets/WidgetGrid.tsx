/**
 * Widget Grid - Main dashboard widget layout
 * Requirements: 81.1, 81.2, 81.3
 */
import { useState } from "react";
import { useWidgetStore } from "@/store/useWidgetStore";
import { WidgetContainer } from "./WidgetContainer";
import { WidgetRenderer } from "./WidgetRenderer";
import { AddWidgetModal } from "./AddWidgetModal";

interface WidgetGridProps {
  storageId?: string;
}

export function WidgetGrid({ storageId }: WidgetGridProps) {
  const { widgets, isEditMode, setEditMode, resetToDefault } = useWidgetStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Sort widgets by position
  const sortedWidgets = [...widgets].sort((a, b) => a.position - b.position);
  const visibleWidgets = sortedWidgets.filter((w) => w.isVisible);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Дашборд
        </h2>
        <div className="flex items-center gap-2">
          {isEditMode && (
            <>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Добавить виджет
              </button>
              <button
                onClick={resetToDefault}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
                Сбросить
              </button>
            </>
          )}
          <button
            onClick={() => setEditMode(!isEditMode)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
              ${
                isEditMode
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }
            `}
          >
            {isEditMode ? (
              <>
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
                Готово
              </>
            ) : (
              <>
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
                Настроить
              </>
            )}
          </button>
        </div>
      </div>

      {/* Edit Mode Instructions */}
      {isEditMode && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <span className="font-medium">Режим редактирования:</span>{" "}
            Перетаскивайте виджеты для изменения порядка. Нажмите × для удаления
            виджета.
          </p>
        </div>
      )}

      {/* Widget Grid */}
      {visibleWidgets.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visibleWidgets.map((widget) => (
            <WidgetContainer key={widget.id} widget={widget}>
              <WidgetRenderer widget={widget} storageId={storageId} />
            </WidgetContainer>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
          <svg
            className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Нет виджетов
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Добавьте виджеты для отображения важной информации
          </p>
          <button
            onClick={() => {
              setEditMode(true);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Добавить виджет
          </button>
        </div>
      )}

      {/* Add Widget Modal */}
      <AddWidgetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
}

export default WidgetGrid;
