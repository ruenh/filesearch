/**
 * Widget Store - Manages dashboard widget state
 * Requirements: 81.1, 81.2, 81.3
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

// Widget types available in the system
export type WidgetType =
  | "stats"
  | "file-types"
  | "activity"
  | "popular-docs"
  | "recent-activity"
  | "search-trends"
  | "storage-usage"
  | "quick-actions";

// Widget size options
export type WidgetSize = "small" | "medium" | "large";

// Widget configuration
export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  size: WidgetSize;
  position: number;
  settings: Record<string, unknown>;
  isVisible: boolean;
}

// Available widget definitions
export interface WidgetDefinition {
  type: WidgetType;
  title: string;
  description: string;
  defaultSize: WidgetSize;
  icon: string;
}

export const availableWidgets: WidgetDefinition[] = [
  {
    type: "stats",
    title: "Статистика",
    description: "Основные показатели: документы, размер, просмотры",
    defaultSize: "large",
    icon: "chart-bar",
  },
  {
    type: "file-types",
    title: "Типы файлов",
    description: "Распределение документов по типам",
    defaultSize: "medium",
    icon: "document",
  },
  {
    type: "activity",
    title: "Активность",
    description: "График активности за период",
    defaultSize: "medium",
    icon: "activity",
  },
  {
    type: "popular-docs",
    title: "Популярные документы",
    description: "Самые просматриваемые документы",
    defaultSize: "medium",
    icon: "star",
  },
  {
    type: "recent-activity",
    title: "Последняя активность",
    description: "Сводка недавних действий",
    defaultSize: "medium",
    icon: "clock",
  },
  {
    type: "search-trends",
    title: "Тренды поиска",
    description: "Популярные поисковые запросы",
    defaultSize: "medium",
    icon: "search",
  },
  {
    type: "storage-usage",
    title: "Использование хранилища",
    description: "Объем занятого пространства",
    defaultSize: "small",
    icon: "database",
  },
  {
    type: "quick-actions",
    title: "Быстрые действия",
    description: "Часто используемые операции",
    defaultSize: "small",
    icon: "lightning",
  },
];

// Default widgets for new users
const defaultWidgets: Widget[] = [
  {
    id: "widget-stats-1",
    type: "stats",
    title: "Статистика",
    size: "large",
    position: 0,
    settings: {},
    isVisible: true,
  },
  {
    id: "widget-file-types-1",
    type: "file-types",
    title: "Типы файлов",
    size: "medium",
    position: 1,
    settings: {},
    isVisible: true,
  },
  {
    id: "widget-activity-1",
    type: "activity",
    title: "Активность",
    size: "medium",
    position: 2,
    settings: {},
    isVisible: true,
  },
  {
    id: "widget-popular-docs-1",
    type: "popular-docs",
    title: "Популярные документы",
    size: "medium",
    position: 3,
    settings: {},
    isVisible: true,
  },
];

interface WidgetState {
  widgets: Widget[];
  isEditMode: boolean;
  draggedWidgetId: string | null;

  // Actions - Requirements: 81.1, 81.2, 81.3
  addWidget: (type: WidgetType) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<Widget>) => void;
  reorderWidgets: (fromIndex: number, toIndex: number) => void;
  toggleWidgetVisibility: (id: string) => void;
  setEditMode: (enabled: boolean) => void;
  setDraggedWidgetId: (id: string | null) => void;
  resetToDefault: () => void;
}

export const useWidgetStore = create<WidgetState>()(
  persist(
    (set, get) => ({
      widgets: defaultWidgets,
      isEditMode: false,
      draggedWidgetId: null,

      // Requirement 81.1: Add widget to dashboard
      addWidget: (type) => {
        const definition = availableWidgets.find((w) => w.type === type);
        if (!definition) return;

        const newWidget: Widget = {
          id: `widget-${type}-${Date.now()}`,
          type,
          title: definition.title,
          size: definition.defaultSize,
          position: get().widgets.length,
          settings: {},
          isVisible: true,
        };

        set((state) => ({
          widgets: [...state.widgets, newWidget],
        }));
      },

      // Requirement 81.3: Remove widget from dashboard
      removeWidget: (id) => {
        set((state) => ({
          widgets: state.widgets
            .filter((w) => w.id !== id)
            .map((w, index) => ({ ...w, position: index })),
        }));
      },

      // Requirement 81.2: Update widget settings
      updateWidget: (id, updates) => {
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
        }));
      },

      // Drag to arrange - Requirement 81.2
      reorderWidgets: (fromIndex, toIndex) => {
        set((state) => {
          const widgets = [...state.widgets];
          const [removed] = widgets.splice(fromIndex, 1);
          widgets.splice(toIndex, 0, removed);
          return {
            widgets: widgets.map((w, index) => ({ ...w, position: index })),
          };
        });
      },

      toggleWidgetVisibility: (id) => {
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, isVisible: !w.isVisible } : w
          ),
        }));
      },

      setEditMode: (enabled) => set({ isEditMode: enabled }),
      setDraggedWidgetId: (id) => set({ draggedWidgetId: id }),

      resetToDefault: () => set({ widgets: defaultWidgets }),
    }),
    {
      name: "widget-storage",
      partialize: (state) => ({ widgets: state.widgets }),
    }
  )
);
