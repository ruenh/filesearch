/**
 * StorageCard component
 * Displays a single storage with name, document count, date, and actions menu
 * Requirements: 2.2
 */
import { useState, useRef, useEffect } from "react";
import type { Storage } from "@/types";

interface StorageCardProps {
  storage: Storage;
  isSelected: boolean;
  onSelect: (storage: Storage) => void;
  onDelete: (storage: Storage) => void;
  onExport: (storage: Storage) => void;
}

export function StorageCard({
  storage,
  isSelected,
  onSelect,
  onDelete,
  onExport,
}: StorageCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  // Format date for display
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Б";
    const k = 1024;
    const sizes = ["Б", "КБ", "МБ", "ГБ"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleCardClick = () => {
    onSelect(storage);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    onDelete(storage);
  };

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    onExport(storage);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`
        card cursor-pointer transition-all duration-200
        hover:shadow-md hover:border-sky-300 dark:hover:border-sky-600
        ${isSelected ? "ring-2 ring-sky-500 border-sky-500" : ""}
      `}
    >
      <div className="flex items-start justify-between">
        {/* Storage icon and name */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={`
            w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
            ${
              isSelected
                ? "bg-sky-500 text-white"
                : "bg-sky-100 text-sky-600 dark:bg-sky-900 dark:text-sky-300"
            }
          `}
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
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-white truncate">
              {storage.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {storage.documentCount} документов
            </p>
          </div>
        </div>

        {/* Actions menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={handleMenuClick}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Меню действий"
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
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 py-1 z-10">
              <button
                onClick={handleExport}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Экспорт
              </button>
              <button
                onClick={handleDelete}
                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
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
                Удалить
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="mt-4 pt-3 border-t dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{formatSize(storage.totalSize)}</span>
        <span>Создано: {formatDate(storage.createdAt)}</span>
      </div>
    </div>
  );
}
