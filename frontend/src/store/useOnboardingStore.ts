import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Onboarding Store - Requirements 82.1, 82.2, 82.3
 * Tracks onboarding tour state and completion status
 */

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector for the target element
  placement: "top" | "bottom" | "left" | "right";
}

interface OnboardingState {
  // Whether the user has completed the onboarding tour
  hasCompletedOnboarding: boolean;
  // Whether the tour is currently active
  isTourActive: boolean;
  // Current step index
  currentStep: number;
  // Whether to show the welcome modal
  showWelcomeModal: boolean;

  // Actions
  startTour: () => void;
  endTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  dismissWelcomeModal: () => void;
}

// Define onboarding steps - Requirements 82.2
export const onboardingSteps: OnboardingStep[] = [
  {
    id: "sidebar",
    title: "Навигация",
    description:
      "Используйте боковую панель для навигации между разделами: документы, избранное, архив, поиск и AI чат.",
    target: "[data-onboarding='sidebar']",
    placement: "right",
  },
  {
    id: "search",
    title: "Поиск документов",
    description:
      "Введите запрос в поисковую строку для семантического поиска по всем вашим документам с помощью AI.",
    target: "[data-onboarding='search']",
    placement: "bottom",
  },
  {
    id: "storage",
    title: "Хранилища",
    description:
      "Создавайте хранилища для организации документов. Каждое хранилище — это отдельная база знаний для AI поиска.",
    target: "[data-onboarding='storage']",
    placement: "right",
  },
  {
    id: "create-storage",
    title: "Создание хранилища",
    description:
      "Нажмите эту кнопку, чтобы создать новое хранилище и начать загружать документы.",
    target: "[data-onboarding='create-storage']",
    placement: "top",
  },
  {
    id: "theme",
    title: "Тема оформления",
    description:
      "Переключайтесь между светлой и тёмной темой для комфортной работы.",
    target: "[data-onboarding='theme']",
    placement: "bottom",
  },
  {
    id: "notifications",
    title: "Уведомления",
    description:
      "Здесь вы найдёте уведомления о изменениях в документах и действиях других пользователей.",
    target: "[data-onboarding='notifications']",
    placement: "bottom",
  },
  {
    id: "user-menu",
    title: "Профиль и настройки",
    description:
      "Откройте меню пользователя для доступа к настройкам и выхода из системы.",
    target: "[data-onboarding='user-menu']",
    placement: "bottom",
  },
];

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      hasCompletedOnboarding: false,
      isTourActive: false,
      currentStep: 0,
      showWelcomeModal: true,

      startTour: () => {
        set({
          isTourActive: true,
          currentStep: 0,
          showWelcomeModal: false,
        });
      },

      endTour: () => {
        set({ isTourActive: false });
      },

      nextStep: () => {
        const { currentStep } = get();
        if (currentStep < onboardingSteps.length - 1) {
          set({ currentStep: currentStep + 1 });
        } else {
          // Last step - complete the tour
          get().completeOnboarding();
        }
      },

      prevStep: () => {
        const { currentStep } = get();
        if (currentStep > 0) {
          set({ currentStep: currentStep - 1 });
        }
      },

      goToStep: (step: number) => {
        if (step >= 0 && step < onboardingSteps.length) {
          set({ currentStep: step });
        }
      },

      completeOnboarding: () => {
        set({
          hasCompletedOnboarding: true,
          isTourActive: false,
          showWelcomeModal: false,
        });
      },

      resetOnboarding: () => {
        set({
          hasCompletedOnboarding: false,
          isTourActive: false,
          currentStep: 0,
          showWelcomeModal: true,
        });
      },

      dismissWelcomeModal: () => {
        set({ showWelcomeModal: false });
      },
    }),
    {
      name: "onboarding-storage",
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
    }
  )
);
