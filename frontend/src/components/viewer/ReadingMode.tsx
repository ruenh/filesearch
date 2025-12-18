/**
 * ReadingMode component for distraction-free document viewing
 * Requirements: 40.1, 40.2, 40.3
 */

import { useEffect, useState } from "react";
import { X, ZoomIn, ZoomOut, Sun, Moon, Type } from "lucide-react";

interface ReadingModeProps {
  content: string;
  title?: string;
  onClose: () => void;
}

const FONT_SIZES = [14, 16, 18, 20, 22, 24];
const FONT_FAMILIES = [
  { name: "Sans", value: "ui-sans-serif, system-ui, sans-serif" },
  { name: "Serif", value: "ui-serif, Georgia, serif" },
  { name: "Mono", value: "ui-monospace, monospace" },
];

export function ReadingMode({ content, title, onClose }: ReadingModeProps) {
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0].value);
  const [isDark, setIsDark] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Hide controls after inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 3000);
    };

    document.addEventListener("mousemove", handleMouseMove);
    timeout = setTimeout(() => setShowControls(false), 3000);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timeout);
    };
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const increaseFontSize = () => {
    const currentIndex = FONT_SIZES.indexOf(fontSize);
    if (currentIndex < FONT_SIZES.length - 1) {
      setFontSize(FONT_SIZES[currentIndex + 1]);
    }
  };

  const decreaseFontSize = () => {
    const currentIndex = FONT_SIZES.indexOf(fontSize);
    if (currentIndex > 0) {
      setFontSize(FONT_SIZES[currentIndex - 1]);
    }
  };

  const cycleFontFamily = () => {
    const currentIndex = FONT_FAMILIES.findIndex((f) => f.value === fontFamily);
    const nextIndex = (currentIndex + 1) % FONT_FAMILIES.length;
    setFontFamily(FONT_FAMILIES[nextIndex].value);
  };

  const bgColor = isDark ? "bg-gray-900" : "bg-amber-50";
  const textColor = isDark ? "text-gray-100" : "text-gray-800";
  const controlsBg = isDark ? "bg-gray-800" : "bg-white";

  return (
    <div
      className={`fixed inset-0 z-50 ${bgColor} transition-colors duration-300`}
    >
      {/* Controls - shown on hover/activity */}
      <div
        className={`fixed top-0 left-0 right-0 p-4 flex justify-between items-center transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Title */}
        <div className={`${textColor} font-medium truncate max-w-md`}>
          {title || "Reading Mode"}
        </div>

        {/* Controls */}
        <div
          className={`flex items-center gap-2 ${controlsBg} rounded-full px-4 py-2 shadow-lg`}
        >
          {/* Font size controls */}
          <button
            onClick={decreaseFontSize}
            disabled={fontSize === FONT_SIZES[0]}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            title="Decrease font size"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm w-8 text-center">{fontSize}</span>
          <button
            onClick={increaseFontSize}
            disabled={fontSize === FONT_SIZES[FONT_SIZES.length - 1]}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            title="Increase font size"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />

          {/* Font family */}
          <button
            onClick={cycleFontFamily}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Change font"
          >
            <Type className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />

          {/* Theme toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Exit reading mode (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="h-full overflow-y-auto pt-20 pb-16">
        <div className="max-w-2xl mx-auto px-8">
          <article
            className={`${textColor} leading-relaxed whitespace-pre-wrap`}
            style={{ fontSize: `${fontSize}px`, fontFamily }}
          >
            {content}
          </article>
        </div>
      </div>

      {/* Progress indicator */}
      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 text-sm ${textColor} opacity-50`}
      >
        Press Esc to exit
      </div>
    </div>
  );
}

export default ReadingMode;
