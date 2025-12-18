/**
 * Search page - integrates all search components
 * Requirements: 6.1, 6.2, 6.3, 9.1, 14.2, 14.3, 15.1, 16.2, 16.3
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store";
import {
  SearchBar,
  SearchResults,
  SearchFilters,
  SearchHistory,
} from "@/components/search";
import { search, saveSearch } from "@/api/search";
import type {
  SearchFilters as SearchFiltersType,
  SearchResult,
  SavedSearch,
} from "@/api/search";

export function Search() {
  const navigate = useNavigate();
  const { searchQuery, setSearchQuery, currentStorageId, setIsSearching } =
    useAppStore();

  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFilters] = useState<SearchFiltersType>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [totalResults, setTotalResults] = useState(0);
  const [isCached, setIsCached] = useState(false);

  // Perform search
  const performSearch = useCallback(
    async (query: string, searchFilters?: SearchFiltersType) => {
      if (!query.trim()) return;

      if (!currentStorageId) {
        alert("Пожалуйста, выберите хранилище для поиска");
        return;
      }

      setIsLoading(true);
      setHasSearched(true);

      try {
        const response = await search(
          query,
          currentStorageId,
          searchFilters || filters
        );
        setResults(response.results);
        setTotalResults(response.total);
        setIsCached(response.cached);
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
        setTotalResults(0);
      } finally {
        setIsLoading(false);
        setIsSearching(false);
      }
    },
    [currentStorageId, filters, setIsSearching]
  );

  // Auto-search when query changes from header
  useEffect(() => {
    if (searchQuery && currentStorageId) {
      performSearch(searchQuery);
    }
  }, [searchQuery, currentStorageId, performSearch]);

  // Handle search from SearchBar
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    performSearch(query);
  };

  // Handle filter apply
  const handleApplyFilters = () => {
    if (searchQuery) {
      performSearch(searchQuery, filters);
    }
  };

  // Handle filter clear
  const handleClearFilters = () => {
    setFilters({});
    if (searchQuery) {
      performSearch(searchQuery, {});
    }
  };

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    navigate(`/documents/${result.documentId}`);
  };

  // Handle select from history
  const handleSelectFromHistory = (query: string) => {
    setSearchQuery(query);
    performSearch(query);
  };

  // Handle select saved search
  const handleSelectSavedSearch = (saved: SavedSearch) => {
    setSearchQuery(saved.search_query);
    setFilters(saved.filters || {});
    performSearch(saved.search_query, saved.filters);
  };

  // Handle save search
  const handleSaveSearch = async () => {
    if (!saveName.trim() || !searchQuery || !currentStorageId) return;

    try {
      await saveSearch(saveName, searchQuery, currentStorageId, filters);
      setShowSaveModal(false);
      setSaveName("");
    } catch (error) {
      console.error("Failed to save search:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Поиск
        </h1>
        {hasSearched && searchQuery && (
          <button
            onClick={() => setShowSaveModal(true)}
            className="btn btn-secondary text-sm flex items-center gap-2"
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
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
            Сохранить поиск
          </button>
        )}
      </div>

      {/* Search Bar */}
      <SearchBar
        onSearch={handleSearch}
        placeholder="Введите поисковый запрос..."
        className="max-w-3xl"
      />

      {/* No storage selected warning */}
      {!currentStorageId && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-yellow-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Выберите хранилище в боковой панели для поиска по документам
            </p>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Filters and History */}
        <div className="lg:col-span-1 space-y-4">
          {/* Filters */}
          <SearchFilters
            filters={filters}
            onFiltersChange={setFilters}
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
            isCollapsed={!showFilters}
            onToggleCollapse={() => setShowFilters(!showFilters)}
          />

          {/* Search History */}
          <SearchHistory
            storageId={currentStorageId || undefined}
            onSelectSearch={handleSelectFromHistory}
            onSelectSavedSearch={handleSelectSavedSearch}
          />
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          {/* Results header */}
          {hasSearched && (
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {isLoading ? (
                  "Поиск..."
                ) : (
                  <>
                    Найдено: <span className="font-medium">{totalResults}</span>{" "}
                    результатов
                    {isCached && (
                      <span className="ml-2 text-xs text-gray-400">
                        (из кэша)
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Results or empty state */}
          {hasSearched ? (
            <SearchResults
              results={results}
              query={searchQuery}
              isLoading={isLoading}
              onResultClick={handleResultClick}
            />
          ) : (
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
                Начните поиск
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Введите запрос в поисковую строку для поиска по документам
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Save Search Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Сохранить поиск
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Название
              </label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Введите название для поиска"
                className="input"
                autoFocus
              />
            </div>
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Запрос: <span className="font-medium">{searchQuery}</span>
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setSaveName("");
                }}
                className="btn btn-secondary"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveSearch}
                disabled={!saveName.trim()}
                className="btn btn-primary disabled:opacity-50"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
