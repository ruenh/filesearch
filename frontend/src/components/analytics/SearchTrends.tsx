/**
 * SearchTrends component
 * Displays popular search terms with click-to-search functionality
 * Requirements: 60.2, 60.3
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getTrends,
  type TrendsData,
  type PopularSearch,
} from "@/api/analytics";

interface SearchTrendsProps {
  storageId?: string;
  onSearchClick?: (query: string) => void;
  limit?: number;
}

export function SearchTrends({
  storageId,
  onSearchClick,
  limit = 10,
}: SearchTrendsProps) {
  const [periodDays, setPeriodDays] = useState(30);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["search-trends", storageId, periodDays],
    queryFn: () =>
      getTrends({ storage_id: storageId, days: periodDays, type: "search" }),
  });

  const handleSearchClick = (query: string) => {
    if (onSearchClick) {
      onSearchClick(query);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="flex justify-center py-8">
          <svg
            className="animate-spin h-6 w-6 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">
            Не удалось загрузить тренды поиска
          </p>
          <button onClick={() => refetch()} className="btn btn-primary text-sm">
            Повторить
          </button>
        </div>
      </div>
    );
  }

  const popularSearches = data?.popular_searches?.slice(0, limit) || [];
  const searchStats = data?.search_stats;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Популярные запросы
        </h3>
        <select
          value={periodDays}
          onChange={(e) => setPeriodDays(Number(e.target.value))}
          className="input text-sm py-1 px-2"
        >
          <option value={7}>7 дней</option>
          <option value={30}>30 дней</option>
          <option value={60}>60 дней</option>
          <option value={90}>90 дней</option>
        </select>
      </div>

      {/* Stats Summary */}
      {searchStats && (
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {searchStats.total_searches.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Всего поисков
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {searchStats.avg_results.toFixed(1)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Ср. результатов
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {searchStats.avg_response_time_ms.toFixed(0)}
              <span className="text-sm font-normal">мс</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Ср. время
            </p>
          </div>
        </div>
      )}

      {/* Search Terms List */}
      {popularSearches.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          Нет данных о поисковых запросах
        </p>
      ) : (
        <div className="space-y-2">
          {popularSearches.map((search, index) => (
            <SearchTermItem
              key={search.query}
              search={search}
              rank={index + 1}
              maxCount={popularSearches[0]?.count || 1}
              onClick={() => handleSearchClick(search.query)}
            />
          ))}
        </div>
      )}

      {/* Search Timeline Chart */}
      {data?.search_trends && data.search_trends.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            Динамика поиска
          </h4>
          <SearchTimelineChart timeline={data.search_trends} />
        </div>
      )}
    </div>
  );
}

// Search Term Item Component
interface SearchTermItemProps {
  search: PopularSearch;
  rank: number;
  maxCount: number;
  onClick: () => void;
}

function SearchTermItem({
  search,
  rank,
  maxCount,
  onClick,
}: SearchTermItemProps) {
  const percentage = maxCount > 0 ? (search.count / maxCount) * 100 : 0;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left group"
    >
      {/* Rank */}
      <span
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
          rank <= 3
            ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
        }`}
      >
        {rank}
      </span>

      {/* Query and Bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {search.query}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
            {search.count}
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Search Icon */}
      <svg
        className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0"
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
    </button>
  );
}

// Search Timeline Chart Component
interface SearchTimelineChartProps {
  timeline: TrendsData["search_trends"];
}

function SearchTimelineChart({ timeline }: SearchTimelineChartProps) {
  if (!timeline || timeline.length === 0) return null;

  const sortedTimeline = [...timeline]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14); // Last 14 days

  const maxValue = Math.max(...sortedTimeline.map((item) => item.count));

  return (
    <div className="flex items-end gap-1 h-20">
      {sortedTimeline.map((item) => (
        <div
          key={item.date}
          className="flex-1 flex flex-col items-center gap-1"
          title={`${item.date}: ${item.count} поисков`}
        >
          <div
            className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
            style={{
              height: maxValue > 0 ? `${(item.count / maxValue) * 100}%` : "0%",
              minHeight: item.count > 0 ? "4px" : "0",
            }}
          />
          <span className="text-[9px] text-gray-400 truncate w-full text-center">
            {new Date(item.date).getDate()}
          </span>
        </div>
      ))}
    </div>
  );
}

export default SearchTrends;
