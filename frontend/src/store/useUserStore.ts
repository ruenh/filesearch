import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserPreferences {
  language: string;
  fontSize: number;
  shortcuts: Record<string, string>;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "editor" | "viewer";
  preferences: UserPreferences;
  twoFactorEnabled: boolean;
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  logout: () => void;
}

export const defaultPreferences: UserPreferences = {
  language: "ru",
  fontSize: 16,
  shortcuts: {},
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      updatePreferences: (preferences) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: {
              ...currentUser,
              preferences: { ...currentUser.preferences, ...preferences },
            },
          });
        }
      },
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: "user-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
