import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ShortcutAction {
  id: string;
  name: string;
  description: string;
  defaultKey: string;
  category: "navigation" | "documents" | "search" | "general";
}

interface ShortcutsState {
  customShortcuts: Record<string, string>;
  isHelpModalOpen: boolean;
  setCustomShortcut: (actionId: string, key: string) => void;
  resetShortcut: (actionId: string) => void;
  resetAllShortcuts: () => void;
  openHelpModal: () => void;
  closeHelpModal: () => void;
  toggleHelpModal: () => void;
}

// Default keyboard shortcuts - Requirements 79.1, 79.2
export const defaultShortcuts: ShortcutAction[] = [
  // Navigation shortcuts
  {
    id: "go-home",
    name: "Главная",
    description: "Перейти на главную страницу",
    defaultKey: "g h",
    category: "navigation",
  },
  {
    id: "go-documents",
    name: "Документы",
    description: "Перейти к документам",
    defaultKey: "g d",
    category: "navigation",
  },
  {
    id: "go-favorites",
    name: "Избранное",
    description: "Перейти к избранному",
    defaultKey: "g f",
    category: "navigation",
  },
  {
    id: "go-archive",
    name: "Архив",
    description: "Перейти к архиву",
    defaultKey: "g a",
    category: "navigation",
  },
  {
    id: "go-settings",
    name: "Настройки",
    description: "Перейти к настройкам",
    defaultKey: "g s",
    category: "navigation",
  },
  // Search shortcuts
  {
    id: "focus-search",
    name: "Поиск",
    description: "Фокус на поле поиска",
    defaultKey: "/",
    category: "search",
  },
  {
    id: "go-search",
    name: "Страница поиска",
    description: "Перейти на страницу поиска",
    defaultKey: "g /",
    category: "search",
  },
  // Document shortcuts
  {
    id: "new-document",
    name: "Новый документ",
    description: "Создать новый документ",
    defaultKey: "n",
    category: "documents",
  },
  {
    id: "delete-document",
    name: "Удалить",
    description: "Удалить выбранный документ",
    defaultKey: "Delete",
    category: "documents",
  },
  {
    id: "favorite-document",
    name: "В избранное",
    description: "Добавить/убрать из избранного",
    defaultKey: "f",
    category: "documents",
  },
  // General shortcuts
  {
    id: "show-shortcuts",
    name: "Справка по горячим клавишам",
    description: "Показать список горячих клавиш",
    defaultKey: "?",
    category: "general",
  },
  {
    id: "toggle-theme",
    name: "Переключить тему",
    description: "Переключить светлую/темную тему",
    defaultKey: "t",
    category: "general",
  },
  {
    id: "escape",
    name: "Закрыть",
    description: "Закрыть модальное окно / отменить",
    defaultKey: "Escape",
    category: "general",
  },
  {
    id: "show-help",
    name: "Справка",
    description: "Открыть справку",
    defaultKey: "F1",
    category: "general",
  },
];

export const useShortcutsStore = create<ShortcutsState>()(
  persist(
    (set) => ({
      customShortcuts: {},
      isHelpModalOpen: false,

      // Requirements 79.3 - Save custom bindings
      setCustomShortcut: (actionId, key) =>
        set((state) => ({
          customShortcuts: { ...state.customShortcuts, [actionId]: key },
        })),

      resetShortcut: (actionId) =>
        set((state) => {
          const { [actionId]: _, ...rest } = state.customShortcuts;
          return { customShortcuts: rest };
        }),

      resetAllShortcuts: () => set({ customShortcuts: {} }),

      openHelpModal: () => set({ isHelpModalOpen: true }),
      closeHelpModal: () => set({ isHelpModalOpen: false }),
      toggleHelpModal: () =>
        set((state) => ({ isHelpModalOpen: !state.isHelpModalOpen })),
    }),
    {
      name: "shortcuts-storage",
      partialize: (state) => ({ customShortcuts: state.customShortcuts }),
    }
  )
);

// Helper to get the effective shortcut key for an action
export function getShortcutKey(
  actionId: string,
  customShortcuts: Record<string, string>
): string {
  if (customShortcuts[actionId]) {
    return customShortcuts[actionId];
  }
  const action = defaultShortcuts.find((s) => s.id === actionId);
  return action?.defaultKey || "";
}

// Helper to format shortcut key for display
export function formatShortcutKey(key: string): string {
  return key
    .split(" ")
    .map((k) => {
      switch (k.toLowerCase()) {
        case "ctrl":
          return "Ctrl";
        case "alt":
          return "Alt";
        case "shift":
          return "Shift";
        case "meta":
          return "⌘";
        case "escape":
          return "Esc";
        case "delete":
          return "Del";
        case "arrowup":
          return "↑";
        case "arrowdown":
          return "↓";
        case "arrowleft":
          return "←";
        case "arrowright":
          return "→";
        default:
          return k.toUpperCase();
      }
    })
    .join(" + ");
}
