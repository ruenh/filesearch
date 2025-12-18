/**
 * Widget Renderer - Renders the appropriate widget based on type
 * Requirements: 81.1, 81.2
 */
import { useQuery } from "@tanstack/react-query";
import {
  getDashboard,
  getSearchTrends,
  type DashboardData,
} from "@/api/analytics";
import { type Widget } from "@/store/useWidgetStore";

interface WidgetRendererProps {
  widget: Widget;
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

export function WidgetRenderer({ widget, storageId }: WidgetRendererProps) {
  const periodDays = (widget.settings.periodDays as number) || 30;

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ["widget-dashboard", storageId, periodDays],
    queryFn: () => getDashboard({ storage_id: storageId, days: periodDays }),
    enabled: [
      "stats",
      "file-types",
      "activity",
      "popular-docs",
      "recent-activity",
      "storage-usage",
    ].includes(widget.type),
  });

  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ["widget-trends", storageId],
    queryFn: () => getSearchTrends({ storage_id: storageId, limit: 10 }),
    enabled: widget.type === "search-trends",
  });

  const isLoading = dashboardLoading || trendsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
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
    );
  }

  switch (widget.type) {
    case "stats":
      return <StatsWidget data={dashboardData} />;
    case "file-types":
      return <FileTypesWidget data={dashboardData} />;
    case "activity":
      return <ActivityWidget data={dashboardData} />;
    case "popular-docs":
      return <PopularDocsWidget data={dashboardData} />;
    case "recent-activity":
      return <RecentActivityWidget data={dashboardData} />;
    case "search-trends":
      return <SearchTrendsWidget data={trendsData} />;
    case "storage-usage":
      return <StorageUsageWidget data={dashboardData} />;
    case "quick-actions":
      return <QuickActionsWidget />;
    default:
      return <div className="text-gray-500">Неизвестный виджет</div>;
  }
}

