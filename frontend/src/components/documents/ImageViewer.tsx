/**
 * ImageViewer component
 * Displays images with zoom and pan controls
 * Requirements: 4.1
 */
import { useState, useRef } from "react";

interface ImageViewerProps {
  url: string;
  filename: string;
}

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
const DEFAULT_ZOOM_INDEX = 3; // 100%

export function ImageViewer({ url, filename }: ImageViewerProps) {
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [fitToScreen, setFitToScreen] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const zoom = ZOOM_LEVELS[zoomIndex];

  // Handle image load
  const handleImageLoad = () => {
    setLoading(false);
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight,
      });
    }
  };

  // Handle image error
  const handleImageError = () => {
    setLoading(false);
    setError("Не удалось загрузить изображение");
  };

  // Zoom handlers
  const zoomIn = () => {
    setFitToScreen(false);
    if (zoomIndex < ZOOM_LEVELS.length - 1) {
      setZoomIndex(zoomIndex + 1);
    }
  };

  const zoomOut = () => {
    setFitToScreen(false);
    if (zoomIndex > 0) {
      setZoomIndex(zoomIndex - 1);
    }
  };

  const resetZoom = () => {
    setZoomIndex(DEFAULT_ZOOM_INDEX);
    setFitToScreen(false);
  };

  const toggleFitToScreen = () => {
    setFitToScreen(!fitToScreen);
  };

  // Calculate fit-to-screen scale
  const getFitScale = () => {
    if (!containerRef.current || imageDimensions.width === 0) return 1;

    const containerWidth = containerRef.current.clientWidth - 32; // padding
    const containerHeight = containerRef.current.clientHeight - 32;

    const scaleX = containerWidth / imageDimensions.width;
    const scaleY = containerHeight / imageDimensions.height;

    return Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%
  };

  const effectiveZoom = fitToScreen ? getFitScale() : zoom;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <svg
          className="w-16 h-16 mb-4 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
        {/* Image info */}
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {imageDimensions.width > 0 && (
            <span>
              {imageDimensions.width} × {imageDimensions.height} px
            </span>
          )}
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFitToScreen}
            className={`px-2 py-1 text-sm rounded transition-colors ${
              fitToScreen
                ? "bg-sky-100 dark:bg-sky-900/30 text-sky-600"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            По размеру
          </button>

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

          <button
            onClick={zoomOut}
            disabled={zoomIndex <= 0}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Уменьшить"
          >
            <svg
              className="w-5 h-5 text-gray-600 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 12H4"
              />
            </svg>
          </button>

          <button
            onClick={resetZoom}
            className="px-2 py-1 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors min-w-[60px]"
          >
            {fitToScreen
              ? `${Math.round(getFitScale() * 100)}%`
              : `${Math.round(zoom * 100)}%`}
          </button>

          <button
            onClick={zoomIn}
            disabled={zoomIndex >= ZOOM_LEVELS.length - 1}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Увеличить"
          >
            <svg
              className="w-5 h-5 text-gray-600 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Image container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4"
        style={{
          backgroundImage:
            "linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)",
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
        }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
          </div>
        )}

        <img
          ref={imageRef}
          src={url}
          alt={filename}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className="max-w-none transition-transform duration-200"
          style={{
            transform: `scale(${effectiveZoom})`,
            transformOrigin: "center center",
          }}
        />
      </div>
    </div>
  );
}
