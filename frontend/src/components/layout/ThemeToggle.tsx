import { useThemeStore } from "@/store";

// Sun icon for light mode
const SunIcon = () => (
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
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

// Moon icon for dark mode
const MoonIcon = () => (
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
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
    />
  </svg>
);

// System icon for system preference
const SystemIcon = () => (
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
      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  // Determine which icon to show based on current theme
  const getIcon = () => {
    switch (theme) {
      case "dark":
        return <MoonIcon />;
      case "light":
        return <SunIcon />;
      case "system":
        return <SystemIcon />;
      default:
        return <SunIcon />;
    }
  };

  // Get the label for accessibility
  const getLabel = () => {
    switch (theme) {
      case "dark":
        return "Тёмная тема (нажмите для светлой)";
      case "light":
        return "Светлая тема (нажмите для тёмной)";
      case "system":
        return "Системная тема";
      default:
        return "Переключить тему";
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
      aria-label={getLabel()}
      title={getLabel()}
    >
      <div className="transition-transform duration-200 hover:scale-110">
        {getIcon()}
      </div>
    </button>
  );
}

/** Extended theme toggle with dropdown for all options */
export function ThemeToggleDropdown() {
  const { theme, setTheme } = useThemeStore();

  const options = [
    { value: "light" as const, label: "Светлая", icon: <SunIcon /> },
    { value: "dark" as const, label: "Тёмная", icon: <MoonIcon /> },
    { value: "system" as const, label: "Системная", icon: <SystemIcon /> },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => setTheme(option.value)}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
            ${
              theme === option.value
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }
          `}
          aria-pressed={theme === option.value}
        >
          {option.icon}
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
