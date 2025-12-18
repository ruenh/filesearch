/**
 * Widget Container - Draggable widget wrapper
 * Requirements: 81.1, 81.2, 81.3
 */
import { useState, useRef } from "react";
import {
  useWidgetStore,
  type Widget,
  type WidgetSize,
} from "@/store/useWidgetStore";

interface WidgetContainerProps {
  widget: Widget;
  children: React.ReactNode;
  onSettingsClick?: () => void;
}

// Size classes for different widget sizes
const sizeClasses: Record<WidgetSize, string> = {
  small: "col-span-1",
  medium: "col-span-1 lg:col-span-1",
  large: "col-span-1 lg:col-span-2",
};

export function WidgetContainer({
  widget,
  children,
  onSettingsClick,
}: WidgetContainerProps) {
  const {
    isEditMode,
    removeWidget,
    setDraggedWidgetId,
    draggedWidgetId,
    reorderWidgets,
    widgets,
  } = useWidgetStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent) => {
    if (!isEditMode) return;
    setDraggedWidgetId(widget.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", widget.id);
  };

  const handleDragEnd = () => {
    setDraggedWidgetId(null);
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditMode || draggedWidgetId === widget.id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (!isEditMode || !draggedWidgetId || draggedWidgetId === widget.id)
      return;

    const fromIndex = widgets.findIndex((w) => w.id === draggedWidgetId);
    const toIndex = widgets.findIndex((w) => w.id === widget.id);

    if (fromIndex !== -1 && toIndex !== -1) {
      reorderWidgets(fromIndex, toIndex);
    }
  };

  const handleRemove = () => {
    removeWidget(widget.id);
  };

  if (!widget.isVisible) return null;

  return (
    <div
      ref={containerRef}
      draggable={isEditMode}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        ${sizeClasses[widget.size]}
        bg-white dark:bg-gray-800 rounded-lg shadow-sm
        transition-all duration-200
        ${
          isEditMode
            ? "cursor-move ring-2 ring-blue-200 dark:ring-blue-800"
            : ""
        }
        ${isDragOver ? "ring-2 ring-blue-500 scale-[1.02]" : ""}
        ${draggedWidgetId === widget.id ? "opacity-50" : ""}
      `}
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          {isEditMode && (
            <svg
              className="w-4 h-4 text-gray-400 cursor-grab"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8h16M4 16h16"
              />
            </svg>
          )}
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            {widget.title}
          </h3>
        </div>

        {isEditMode && (
          <div className="flex items-center gap-1">
            {onSettingsClick && (
              <button
                onClick={onSettingsClick}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                title="Настройки"
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
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            )}
            <button
              onClick={handleRemove}
              className="p-1 text-gray-400 hover:text-red-500 rounded"
              title="Удалить виджет"
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
        )}
      </div>

      {/* Widget Content */}
      <div className="p-4">{children}</div>
    </div>
  );
}

export default WidgetContainer;
