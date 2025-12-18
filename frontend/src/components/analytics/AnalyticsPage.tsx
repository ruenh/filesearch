/**
 * AnalyticsPage component
 * Main analytics page combining Dashboard, SearchTrends, and ReportExport
 * Requirements: 57.1, 57.2, 58.3, 59.1, 60.2, 60.3
 */
import { useState } from "react";
import { Dashboard } from "./Dashboard";
import { SearchTrends } from "./SearchTrends";
import { ReportExport } from "./ReportExport";

interface AnalyticsPageProps {
  storageId?: string;
  onSearchClick?: (query: string) => void;
}

type TabType = "dashboard" | "trends" | "export";

export function AnalyticsPage({
  storageId,
  onSearchClick,
}: AnalyticsPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: "dashboard",
      label: "Обзор",
      icon: (
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
            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
          />
        </svg>
      ),
    },
    {
      id: "trends",
      label: "Тренды поиска",
      icon: (
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
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
    },
    {
      id: "export",
      label: "Экспорт",
      icon: (
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
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Аналитика
        </h1>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "dashboard" && <Dashboard storageId={storageId} />}
        {activeTab === "trends" && (
          <SearchTrends storageId={storageId} onSearchClick={onSearchClick} />
        )}
        {activeTab === "export" && <ReportExport storageId={storageId} />}
      </div>
    </div>
  );
}

export default AnalyticsPage;
