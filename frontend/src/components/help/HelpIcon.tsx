import { useState, useRef, useEffect } from "react";
import { useHelpStore, helpTopics } from "@/store/useHelpStore";

/**
 * HelpIcon Component - Requirements 83.2
 * Displays a help icon that shows detailed explanation when clicked
 */

export interface HelpIconProps {
  topicId: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function HelpIcon({
  topicId,
  size = "md",
  className = "",
}: HelpIconProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { openHelpModal, selectTopic } = useHelpStore();

  const topic = helpTopics.find((t) => t.id === topicId);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  const handleOpenFullHelp = () => {
    if (topic) {
      selectTopic(topic);
      openHelpModal();
    }
    setIsOpen(false);
  };

  // Calculate popover position
  useEffect(() => {
    if (!isOpen || !iconRef.current) return;

    const rect = iconRef.current.getBoundingClientRect();
    const popoverWidth = 320;
    const popoverHeight = 200;
    const padding = 8;

    let top = rect.bottom + padding;
    let left = rect.left - popoverWidth / 2 + rect.width / 2;

    // Keep within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < padding) left = padding;
    if (left + popoverWidth > viewportWidth - padding) {
      left = viewportWidth - popoverWidth - padding;
    }
    if (top + popoverHeight > viewportHeight - padding) {
      top = rect.top - popoverHeight - padding;
    }

    setPosition({ top, left });
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        iconRef.current &&
        !iconRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  if (!topic) return null;

  return (
    <>
      <button
        ref={iconRef}
        onClick={handleClick}
        className={`inline-flex items-center justify-center text-gray-400 hover:text-sky-500 dark:text-gray-500 dark:hover:text-sky-400 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 rounded-full ${className}`}
        aria-label={`Помощь: ${topic.title}`}
        aria-expanded={isOpen}
      >
        <svg
          className={sizeClasses[size]}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="fixed z-50 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          style={{ top: position.top, left: position.left }}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-sky-50 dark:bg-sky-900/20 border-b dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-sky-100 dark:bg-sky-900 rounded-lg flex items-center justify-center">
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
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {topic.title}
              </h3>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {topic.fullDescription}
            </p>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700 flex items-center justify-between">
            <button
              onClick={() => setIsOpen(false)}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Закрыть
            </button>
            <button
              onClick={handleOpenFullHelp}
              className="text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 font-medium flex items-center gap-1"
            >
              Подробнее
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
