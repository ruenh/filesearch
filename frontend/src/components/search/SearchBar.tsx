/**
 * SearchBar component with autocomplete dropdown and voice search
 * Requirements: 6.1, 12.1, 12.2, 12.3, 15.1
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store";
import { getSuggestions } from "@/api/search";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import type { Suggestion } from "@/api/search";

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  showVoiceSearch?: boolean;
  className?: string;
}

export function SearchBar({
  onSearch,
  placeholder = "Поиск документов...",
  showVoiceSearch = true,
  className = "",
}: SearchBarProps) {
  const navigate = useNavigate();
  const { searchQuery, setSearchQuery, setIsSearching, currentStorageId } =
    useAppStore();

  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Voice search hook (Requirements: 12.1, 12.2, 12.3)
  const handleVoiceResult = useCallback(
    (transcript: string) => {
      setLocalQuery(transcript);
      // Auto-execute search after voice recognition (Requirement 12.3)
      const trimmedQuery = transcript.trim();
      if (trimmedQuery) {
        setSearchQuery(trimmedQuery);
        setIsSearching(true);
        setShowSuggestions(false);
        navigate("/search");
      }
    },
    [setSearchQuery, setIsSearching, navigate]
  );

  const {
    isSupported: isVoiceSupported,
    isListening,
    error: voiceError,
    startListening,
  } = useVoiceSearch({
    language: "ru-RU",
    onResult: handleVoiceResult,
  });

  // Fetch suggestions with debounce
  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoadingSuggestions(true);
      try {
        const response = await getSuggestions(
          query,
          currentStorageId || undefined
        );
        setSuggestions(response.suggestions);
      } catch (error) {
        console.error("Failed to fetch suggestions:", error);
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    },
    [currentStorageId]
  );

  // Debounced input handler
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(localQuery);
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [localQuery, fetchSuggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle search submission
  const handleSearch = useCallback(
    (query: string) => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) return;

      setSearchQuery(trimmedQuery);
      setIsSearching(true);
      setShowSuggestions(false);

      if (onSearch) {
        onSearch(trimmedQuery);
      } else {
        navigate("/search");
      }
    },
    [setSearchQuery, setIsSearching, onSearch, navigate]
  );

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(localQuery);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: Suggestion) => {
    setLocalQuery(suggestion.text);
    handleSearch(suggestion.text);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter") {
        handleSubmit(e);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        } else {
          handleSearch(localQuery);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Voice search handler - uses the useVoiceSearch hook (Requirements: 12.1, 12.2, 12.3)
  const handleVoiceSearch = () => {
    if (!isVoiceSupported) {
      alert("Голосовой поиск не поддерживается в вашем браузере");
      return;
    }
    startListening();
  };

  // Get suggestion icon based on type
  const getSuggestionIcon = (type: Suggestion["type"]) => {
    switch (type) {
      case "history":
        return (
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
        );
      case "document":
        return (
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
      case "saved":
        return (
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
        );
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          {/* Search icon */}
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
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

          {/* Input field */}
          <input
            ref={inputRef}
            type="text"
            value={localQuery}
            onChange={(e) => {
              setLocalQuery(e.target.value);
              setShowSuggestions(true);
              setSelectedIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="input pl-10 pr-20"
            aria-label="Search"
            aria-expanded={showSuggestions}
            aria-autocomplete="list"
            role="combobox"
          />

          {/* Right side buttons */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Clear button */}
            {localQuery && (
              <button
                type="button"
                onClick={() => {
                  setLocalQuery("");
                  setSuggestions([]);
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                aria-label="Clear search"
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
            )}

            {/* Voice search button (Requirements: 12.1, 12.2, 12.3) */}
            {showVoiceSearch && isVoiceSupported && (
              <button
                type="button"
                onClick={handleVoiceSearch}
                className={`p-1.5 rounded-full transition-colors ${
                  isListening
                    ? "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 animate-pulse"
                    : "hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400"
                }`}
                aria-label={isListening ? "Слушаю..." : "Голосовой поиск"}
                title={
                  voiceError || (isListening ? "Слушаю..." : "Голосовой поиск")
                }
                disabled={isListening}
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
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && (suggestions.length > 0 || isLoadingSuggestions) && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 max-h-80 overflow-y-auto">
          {isLoadingSuggestions && suggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              Загрузка...
            </div>
          ) : (
            <ul role="listbox">
              {suggestions.map((suggestion, index) => (
                <li
                  key={`${suggestion.type}-${suggestion.text}-${index}`}
                  role="option"
                  aria-selected={index === selectedIndex}
                  className={`px-4 py-2 cursor-pointer flex items-center gap-3 ${
                    index === selectedIndex
                      ? "bg-sky-50 dark:bg-sky-900/30"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => handleSelectSuggestion(suggestion)}
                >
                  <span className="text-gray-400 dark:text-gray-500">
                    {getSuggestionIcon(suggestion.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white truncate">
                      {suggestion.text}
                    </p>
                    {suggestion.type === "saved" && suggestion.name && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Сохраненный: {suggestion.name}
                      </p>
                    )}
                    {suggestion.type === "history" &&
                      suggestion.result_count !== undefined && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {suggestion.result_count} результатов
                        </p>
                      )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
