import {
  useLayoutStore,
  type PanelId,
  type LayoutPreset,
} from "@/store/useLayoutStore";

// Panel display names
const panelNames: Record<PanelId, string> = {
  sidebar: "Боковая панель",
  header: "Верхняя панель",
  activityPanel: "Панель активности",
  metadataPanel: "Панель метаданных",
};

// Preset display names and descriptions
const presetInfo: Record<LayoutPreset, { name: string; description: string }> =
  {
    default: {
      name: "По умолчанию",
      description: "Стандартный макет со всеми панелями",
    },
    compact: {
      name: "Компактный",
      description: "Уменьшенные отступы и узкая боковая панель",
    },
    focused: {
      name: "Фокус",
      description: "Минимум отвлекающих элементов для работы с контентом",
    },
    wide: {
      name: "Широкий",
      description: "Максимальная ширина контента",
    },
  };

// Content width options
const contentWidthOptions: {
  value: "full" | "wide" | "normal" | "narrow";
  label: string;
}[] = [
  { value: "full", label: "Полная ширина" },
  { value: "wide", label: "Широкий" },
  { value: "normal", label: "Обычный" },
  { value: "narrow", label: "Узкий" },
];

export function LayoutSettings() {
  const {
    panels,
    currentPreset,
    compactMode,
    contentMaxWidth,
    setPanelVisibility,
    setCompactMode,
    setContentMaxWidth,
    applyPreset,
    resetLayout,
  } = useLayoutStore();

  return (
    <div className="space-y-6">
      {/* Layout Presets - Requirements 80.1 */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Макеты</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Выберите готовый макет или настройте панели вручную
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.keys(presetInfo) as LayoutPreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => applyPreset(preset)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                currentPreset === preset
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-900 dark:text-white">
                  {presetInfo[preset].name}
                </span>
                {currentPreset === preset && (
                  <svg
                    className="w-5 h-5 text-blue-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {presetInfo[preset].description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Panel Visibility - Requirements 80.2 */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Видимость панелей</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Скройте или покажите отдельные панели интерфейса
        </p>
        <div className="space-y-3">
          {(Object.keys(panels) as PanelId[]).map((panelId) => (
            <div
              key={panelId}
              className="flex items-center justify-between py-2"
            >
              <span className="text-gray-900 dark:text-white">
                {panelNames[panelId]}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={panels[panelId].visible}
                  onChange={(e) =>
                    setPanelVisibility(panelId, e.target.checked)
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Content Width */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Ширина контента</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Настройте максимальную ширину области контента
        </p>
        <div className="flex flex-wrap gap-2">
          {contentWidthOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setContentMaxWidth(option.value)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                contentMaxWidth === option.value
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                  : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Compact Mode */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Дополнительно</h2>
        <div className="flex items-center justify-between py-2">
          <div>
            <span className="text-gray-900 dark:text-white font-medium">
              Компактный режим
            </span>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Уменьшает отступы и размеры элементов
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={compactMode}
              onChange={(e) => setCompactMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Reset Button - Requirements 80.3 */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Сброс настроек</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Восстановить настройки макета по умолчанию
        </p>
        <button
          onClick={resetLayout}
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
          Сбросить макет
        </button>
      </div>
    </div>
  );
}
