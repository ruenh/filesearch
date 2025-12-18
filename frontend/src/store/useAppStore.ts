import { create } from "zustand";

interface Storage {
  id: string;
  name: string;
  documentCount: number;
  totalSize: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AppState {
  // Sidebar state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Current storage
  currentStorageId: string | null;
  setCurrentStorageId: (id: string | null) => void;

  // Storages list (cached)
  storages: Storage[];
  setStorages: (storages: Storage[]) => void;

  // Search state
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearching: boolean;
  setIsSearching: (searching: boolean) => void;

  // Selection mode
  selectionMode: boolean;
  selectedDocumentIds: string[];
  setSelectionMode: (mode: boolean) => void;
  toggleDocumentSelection: (id: string) => void;
  clearSelection: () => void;
  selectAll: (ids: string[]) => void;

  // View mode
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;

  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>()((set, get) => ({
  // Sidebar
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Current storage
  currentStorageId: null,
  setCurrentStorageId: (id) => set({ currentStorageId: id }),

  // Storages
  storages: [],
  setStorages: (storages) => set({ storages }),

  // Search
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),
  isSearching: false,
  setIsSearching: (searching) => set({ isSearching: searching }),

  // Selection
  selectionMode: false,
  selectedDocumentIds: [],
  setSelectionMode: (mode) =>
    set({ selectionMode: mode, selectedDocumentIds: [] }),
  toggleDocumentSelection: (id) =>
    set((state) => ({
      selectedDocumentIds: state.selectedDocumentIds.includes(id)
        ? state.selectedDocumentIds.filter((docId) => docId !== id)
        : [...state.selectedDocumentIds, id],
    })),
  clearSelection: () => set({ selectedDocumentIds: [] }),
  selectAll: (ids) => set({ selectedDocumentIds: ids }),

  // View mode
  viewMode: "grid",
  setViewMode: (mode) => set({ viewMode: mode }),

  // Loading
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
