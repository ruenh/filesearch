/**
 * SearchResults component - displays search results with snippets
 * Requirements: 6.2, 6.3
 */

import { useNavigate } from "react-router-dom";
import type { SearchResult } from "@/api/search";

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  isLoading?: boolean;
  onResultClick?: (result: SearchResult) => void;
}

// Helper to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// Helper to format date
function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Helper to get file type icon
function getFileTypeIcon(fileType: string) {
  switch (fileType.toLowerCase()) {
    case "pdf":
      return (
        <svg
          className="w-8 h-8 text-red-500"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13h1c.55 0 1 .45 1 1v1c0 .55-.45 1-1 1h-.5v1.5H8V13h.5zm3 0h1.5c.55 0 1 .45 1 1v2.5c0 .55-.45 1-1 1H11.5V13zm4 0h2v1h-1.5v.5h1v1h-1v2h-1V13z" />
        </svg>
      );
    case "docx":
    case "doc":
      return (
        <svg
          className="w-8 h-8 text-blue-500"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM9.5 13l1 4 1-4h1l1 4 1-4h1l-1.5 5h-1l-1-3.5-1 3.5h-1L8.5 13h1z" />
        </svg>
      );
    case "md":
      return (
        <svg
          className="w-8 h-8 text-gray-600 dark:text-gray-400"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM6 17v-4h2l2 2.5L12 13h2v4h-2v-2.5l-2 2.5-2-2.5V17H6z" />
        </svg>
      );
    case "txt":
      return (
        <svg
          className="w-8 h-8 text-gray-500"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM7 13h10v1H7v-1zm0 2h10v1H7v-1zm0 2h7v1H7v-1z" />
        </svg>
      );
    case "image":
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
      return (
        <svg
          className="w-8 h-8 text-green-500"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V10h12v10H6zm2-8l2 2.5L12 12l4 5H8l2-5z" />
        </svg>
      );
    default:
      return (
        <svg
          className="w-8 h-8 text-gray-400"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4z" />
        </svg>
      );
  }
}

// Highlight matching text in snippet
function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const regex = new RegExp(
    `(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi"
  );
  const parts = text.split(regex);

  return parts.map((part, index) => {
    const isMatch = words.some(
      (word) => part.toLowerCase() === word.toLowerCase()
    );
    return isMatch ? (
      <mark
        key={index}
        className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded"
      >
        {part}
      </mark>
    ) : (
      part
    );
  });
}

export function SearchResults({
  results,
  query,
  isLoading = false,
  onResultClick,
}: SearchResultsProps) {
  const navigate = useNavigate();

  const handleResultClick = (result: SearchResult) => {
    if (onResultClick) {
      onResultClick(result);
    } else {
      navigate(`/documents/${result.documentId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4 animate-pulse"
          >
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Ничего не найдено
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Попробуйте изменить поисковый запрос или фильтры
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {results.map((result) => (
        <div
          key={result.documentId}
          onClick={() => handleResultClick(result)}
          className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4 cursor-pointer hover:border-sky-300 dark:hover:border-sky-600 hover:shadow-md transition-all"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleResultClick(result);
            }
          }}
        >
          <div className="flex gap-4">
            {/* File type icon */}
            <div className="flex-shrink-0">
              {getFileTypeIcon(result.fileType)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Title and score */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">
                  {result.documentName}
                </h3>
                <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300">
                  {result.score}%
                </span>
              </div>

              {/* Snippet */}
              {result.snippet && (
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
                  {highlightText(result.snippet, query)}
                </p>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="uppercase">{result.fileType}</span>
                <span>{formatFileSize(result.size)}</span>
                {result.updatedAt && (
                  <span>Изменен: {formatDate(result.updatedAt)}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
