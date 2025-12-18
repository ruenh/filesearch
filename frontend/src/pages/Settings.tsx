import { useState } from "react";
import {
  APIKeyManager,
  WebhookManager,
  LayoutSettings,
} from "../components/settings";
import { OfflineSettings } from "../components/pwa";
import { ShortcutsSettings } from "../components/shortcuts";
import { useOnboardingStore } from "../store/useOnboardingStore";

type SettingsTab =
  | "general"
  | "layout"
  | "shortcuts"
  | "offline"
  | "api-keys"
  | "webhooks";

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const { hasCompletedOnboarding, resetOnboarding, startTour } =
    useOnboardingStore();

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "general", label: "Общие" },
    { id: "layout", label: "Макет" },
    { id: "shortcuts", label: "Горячие клавиши" },
    { id: "offline", label: "Офлайн режим" },
    { id: "api-keys", label: "API ключи" },
    { id: "webhooks", label: "Webhooks" },
  ];

  const handleRestartOnboarding = () => {
    resetOnboarding();
    startTour();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Настройки
      </h1>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "general" && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Общие настройки</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Настройки приложения будут доступны здесь.
            </p>
          </div>

          {/* Onboarding Section - Requirements 82.1, 82.2, 82.3 */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Обучение</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900 dark:text-white font-medium">
                  Обзор интерфейса
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {hasCompletedOnboarding
                    ? "Вы уже прошли обзор. Можете пройти его снова."
                    : "Пройдите краткий обзор основных функций системы."}
                </p>
              </div>
              <button
                onClick={handleRestartOnboarding}
                className="btn btn-secondary flex items-center gap-2"
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {hasCompletedOnboarding ? "Пройти снова" : "Начать обзор"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "layout" && <LayoutSettings />}

      {activeTab === "shortcuts" && <ShortcutsSettings />}

      {activeTab === "offline" && <OfflineSettings />}

      {activeTab === "api-keys" && <APIKeyManager />}

      {activeTab === "webhooks" && <WebhookManager />}
    </div>
  );
}
