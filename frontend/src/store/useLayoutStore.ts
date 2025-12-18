import { create } from "zustand";
import { persist } from "zustand/middleware";

// Panel identifiers for the layout
export type PanelId = "sidebar" | "header" | "activityPanel" | "metadataPanel";

// Panel position options
export type PanelPosition = "left" | "right" | "top" | "bottom";

// Panel configuration
export interface PanelConfig {
  id: PanelId;
  visible: boolean;
  position?: PanelPosition;
  width?: number;
  collapsed?: boolean;
}

// Default panel configurations
const defaultPanelConfigs: Record<PanelId, PanelConfig> = {
  sidebar: {
    id: "sidebar",
    visible: true,
    position: "left",
    width: 256,
    collapsed: false,
  },
  header: {
    id: "header",
    visible: true,
    position: "top",
  },
  activityPanel: {
    id: "activityPanel",
    visible: true,
    position: "right",
    width: 320,
    collapsed: true,
  },
  metadataPanel: {
    id: "metadataPanel",
    visible: true,
    position: "right",
    width: 280,
    collapsed: true,
  },
};

// Layout preset types
export type LayoutPreset = "default" | "compact" | "focused" | "wide";

interface LayoutState {
  // Panel configurations
  panels: Record<PanelId, PanelConfig>;

  // Current layout preset
  currentPreset: LayoutPreset;

  // Compact mode (reduces padding/margins)
  compactMode: boolean;

  // Content area width preference
  contentMaxWidth: "full" | "wide" | "normal" | "narrow";

  // Actions
  setPanelVisibility: (panelId: PanelId, visible: boolean) => void;
  setPanelWidth: (panelId: PanelId, width: number) => void;
  setPanelCollapsed: (panelId: PanelId, collapsed: boolean) => void;
  togglePanelVisibility: (panelId: PanelId) => void;
  togglePanelCollapsed: (panelId: PanelId) => void;
  setCompactMode: (compact: boolean) => void;
  setContentMaxWidth: (width: "full" | "wide" | "normal" | "narrow") => void;
  applyPreset: (preset: LayoutPreset) => void;
  resetLayout: () => void;
}

// Preset configurations
const presetConfigs: Record<LayoutPreset, Partial<LayoutState>> = {
  default: {
    panels: { ...defaultPanelConfigs },
    compactMode: false,
    contentMaxWidth: "normal",
  },
  compact: {
    panels: {
      ...defaultPanelConfigs,
      sidebar: { ...defaultPanelConfigs.sidebar, width: 200 },
    },
    compactMode: true,
    contentMaxWidth: "wide",
  },
  focused: {
    panels: {
      ...defaultPanelConfigs,
      sidebar: { ...defaultPanelConfigs.sidebar, collapsed: true },
      activityPanel: { ...defaultPanelConfigs.activityPanel, visible: false },
      metadataPanel: { ...defaultPanelConfigs.metadataPanel, visible: false },
    },
    compactMode: false,
    contentMaxWidth: "normal",
  },
  wide: {
    panels: { ...defaultPanelConfigs },
    compactMode: false,
    contentMaxWidth: "full",
  },
};

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      // Initial state
      panels: { ...defaultPanelConfigs },
      currentPreset: "default",
      compactMode: false,
      contentMaxWidth: "normal",

      // Set panel visibility (Requirements 80.2)
      setPanelVisibility: (panelId, visible) =>
        set((state) => ({
          panels: {
            ...state.panels,
            [panelId]: { ...state.panels[panelId], visible },
          },
          currentPreset: "default", // Reset preset when manually changing
        })),

      // Set panel width
      setPanelWidth: (panelId, width) =>
        set((state) => ({
          panels: {
            ...state.panels,
            [panelId]: { ...state.panels[panelId], width },
          },
          currentPreset: "default",
        })),

      // Set panel collapsed state
      setPanelCollapsed: (panelId, collapsed) =>
        set((state) => ({
          panels: {
            ...state.panels,
            [panelId]: { ...state.panels[panelId], collapsed },
          },
        })),

      // Toggle panel visibility
      togglePanelVisibility: (panelId) =>
        set((state) => ({
          panels: {
            ...state.panels,
            [panelId]: {
              ...state.panels[panelId],
              visible: !state.panels[panelId].visible,
            },
          },
          currentPreset: "default",
        })),

      // Toggle panel collapsed
      togglePanelCollapsed: (panelId) =>
        set((state) => ({
          panels: {
            ...state.panels,
            [panelId]: {
              ...state.panels[panelId],
              collapsed: !state.panels[panelId].collapsed,
            },
          },
        })),

      // Set compact mode
      setCompactMode: (compact) =>
        set({ compactMode: compact, currentPreset: "default" }),

      // Set content max width
      setContentMaxWidth: (width) =>
        set({ contentMaxWidth: width, currentPreset: "default" }),

      // Apply a layout preset (Requirements 80.1)
      applyPreset: (preset) => {
        const config = presetConfigs[preset];
        set({
          panels: config.panels
            ? { ...defaultPanelConfigs, ...config.panels }
            : get().panels,
          compactMode: config.compactMode ?? get().compactMode,
          contentMaxWidth: config.contentMaxWidth ?? get().contentMaxWidth,
          currentPreset: preset,
        });
      },

      // Reset to default layout (Requirements 80.3)
      resetLayout: () =>
        set({
          panels: { ...defaultPanelConfigs },
          currentPreset: "default",
          compactMode: false,
          contentMaxWidth: "normal",
        }),
    }),
    {
      name: "layout-storage", // localStorage key
    }
  )
);

// Helper function to get content max width class
export function getContentMaxWidthClass(
  width: "full" | "wide" | "normal" | "narrow"
): string {
  switch (width) {
    case "full":
      return "max-w-full";
    case "wide":
      return "max-w-screen-2xl";
    case "normal":
      return "max-w-7xl";
    case "narrow":
      return "max-w-4xl";
    default:
      return "max-w-7xl";
  }
}
