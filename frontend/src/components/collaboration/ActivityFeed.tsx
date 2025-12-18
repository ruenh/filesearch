/**
 * ActivityFeed component
 * Displays chronological activity feed with filtering
 * Requirements: 53.2, 53.3
 */
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getActivity,
  getActivityTypes,
  type ActivityLog,
  type GetActivityParams,
} from "@/api/activity";

interface ActivityFeedProps {
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  limit?: number;
  showFilters?: boolean;
  title?: string;
}

// Action type icons mapping
const ACTION_ICONS: Record<string, ReactNode> = {
  document_upload: (
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
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    </svg>
  ),
  document_view: (
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
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  ),
  document_update: (
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
  ),
  document_delete: (
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
  ),
  storage_create: (
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
        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
      />
    </svg>
  ),
  folder_create: (
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
        d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
      />
    </svg>
  ),
  search_perform: (
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
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  ),
  comment_add: (
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
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  ),
  share_create: (
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
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
      />
    </svg>
  ),
  user_login: (
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
        d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
      />
    </svg>
  ),
  ai_chat: (
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
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  ),
};

// Default icon for unknown actions
const DEFAULT_ICON = (
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
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

// Action type colors
const ACTION_COLORS: Record<string, string> = {
  document_upload:
    "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  document_delete:
    "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  document_update:
    "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  document_view:
    "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  storage_create:
    "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  storage_delete:
    "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  folder_create:
    "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
  search_perform:
    "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
  comment_add:
    "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
  share_create:
    "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
  user_login:
    "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",
  ai_chat:
    "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
};

const DEFAULT_COLOR =
  "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";

export function ActivityFeed({
  userId,
  resourceType,
  resourceId,
  limit = 50,
  showFilters = true,
  title = "Лента активности",
}: ActivityFeedProps) {
  const [actionFilter, setActionFilter] = useState<string>("");
  const [offset, setOffset] = useState(0);

  // Build query params
  const queryParams: GetActivityParams = {
    limit,
    offset,
  };
  if (actionFilter) queryParams.filter = actionFilter;
  if (userId) queryParams.user_id = userId;
  if (resourceType) queryParams.resource_type = resourceType;
  if (resourceId) queryParams.resource_id = resourceId;

  // Fetch activities
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["activity", queryParams],
    queryFn: () => getActivity(queryParams),
  });

  // Fetch action types for filter dropdown
  const { data: typesData } = useQuery({
    queryKey: ["activityTypes"],
    queryFn: getActivityTypes,
    enabled: showFilters,
  });

  // Format relative time
  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "только что";
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays < 7) return `${diffDays} дн. назад`;

    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get icon for action
  const getActionIcon = (action: string) => {
    return ACTION_ICONS[action] || DEFAULT_ICON;
  };

  // Get color for action
  const getActionColor = (action: string) => {
    return ACTION_COLORS[action] || DEFAULT_COLOR;
  };

  // Handle pagination
  const handleLoadMore = () => {
    if (data?.has_more) {
      setOffset((prev) => prev + limit);
    }
  };

  const handleLoadPrevious = () => {
    setOffset((prev) => Math.max(0, prev - limit));
  };

  // Reset offset when filter changes
  const handleFilterChange = (value: string) => {
    setActionFilter(value);
    setOffset(0);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <svg
          className="animate-spin h-6 w-6 text-gray-400"
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
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8 text-red-500">
        Не удалось загрузить ленту активности
      </div>
    );
  }

  const activities = data?.activities || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
          {total > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({total})
            </span>
          )}
        </h3>
        {isFetching && !isLoading && (
          <svg
            className="animate-spin h-4 w-4 text-gray-400"
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
        )}
      </div>

      {/* Filters */}
      {showFilters && typesData && (
        <div className="flex gap-2">
          <select
            value={actionFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="input text-sm py-1.5"
          >
            <option value="">Все действия</option>
            {Object.entries(typesData.action_types).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Activity list */}
      <div className="space-y-3">
        {activities.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            Нет активности для отображения
          </p>
        ) : (
          activities.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              getActionIcon={getActionIcon}
              getActionColor={getActionColor}
              formatRelativeTime={formatRelativeTime}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleLoadPrevious}
            disabled={offset === 0}
            className="btn btn-secondary text-sm disabled:opacity-50"
          >
            ← Назад
          </button>
          <span className="text-sm text-gray-500">
            {offset + 1} - {Math.min(offset + activities.length, total)} из{" "}
            {total}
          </span>
          <button
            onClick={handleLoadMore}
            disabled={!data?.has_more}
            className="btn btn-secondary text-sm disabled:opacity-50"
          >
            Далее →
          </button>
        </div>
      )}
    </div>
  );
}

// Individual activity item component
interface ActivityItemProps {
  activity: ActivityLog;
  getActionIcon: (action: string) => ReactNode;
  getActionColor: (action: string) => string;
  formatRelativeTime: (timestamp: string) => string;
}

function ActivityItem({
  activity,
  getActionIcon,
  getActionColor,
  formatRelativeTime,
}: ActivityItemProps) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors">
      {/* Icon */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getActionColor(
          activity.action
        )}`}
      >
        {getActionIcon(activity.action)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* User */}
          {activity.user && (
            <span className="font-medium text-gray-900 dark:text-white text-sm">
              {activity.user.name}
            </span>
          )}
          {!activity.user && activity.user_id && (
            <span className="font-medium text-gray-500 dark:text-gray-400 text-sm">
              Пользователь
            </span>
          )}
          {!activity.user && !activity.user_id && (
            <span className="font-medium text-gray-500 dark:text-gray-400 text-sm">
              Система
            </span>
          )}

          {/* Action description */}
          <span className="text-gray-600 dark:text-gray-300 text-sm">
            {activity.action_description.toLowerCase()}
          </span>

          {/* Resource name */}
          {activity.resource_name && (
            <span className="font-medium text-blue-600 dark:text-blue-400 text-sm truncate max-w-[200px]">
              "{activity.resource_name}"
            </span>
          )}
        </div>

        {/* Details */}
        {activity.details && Object.keys(activity.details).length > 0 && (
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {activity.details.query != null && (
              <span>
                Запрос: "{String(activity.details.query).slice(0, 50)}"
              </span>
            )}
            {activity.details.results_count != null && (
              <span className="ml-2">
                Результатов: {String(activity.details.results_count)}
              </span>
            )}
          </div>
        )}

        {/* Timestamp */}
        <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {formatRelativeTime(activity.timestamp)}
        </div>
      </div>
    </div>
  );
}

export default ActivityFeed;
