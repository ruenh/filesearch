/**
 * Analytics Dashboard component
 * Displays storage usage, file type breakdown, and activity timeline
 * Requirements: 57.1, 57.2
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboard, type DashboardData } from "@/api/analytics";

interface DashboardProps {
  storageId?: string;
}

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// File type colors
const FILE_TYPE_COLORS: Record<string, string> = {
  pdf: "#ef4444",
  txt: "#3b82f6",
  md: "#8b5cf6",
  docx: "#2563eb",
  image: "#10b981",
  unknown: "#6b7280",
};

export function Dashboard({ storageId }: DashboardProps) {
  const [periodDays, setPeriodDays] = useState(30);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["analytics-dashboard", storageId, periodDays],
    queryFn: () => getDashboard({ storage_id: storageId, days: periodDays }),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <svg
          className="animate-spin h-8 w-8 text-blue-500"
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
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">Не удалось загрузить аналитику</p>
        <button onClick={() => refetch()} className="btn btn-primary">
          Повторить
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Аналитика
        </h2>
        <select
          value={periodDays}
          onChange={(e) => setPeriodDays(Number(e.target.value))}
          className="input text-sm py-1.5"
        >
          <option value={7}>7 дней</option>
          <option value={30}>30 дней</option>
          <option value={60}>60 дней</option>
          <option value={90}>90 дней</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Документов"
          value={data.storage_stats.total_documents}
          icon={<DocumentIcon />}
          color="blue"
        />
        <StatCard
          title="Размер"
          value={formatBytes(data.storage_stats.total_size_bytes)}
          icon={<StorageIcon />}
          color="green"
        />
        <StatCard
          title="Просмотров"
          value={data.storage_stats.total_views}
          icon={<ViewIcon />}
          color="purple"
        />
        <StatCard
          title="Поисков"
          value={data.storage_stats.total_searches}
          icon={<SearchIcon />}
          color="orange"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* File Type Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Типы файлов
          </h3>
          <FileTypeChart breakdown={data.file_type_breakdown} />
        </div>

        {/* Activity Timeline */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Активность
          </h3>
          <ActivityTimeline
            viewTimeline={data.view_timeline}
            searchTimeline={data.search_timeline}
          />
        </div>
      </div>

      {/* Popular Content Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Documents */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Популярные документы
          </h3>
          <PopularDocumentsList documents={data.popular_documents} />
        </div>

        {/* Recent Activity Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Сводка активности
          </h3>
          <ActivitySummaryChart activity={data.recent_activity} />
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: "blue" | "green" | "purple" | "orange";
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    green:
      "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    purple:
      "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    orange:
      "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
        </div>
      </div>
    </div>
  );
}

// File Type Chart Component
interface FileTypeChartProps {
  breakdown: DashboardData["file_type_breakdown"];
}

function FileTypeChart({ breakdown }: FileTypeChartProps) {
  if (breakdown.length === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400 text-center py-8">
        Нет данных
      </p>
    );
  }

  const total = breakdown.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="space-y-3">
      {breakdown.map((item) => {
        const percentage = total > 0 ? (item.count / total) * 100 : 0;
        const color =
          FILE_TYPE_COLORS[item.file_type] || FILE_TYPE_COLORS.unknown;

        return (
          <div key={item.file_type} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300 uppercase">
                {item.file_type}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {item.count} ({percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Activity Timeline Component
interface ActivityTimelineProps {
  viewTimeline: DashboardData["view_timeline"];
  searchTimeline: DashboardData["search_timeline"];
}

function ActivityTimeline({
  viewTimeline,
  searchTimeline,
}: ActivityTimelineProps) {
  if (viewTimeline.length === 0 && searchTimeline.length === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400 text-center py-8">
        Нет данных за выбранный период
      </p>
    );
  }

  // Merge timelines by date
  const dateMap = new Map<string, { views: number; searches: number }>();

  viewTimeline.forEach((item) => {
    const existing = dateMap.get(item.date) || { views: 0, searches: 0 };
    existing.views = item.count;
    dateMap.set(item.date, existing);
  });

  searchTimeline.forEach((item) => {
    const existing = dateMap.get(item.date) || { views: 0, searches: 0 };
    existing.searches = item.count;
    dateMap.set(item.date, existing);
  });

  const sortedDates = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14); // Last 14 days

  const maxValue = Math.max(
    ...sortedDates.map(([, data]) => Math.max(data.views, data.searches))
  );

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-gray-600 dark:text-gray-400">Просмотры</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-600 dark:text-gray-400">Поиски</span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex items-end gap-1 h-32">
        {sortedDates.map(([date, data]) => (
          <div
            key={date}
            className="flex-1 flex flex-col items-center gap-1"
            title={`${date}: ${data.views} просмотров, ${data.searches} поисков`}
          >
            <div className="w-full flex gap-0.5 items-end h-24">
              <div
                className="flex-1 bg-blue-500 rounded-t transition-all duration-300"
                style={{
                  height:
                    maxValue > 0 ? `${(data.views / maxValue) * 100}%` : "0%",
                  minHeight: data.views > 0 ? "4px" : "0",
                }}
              />
              <div
                className="flex-1 bg-green-500 rounded-t transition-all duration-300"
                style={{
                  height:
                    maxValue > 0
                      ? `${(data.searches / maxValue) * 100}%`
                      : "0%",
                  minHeight: data.searches > 0 ? "4px" : "0",
                }}
              />
            </div>
            <span className="text-[10px] text-gray-400 truncate w-full text-center">
              {new Date(date).getDate()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Popular Documents List Component
interface PopularDocumentsListProps {
  documents: DashboardData["popular_documents"];
}

function PopularDocumentsList({ documents }: PopularDocumentsListProps) {
  if (documents.length === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400 text-center py-8">
        Нет данных
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {documents.slice(0, 5).map((doc, index) => (
        <div
          key={doc.document_id}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-400 w-5">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {doc.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">
              {doc.file_type}
            </p>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {doc.view_count} просм.
          </span>
        </div>
      ))}
    </div>
  );
}

// Activity Summary Chart Component
interface ActivitySummaryChartProps {
  activity: DashboardData["recent_activity"];
}

function ActivitySummaryChart({ activity }: ActivitySummaryChartProps) {
  const actions = Object.entries(activity.by_action);

  if (actions.length === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400 text-center py-8">
        Нет активности
      </p>
    );
  }

  const total = actions.reduce((sum, [, count]) => sum + count, 0);

  // Action labels
  const actionLabels: Record<string, string> = {
    document_upload: "Загрузки",
    document_view: "Просмотры",
    document_update: "Обновления",
    document_delete: "Удаления",
    search_perform: "Поиски",
    comment_add: "Комментарии",
    share_create: "Шаринг",
    ai_chat: "AI чат",
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Всего действий: {activity.total_activities.toLocaleString()}
      </p>
      {actions.slice(0, 6).map(([action, count]) => {
        const percentage = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={action} className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400 w-24 truncate">
              {actionLabels[action] || action}
            </span>
            <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400 w-12 text-right">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Icons
function DocumentIcon() {
  return (
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
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function StorageIcon() {
  return (
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
        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
      />
    </svg>
  );
}

function ViewIcon() {
  return (
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
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
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
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

export default Dashboard;
