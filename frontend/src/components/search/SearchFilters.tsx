/**
 * SearchFilters component - date picker, type selector, size slider
 * Requirements: 9.1
 */

import { useState, useEffect } from "react";
import type { SearchFilters as SearchFiltersType } from "@/api/search";

interface SearchFiltersProps {
  filters: SearchFiltersType;
  onFiltersChange: (filters: SearchFiltersType) => void;
  onApply: () => void;
  onClear: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const FILE_TYPES = [
  { value: "txt", label: "Текст (.txt)" },
  { value: "pdf", label: "PDF (.pdf)" },
  { value: "docx", label: "Word (.docx)" },
  { value: "md", label: "Markdown (.md)" },
  { value: "image", label: "Изображения" },
];

const SIZE_PRESETS = [
  { value: 0, label: "Любой" },
  { value: 1024, label: "< 1 KB" },
  { value: 102400, label: "< 100 KB" },
  { value: 1048576, label: "< 1 MB" },
  { value: 10485760, label: "< 10 MB" },
  { value: 104857600, label: "< 100 MB" },
];

export function SearchFilters({
  filters,
  onFiltersChange,
  onApply,
  onClear,
  isCollapsed = false,
  onToggleCollapse,
}: SearchFiltersProps) {
  const [localFilters, setLocalFilters] = useState<SearchFiltersType>(filters);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // Sync local state with props
  useEffect(() => {
    setLocalFilters(filters);
    if (filters.file_types) {
      setSelectedTypes(filters.file_types.split(",").filter(Boolean));
    } else {
      setSelectedTypes([]);
    }
  }, [filters]);

  // Update filters
  const updateFilter = (
    key: keyof SearchFiltersType,
    value: string | number | undefined
  ) => {
    const newFilters = { ...localFilters };
    if (value === undefined || value === "" || value === 0) {
      delete newFilters[key];
    } else {
      (newFilters as Record<string, string | number>)[key] = value;
    }
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  // Toggle file type selection
  const toggleFileType = (type: string) => {
    const newTypes = selectedTypes.includes(type)
      ? selectedTypes.filter((t) => t !== type)
      : [...selectedTypes, type];
    setSelectedTypes(newTypes);
    updateFilter(
      "file_types",
      newTypes.length > 0 ? newTypes.join(",") : undefined
    );
  };

  // Check if any filters are active
  const hasActiveFilters =
    localFilters.date_from ||
    localFilters.date_to ||
    localFilters.file_types ||
    localFilters.size_min ||
    localFilters.size_max;

  // Handle clear
  const handleClear = () => {
    setLocalFilters({});
    setSelectedTypes([]);
    onClear();
  };

  if (isCollapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
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
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        Фильтры
        {hasActiveFilters && (
          <span className="w-2 h-2 rounded-full bg-sky-500" />
        )}
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
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
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Фильтры
        </h3>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Свернуть фильтры"
          >
            <svg
              className="w-4 h-4 text-gray-500"
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
        )}
      </div>

      {/* Date Range */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          Дата создания
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="sr-only">От</label>
            <input
              type="date"
              value={localFilters.date_from?.split("T")[0] || ""}
              onChange={(e) =>
                updateFilter(
                  "date_from",
                  e.target.value ? `${e.target.value}T00:00:00Z` : undefined
                )
              }
              className="input text-sm"
              placeholder="От"
            />
          </div>
          <div>
            <label className="sr-only">До</label>
            <input
              type="date"
              value={localFilters.date_to?.split("T")[0] || ""}
              onChange={(e) =>
                updateFilter(
                  "date_to",
                  e.target.value ? `${e.target.value}T23:59:59Z` : undefined
                )
              }
              className="input text-sm"
              placeholder="До"
            />
          </div>
        </div>
      </div>

      {/* File Types */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          Тип файла
        </label>
        <div className="flex flex-wrap gap-2">
          {FILE_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => toggleFileType(type.value)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                selectedTypes.includes(type.value)
                  ? "bg-sky-100 dark:bg-sky-900 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300"
                  : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* File Size */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          Размер файла
        </label>
        <select
          value={localFilters.size_max || 0}
          onChange={(e) =>
            updateFilter(
              "size_max",
              e.target.value !== "0" ? parseInt(e.target.value) : undefined
            )
          }
          className="input text-sm"
        >
          {SIZE_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2 border-t dark:border-gray-700">
        <button onClick={onApply} className="flex-1 btn btn-primary text-sm">
          Применить
        </button>
        <button
          onClick={handleClear}
          disabled={!hasActiveFilters}
          className="flex-1 btn btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Сбросить
        </button>
      </div>
    </div>
  );
}
