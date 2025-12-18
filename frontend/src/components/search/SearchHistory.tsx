/**
 * SearchHistory component - recent and saved searches
 * Requirements: 14.2, 14.3, 16.2, 16.3
 */

import { useState, useEffect } from "react";
import {
  getSearchHistory,
  getSavedSearches,
  deleteSearchHistoryItem,
  deleteSavedSearch,
  clearSearchHistory,
} from "@/api/search";
import type { SearchHistoryItem, SavedSearch } from "@/api/search";

interface SearchHistoryProps {
  storageId?: string;
  onSelectSearch: (query: string) => void;
  onSelectSavedSearch?: (saved: SavedSearch) => void;
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "только что";
  if (diffMins < 60) return `${diffMins} мин. назад`;
  if (diffHours < 24) return `${diffHours} ч. назад`;
  if (diffDays < 7) return `${diffDays} дн. назад`;
  return date.toLocaleDateString("ru-RU");
}

export function SearchHistory({
  storageId,
  onSelectSearch,
  onSelectSavedSearch,
}: SearchHistoryProps) {
  const [activeTab, setActiveTab] = useState<"recent" | "saved">("recent");
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [historyRes, savedRes] = await Promise.all([
          getSearchHistory(storageId, 20),
          getSavedSearches(storageId),
        ]);
        setHistory(historyRes.history);
        setSavedSearches(savedRes.saved_searches);
      } catch (err) {
        setError("Не удалось загрузить историю поиска");
        console.error("Failed to fetch search history:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [storageId]);

  // Delete history item
  const handleDeleteHistoryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteSearchHistoryItem(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Failed to delete history item:", err);
    }
  };

  // Delete saved search
  const handleDeleteSavedSearch = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteSavedSearch(id);
      setSavedSearches((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Failed to delete saved search:", err);
    }
  };

  // Clear all history
  const handleClearHistory = async () => {
    if (!confirm("Очистить всю историю поиска?")) return;
    try {
      await clearSearchHistory(storageId);
      setHistory([]);
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
      {/* Tabs */}
      <div className="flex border-b dark:border-gray-700">
        <button
          onClick={() => setActiveTab("recent")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "recent"
              ? "text-sky-600 dark:text-sky-400 border-b-2 border-sky-600 dark:border-sky-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <span className="flex items-center justify-center gap-2">
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Недавние
            {history.length > 0 && (
              <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                {history.length}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("saved")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "saved"
              ? "text-sky-600 dark:text-sky-400 border-b-2 border-sky-600 dark:border-sky-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <span className="flex items-center justify-center gap-2">
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
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
            Сохраненные
            {savedSearches.length > 0 && (
              <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                {savedSearches.length}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="p-2">
        {activeTab === "recent" ? (
          <>
            {history.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                История поиска пуста
              </p>
            ) : (
              <>
                <ul className="space-y-1">
                  {history.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => onSelectSearch(item.search_query)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                      >
                        <svg
                          className="w-4 h-4 text-gray-400 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm text-gray-900 dark:text-white truncate">
                            {item.search_query}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {item.result_count} результатов •{" "}
                            {formatRelativeTime(item.created_at)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                          aria-label="Удалить"
                        >
                          <svg
                            className="w-4 h-4 text-gray-400"
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
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={handleClearHistory}
                  className="w-full mt-2 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  Очистить историю
                </button>
              </>
            )}
          </>
        ) : (
          <>
            {savedSearches.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                Нет сохраненных поисков
              </p>
            ) : (
              <ul className="space-y-1">
                {savedSearches.map((saved) => (
                  <li key={saved.id}>
                    <button
                      onClick={() => {
                        if (onSelectSavedSearch) {
                          onSelectSavedSearch(saved);
                        } else {
                          onSelectSearch(saved.search_query);
                        }
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                    >
                      <svg
                        className="w-4 h-4 text-sky-500 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                        />
                      </svg>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {saved.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {saved.search_query}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSavedSearch(saved.id, e)}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                        aria-label="Удалить"
                      >
                        <svg
                          className="w-4 h-4 text-gray-400"
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
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
