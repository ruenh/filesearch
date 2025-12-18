/**
 * Dashboard Page - Main dashboard with configurable widgets
 * Requirements: 81.1, 81.2, 81.3
 */
import { useState } from "react";
import { StorageList, CreateStorageModal } from "@/components/storage";
import { WidgetGrid } from "@/components/widgets";
import { useAppStore } from "@/store";

export function Dashboard() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"widgets" | "storages">("widgets");
  const { currentStorageId } = useAppStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Добро пожаловать в File Search
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Управляйте хранилищами и документами для интеллектуального поиска
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab("widgets")}
            className={`
              pb-3 px-1 text-sm font-medium border-b-2 transition-colors
              ${
                activeTab === "widgets"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }
            `}
          >
            Дашборд
          </button>
          <button
            onClick={() => setActiveTab("storages")}
            className={`
              pb-3 px-1 text-sm font-medium border-b-2 transition-colors
              ${
                activeTab === "storages"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }
            `}
          >
            Хранилища
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "widgets" ? (
        <WidgetGrid storageId={currentStorageId || undefined} />
      ) : (
        <>
          {/* Storage List */}
          <StorageList onCreateClick={() => setIsCreateModalOpen(true)} />

          {/* Create Storage Modal */}
          <CreateStorageModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
          />
        </>
      )}
    </div>
  );
}