// Stats Widget
function StatsWidget({ data }: { data?: DashboardData }) {
  if (!data || !data.storage_stats) return <EmptyState />;

  const stats = [
    {
      label: "Документов",
      value: data.storage_stats.total_documents ?? 0,
      color: "blue",
    },
    {
      label: "Размер",
      value: formatBytes(data.storage_stats.total_size_bytes ?? 0),
      color: "green",
    },
    {
      label: "Просмотров",
      value: data.storage_stats.total_views ?? 0,
      color: "purple",
    },
    {
      label: "Поисков",
      value: data.storage_stats.total_searches ?? 0,
      color: "orange",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
        >
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {typeof stat.value === "number"
              ? stat.value.toLocaleString()
              : stat.value}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}

// File Types Widget
function FileTypesWidget({ data }: { data?: DashboardData }) {
  if (!data || data.file_type_breakdown.length === 0) return <EmptyState />;

  const total = data.file_type_breakdown.reduce(
    (sum, item) => sum + item.count,
    0
  );

  return (
    <div className="space-y-2">
      {data.file_type_breakdown.slice(0, 5).map((item) => {
        const percentage = total > 0 ? (item.count / total) * 100 : 0;
        const color =
          FILE_TYPE_COLORS[item.file_type] || FILE_TYPE_COLORS.unknown;

        return (
          <div key={item.file_type} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-700 dark:text-gray-300 uppercase font-medium">
                {item.file_type}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {item.count} ({percentage.toFixed(0)}%)
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${percentage}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Activity Widget
function ActivityWidget({ data }: { data?: DashboardData }) {
  if (!data) return <EmptyState />;

  const { view_timeline, search_timeline } = data;
  if (view_timeline.length === 0 && search_timeline.length === 0) {
    return <EmptyState message="Нет данных за период" />;
  }

  // Merge and get last 7 days
  const dateMap = new Map<string, { views: number; searches: number }>();
  view_timeline.forEach((item) => {
    const existing = dateMap.get(item.date) || { views: 0, searches: 0 };
    existing.views = item.count;
    dateMap.set(item.date, existing);
  });
  search_timeline.forEach((item) => {
    const existing = dateMap.get(item.date) || { views: 0, searches: 0 };
    existing.searches = item.count;
    dateMap.set(item.date, existing);
  });

  const sortedDates = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7);

  const maxValue = Math.max(
    ...sortedDates.map(([, d]) => Math.max(d.views, d.searches))
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-gray-500">Просмотры</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-gray-500">Поиски</span>
        </div>
      </div>
      <div className="flex items-end gap-1 h-20">
        {sortedDates.map(([date, d]) => (
          <div key={date} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full flex gap-0.5 items-end h-16">
              <div
                className="flex-1 bg-blue-500 rounded-t"
                style={{
                  height:
                    maxValue > 0 ? `${(d.views / maxValue) * 100}%` : "0%",
                  minHeight: d.views > 0 ? "2px" : "0",
                }}
              />
              <div
                className="flex-1 bg-green-500 rounded-t"
                style={{
                  height:
                    maxValue > 0 ? `${(d.searches / maxValue) * 100}%` : "0%",
                  minHeight: d.searches > 0 ? "2px" : "0",
                }}
              />
            </div>
            <span className="text-[9px] text-gray-400">
              {new Date(date).getDate()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Popular Docs Widget
function PopularDocsWidget({ data }: { data?: DashboardData }) {
  if (!data || data.popular_documents.length === 0) return <EmptyState />;

  return (
    <div className="space-y-2">
      {data.popular_documents.slice(0, 4).map((doc, index) => (
        <div
          key={doc.document_id}
          className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50"
        >
          <span className="text-xs font-medium text-gray-400 w-4">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 dark:text-white truncate">
              {doc.name}
            </p>
            <p className="text-xs text-gray-500 uppercase">{doc.file_type}</p>
          </div>
          <span className="text-xs text-gray-400">{doc.view_count}</span>
        </div>
      ))}
    </div>
  );
}

// Recent Activity Widget
function RecentActivityWidget({ data }: { data?: DashboardData }) {
  if (!data || !data.recent_activity) return <EmptyState />;

  const actionLabels: Record<string, string> = {
    document_upload: "Загрузки",
    document_view: "Просмотры",
    document_update: "Обновления",
    document_delete: "Удаления",
    search_perform: "Поиски",
  };

  const actions = Object.entries(data.recent_activity.by_action || {}).slice(
    0,
    4
  );
  if (actions.length === 0) return <EmptyState message="Нет активности" />;

  const total = actions.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 mb-2">
        Всего: {data.recent_activity.total_activities.toLocaleString()}
      </p>
      {actions.map(([action, count]) => {
        const percentage = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={action} className="flex items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-400 w-20 truncate">
              {actionLabels[action] || action}
            </span>
            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 w-8 text-right">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Search Trends Widget
function SearchTrendsWidget({
  data,
}: {
  data?: { trends: Array<{ query: string; count: number }> };
}) {
  if (!data || data.trends.length === 0)
    return <EmptyState message="Нет поисковых запросов" />;

  return (
    <div className="space-y-2">
      {data.trends.slice(0, 5).map((trend, index) => (
        <div
          key={trend.query}
          className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
        >
          <span className="text-xs font-medium text-gray-400 w-4">
            {index + 1}
          </span>
          <span className="flex-1 text-sm text-gray-900 dark:text-white truncate">
            {trend.query}
          </span>
          <span className="text-xs text-gray-400">{trend.count}</span>
        </div>
      ))}
    </div>
  );
}

// Storage Usage Widget
function StorageUsageWidget({ data }: { data?: DashboardData }) {
  if (!data || !data.storage_stats) return <EmptyState />;

  const usedBytes = data.storage_stats.total_size_bytes ?? 0;
  const maxBytes = 10 * 1024 * 1024 * 1024; // 10GB limit example
  const percentage = Math.min((usedBytes / maxBytes) * 100, 100);

  return (
    <div className="space-y-3">
      <div className="text-center">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {formatBytes(usedBytes)}
        </p>
        <p className="text-xs text-gray-500">из {formatBytes(maxBytes)}</p>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            percentage > 80
              ? "bg-red-500"
              : percentage > 60
              ? "bg-yellow-500"
              : "bg-green-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-center text-gray-500">
        {percentage.toFixed(1)}% использовано
      </p>
    </div>
  );
}

// Quick Actions Widget
function QuickActionsWidget() {
  const actions = [
    { label: "Загрузить", icon: "upload", href: "/documents" },
    { label: "Поиск", icon: "search", href: "/search" },
    { label: "Аналитика", icon: "chart", href: "/analytics" },
    { label: "Настройки", icon: "settings", href: "/settings" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map((action) => (
        <a
          key={action.label}
          href={action.href}
          className="flex flex-col items-center gap-1 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <QuickActionIcon type={action.icon} />
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {action.label}
          </span>
        </a>
      ))}
    </div>
  );
}

function QuickActionIcon({ type }: { type: string }) {
  const iconClass = "w-5 h-5 text-gray-500 dark:text-gray-400";
  switch (type) {
    case "upload":
      return (
        <svg
          className={iconClass}
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
      );
    case "search":
      return (
        <svg
          className={iconClass}
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
    case "chart":
      return (
        <svg
          className={iconClass}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      );
    case "settings":
      return (
        <svg
          className={iconClass}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      );
    default:
      return null;
  }
}

// Empty State Component
function EmptyState({ message = "Нет данных" }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-6 text-gray-400 text-sm">
      {message}
    </div>
  );
}

export default WidgetRenderer;
