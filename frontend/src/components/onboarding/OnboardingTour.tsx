import { useEffect, useState, useCallback } from "react";
import {
  useOnboardingStore,
  onboardingSteps,
} from "@/store/useOnboardingStore";

/**
 * OnboardingTour Component - Requirements 82.1, 82.2, 82.3
 * Provides a step-by-step guided tour for new users
 */

interface TooltipPosition {
  top: number;
  left: number;
  arrowPosition: "top" | "bottom" | "left" | "right";
}

export function OnboardingTour() {
  const {
    hasCompletedOnboarding,
    isTourActive,
    currentStep,
    showWelcomeModal,
    startTour,
    endTour,
    nextStep,
    prevStep,
    completeOnboarding,
    dismissWelcomeModal,
  } = useOnboardingStore();

  const [tooltipPosition, setTooltipPosition] =
    useState<TooltipPosition | null>(null);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  const currentStepData = onboardingSteps[currentStep];

  // Calculate tooltip position based on target element
  const calculatePosition = useCallback(() => {
    if (!currentStepData) return;

    const target = document.querySelector(
      currentStepData.target
    ) as HTMLElement;
    if (!target) {
      // If target not found, try next step or end tour
      if (currentStep < onboardingSteps.length - 1) {
        nextStep();
      }
      return;
    }

    setTargetElement(target);
    const rect = target.getBoundingClientRect();
    const tooltipWidth = 320;
    const tooltipHeight = 180;
    const padding = 16;

    let top = 0;
    let left = 0;
    let arrowPosition: "top" | "bottom" | "left" | "right" = "top";

    switch (currentStepData.placement) {
      case "top":
        top = rect.top - tooltipHeight - padding;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        arrowPosition = "bottom";
        break;
      case "bottom":
        top = rect.bottom + padding;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        arrowPosition = "top";
        break;
      case "left":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - padding;
        arrowPosition = "right";
        break;
      case "right":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + padding;
        arrowPosition = "left";
        break;
    }

    // Ensure tooltip stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < padding) left = padding;
    if (left + tooltipWidth > viewportWidth - padding) {
      left = viewportWidth - tooltipWidth - padding;
    }
    if (top < padding) top = padding;
    if (top + tooltipHeight > viewportHeight - padding) {
      top = viewportHeight - tooltipHeight - padding;
    }

    setTooltipPosition({ top, left, arrowPosition });
  }, [currentStepData, currentStep, nextStep]);

  // Update position when step changes or window resizes
  useEffect(() => {
    if (isTourActive) {
      calculatePosition();
      window.addEventListener("resize", calculatePosition);
      window.addEventListener("scroll", calculatePosition, true);

      return () => {
        window.removeEventListener("resize", calculatePosition);
        window.removeEventListener("scroll", calculatePosition, true);
      };
    }
  }, [isTourActive, currentStep, calculatePosition]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isTourActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        endTour();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        nextStep();
      } else if (e.key === "ArrowLeft") {
        prevStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTourActive, endTour, nextStep, prevStep]);

  // Welcome Modal - Requirements 82.1
  if (!hasCompletedOnboarding && showWelcomeModal && !isTourActive) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-300">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-sky-500 to-blue-600 p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <svg
                  className="w-7 h-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold">Добро пожаловать!</h2>
                <p className="text-sky-100">File Search RAG System</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Это ваш первый визит. Хотите пройти краткий обзор основных функций
              системы?
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-sky-100 dark:bg-sky-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-sky-600 dark:text-sky-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Умный поиск
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Семантический поиск по документам с AI
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    AI Чат
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Задавайте вопросы по документам
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-purple-600 dark:text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Организация
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Хранилища, папки и теги
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={startTour}
                className="flex-1 btn btn-primary py-3"
              >
                Начать обзор
              </button>
              <button
                onClick={() => {
                  dismissWelcomeModal();
                  completeOnboarding();
                }}
                className="flex-1 btn btn-secondary py-3"
              >
                Пропустить
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tour not active
  if (!isTourActive || !tooltipPosition || !currentStepData) {
    return null;
  }

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === onboardingSteps.length - 1;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[90] pointer-events-none">
        {/* Semi-transparent backdrop */}
        <div className="absolute inset-0 bg-black/40" />

        {/* Spotlight on target element */}
        {targetElement && (
          <div
            className="absolute bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] rounded-lg transition-all duration-300"
            style={{
              top: targetElement.getBoundingClientRect().top - 4,
              left: targetElement.getBoundingClientRect().left - 4,
              width: targetElement.getBoundingClientRect().width + 8,
              height: targetElement.getBoundingClientRect().height + 8,
            }}
          />
        )}
      </div>

      {/* Tooltip - Requirements 82.2 */}
      <div
        className="fixed z-[100] w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border dark:border-gray-700 animate-in fade-in slide-in-from-bottom-2 duration-300"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
      >
        {/* Arrow */}
        <div
          className={`absolute w-3 h-3 bg-white dark:bg-gray-800 border dark:border-gray-700 transform rotate-45 ${
            tooltipPosition.arrowPosition === "top"
              ? "-top-1.5 left-1/2 -translate-x-1/2 border-b-0 border-r-0"
              : tooltipPosition.arrowPosition === "bottom"
              ? "-bottom-1.5 left-1/2 -translate-x-1/2 border-t-0 border-l-0"
              : tooltipPosition.arrowPosition === "left"
              ? "-left-1.5 top-1/2 -translate-y-1/2 border-t-0 border-r-0"
              : "-right-1.5 top-1/2 -translate-y-1/2 border-b-0 border-l-0"
          }`}
        />

        {/* Header */}
        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-sky-100 dark:bg-sky-900 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                  {currentStep + 1}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {currentStepData.title}
              </h3>
            </div>
            <button
              onClick={endTour}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Закрыть обзор"
            >
              <svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {currentStepData.description}
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-gray-700 flex items-center justify-between">
          {/* Progress dots */}
          <div className="flex gap-1.5">
            {onboardingSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep
                    ? "bg-sky-500"
                    : index < currentStep
                    ? "bg-sky-300 dark:bg-sky-700"
                    : "bg-gray-200 dark:bg-gray-600"
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-2">
            {!isFirstStep && (
              <button
                onClick={prevStep}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Назад
              </button>
            )}
            <button
              onClick={nextStep}
              className="px-4 py-1.5 text-sm bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors"
            >
              {isLastStep ? "Завершить" : "Далее"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
