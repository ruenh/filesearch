/**
 * Voice Search Button Component
 * Requirements: 12.1, 12.2, 12.3
 *
 * Provides a button to activate voice search with visual feedback
 * during listening and processing states.
 */

import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useEffect, useState } from "react";

interface VoiceSearchButtonProps {
  /** Callback when voice search produces a result */
  onResult: (transcript: string) => void;
  /** Language for speech recognition */
  language?: string;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Whether the button is disabled */
  disabled?: boolean;
}

type ButtonStatus = "idle" | "listening" | "error";

/**
 * Get status-specific styles
 */
function getStatusStyles(status: ButtonStatus): string {
  switch (status) {
    case "listening":
      return "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 animate-pulse";
    case "error":
      return "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400";
    default:
      return "hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300";
  }
}

/**
 * Get size-specific styles
 */
function getSizeStyles(size: "sm" | "md" | "lg"): {
  button: string;
  icon: string;
} {
  switch (size) {
    case "sm":
      return { button: "p-1", icon: "w-4 h-4" };
    case "lg":
      return { button: "p-3", icon: "w-6 h-6" };
    default:
      return { button: "p-1.5", icon: "w-5 h-5" };
  }
}

/**
 * Get aria-label based on status
 */
function getAriaLabel(status: ButtonStatus, isSupported: boolean): string {
  if (!isSupported) {
    return "Голосовой поиск не поддерживается";
  }

  switch (status) {
    case "listening":
      return "Слушаю... Нажмите для остановки";
    case "error":
      return "Ошибка голосового поиска. Нажмите для повтора";
    default:
      return "Голосовой поиск";
  }
}

/**
 * Microphone icon component
 */
function MicrophoneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
      />
    </svg>
  );
}

/**
 * Stop icon component
 */
function StopIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

/**
 * Voice Search Button with Web Speech API integration
 */
export function VoiceSearchButton({
  onResult,
  language = "ru-RU",
  className = "",
  size = "md",
  disabled = false,
}: VoiceSearchButtonProps) {
  const [showError, setShowError] = useState(false);

  const { isSupported, isListening, error, startListening, stopListening } =
    useVoiceSearch({
      language,
      interimResults: false,
      onResult: (transcript, isFinal) => {
        if (isFinal) {
          onResult(transcript);
        }
      },
      onError: () => {
        setShowError(true);
      },
    });

  // Hide error tooltip after 3 seconds
  useEffect(() => {
    if (showError) {
      const timer = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showError]);

  const handleClick = () => {
    if (disabled || !isSupported) return;
    setShowError(false);

    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Determine button status
  const status: ButtonStatus = isListening
    ? "listening"
    : error
    ? "error"
    : "idle";
  const statusStyles = getStatusStyles(status);
  const sizeStyles = getSizeStyles(size);
  const ariaLabel = getAriaLabel(status, isSupported);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || !isSupported}
        className={`
          rounded-full transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${sizeStyles.button}
          ${statusStyles}
          ${className}
        `}
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        {isListening ? (
          <StopIcon className={sizeStyles.icon} />
        ) : (
          <MicrophoneIcon className={sizeStyles.icon} />
        )}
      </button>

      {/* Listening indicator ring */}
      {isListening && (
        <span className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-25" />
      )}

      {/* Error tooltip */}
      {showError && error && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs text-white bg-red-600 rounded-lg whitespace-nowrap z-50">
          {error}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-red-600" />
        </div>
      )}
    </div>
  );
}

export default VoiceSearchButton;
