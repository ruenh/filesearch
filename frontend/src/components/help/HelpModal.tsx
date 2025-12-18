import { useState, useEffect, useRef } from "react";
import { useHelpStore, helpTopics, helpCategories } from "@/store/useHelpStore";
import type { HelpTopic } from "@/store/useHelpStore";

/**
 * HelpModal Component - Requirements 83.2, 83.3
 * Full help modal with search functionality and topic browsing
 */

export function HelpModal() {
  const {
    isHelpModalOpen,
    closeHelpModal,
    searchQuery,
    setSearchQuery,
    selectedTopic,
    selectTopic,
    searchTopics,
    recentTopics,
    getTopicById,
  } = useHelpStore();

  const [filteredTopics, setFilteredTopics] = useState<HelpTopic[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when modal opens
  useEffect(() => {
    if (isHelpModalOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isHelpModalOpen]);

  // Update filtered topics when search query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredTopics(searchTopics(searchQuery));
    } else {
      setFilteredTopics([]);
    }
  }, [searchQuery, searchTopics]);

  // Handle escape key
  useEffect(() => {
    if (!isHelpModalOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedTopic) {
          selectTopic(null);
        } else {
          closeHelpModal();
        }
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isHelpModalOpen, selectedTopic, selectTopic, closeHelpModal]);

  // Handle click outside
  useEffect(() => {
    if (!isHelpModalOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        closeHelpModal();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isHelpModalOpen, closeHelpModal]);

  if (!isHelpModalOpen) return null;

  // Group topics by category for browsing
  const topicsByCategory = helpTopics.reduce((acc, topic) => {
    if (!acc[topic.category]) {
      acc[topic.category] = [];
    }
    acc[topic.category].push(topic);
    return acc;
  }, {} as Record<string, HelpTopic[]>);

  // Get recent topics
  const recentHelpTopics = recentTopics
    .map((id) => getTopicById(id))
    .filter((t): t is HelpTopic => t !== undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedTopic && (
              <button
                onClick={() => selectTopic(null)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Назад"
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900 rounded-xl flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-sky-600 dark:text-sky-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedTopic ? selectedTopic.title : "Справка"}
                </h2>
                {!selectedTopic && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Найдите ответы на ваши вопросы
                  </p>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={closeHelpModal}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Закрыть"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Search Bar - Requirements 83.3 */}
        {!selectedTopic && (
          <div className="px-6 py-4 border-b dark:border-gray-700">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск в справке..."
                className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-sky-500 focus:bg-white dark:focus:bg-gray-600 transition-colors"
              />
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
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
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
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {selectedTopic ? (
            // Topic Detail View
            <TopicDetail topic={selectedTopic} onSelectTopic={selectTopic} />
          ) : searchQuery ? (
            // Search Results
            <SearchResults
              results={filteredTopics}
              query={searchQuery}
              onSelectTopic={selectTopic}
            />
          ) : (
            // Browse Topics
            <BrowseTopics
              topicsByCategory={topicsByCategory}
              recentTopics={recentHelpTopics}
              onSelectTopic={selectTopic}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Нажмите{" "}
            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-200 dark:bg-gray-700 rounded">
              F1
            </kbd>{" "}
            или{" "}
            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-200 dark:bg-gray-700 rounded">
              Ctrl+H
            </kbd>{" "}
            для открытия справки
          </p>
        </div>
      </div>
    </div>
  );
}

// Topic Detail Component
function TopicDetail({
  topic,
  onSelectTopic,
}: {
  topic: HelpTopic;
  onSelectTopic: (topic: HelpTopic) => void;
}) {
  const { getTopicById } = useHelpStore();

  const relatedTopics = topic.relatedTopics
    ?.map((id) => getTopicById(id))
    .filter((t): t is HelpTopic => t !== undefined);

  return (
    <div className="p-6">
      {/* Category Badge */}
      <div className="mb-4">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300">
          {helpCategories[topic.category] || topic.category}
        </span>
      </div>

      {/* Description */}
      <div className="prose dark:prose-invert max-w-none">
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-base">
          {topic.fullDescription}
        </p>
      </div>

      {/* Keywords */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Ключевые слова
        </h4>
        <div className="flex flex-wrap gap-2">
          {topic.keywords.map((keyword) => (
            <span
              key={keyword}
              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg"
            >
              {keyword}
            </span>
          ))}
        </div>
      </div>

      {/* Related Topics */}
      {relatedTopics && relatedTopics.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
            Связанные темы
          </h4>
          <div className="space-y-2">
            {relatedTopics.map((related) => (
              <button
                key={related.id}
                onClick={() => onSelectTopic(related)}
                className="w-full text-left p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400">
                      {related.title}
                    </h5>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {related.shortDescription}
                    </p>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400 group-hover:text-sky-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Search Results Component
function SearchResults({
  results,
  query,
  onSelectTopic,
}: {
  results: HelpTopic[];
  query: string;
  onSelectTopic: (topic: HelpTopic) => void;
}) {
  if (results.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Ничего не найдено
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          По запросу "{query}" ничего не найдено. Попробуйте другие ключевые
          слова.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 px-2">
        Найдено результатов: {results.length}
      </p>
      <div className="space-y-2">
        {results.map((topic) => (
          <button
            key={topic.id}
            onClick={() => onSelectTopic(topic)}
            className="w-full text-left p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-sky-600 dark:text-sky-400"
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
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400">
                  {topic.title}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                  {topic.shortDescription}
                </p>
                <span className="inline-block mt-2 text-xs text-gray-400 dark:text-gray-500">
                  {helpCategories[topic.category] || topic.category}
                </span>
              </div>
              <svg
                className="w-5 h-5 text-gray-400 group-hover:text-sky-500 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Browse Topics Component
function BrowseTopics({
  topicsByCategory,
  recentTopics,
  onSelectTopic,
}: {
  topicsByCategory: Record<string, HelpTopic[]>;
  recentTopics: HelpTopic[];
  onSelectTopic: (topic: HelpTopic) => void;
}) {
  return (
    <div className="p-6 space-y-8">
      {/* Recent Topics */}
      {recentTopics.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Недавно просмотренные
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {recentTopics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => onSelectTopic(topic)}
                className="text-left p-3 rounded-lg bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors group"
              >
                <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 text-sm">
                  {topic.title}
                </h4>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Browse by Category */}
      {Object.entries(topicsByCategory).map(([category, topics]) => (
        <div key={category}>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            {helpCategories[category] || category}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {topics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => onSelectTopic(topic)}
                className="text-left p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-sky-100 dark:group-hover:bg-sky-900/30">
                    <svg
                      className="w-4 h-4 text-gray-500 group-hover:text-sky-600 dark:group-hover:text-sky-400"
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
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 text-sm">
                      {topic.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {topic.shortDescription}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
