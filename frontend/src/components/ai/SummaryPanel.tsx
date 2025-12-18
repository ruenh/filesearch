/**
 * SummaryPanel component for AI document summarization
 * Requirements: 17.2
 */

import { useState } from "react";
import { summarizeDocument } from "@/api/ai";
import type { SummaryResponse } from "@/api/ai";

type SummaryLength = "short" | "medium" | "long";

interface SummaryPanelProps {
  documentId: string;
  documentName: string;
  onClose?: () => void;
}

const lengthOptions: {
  value: SummaryLength;
  label: string;
  description: string;
}[] = [
  { value: "short", label: "Краткое", description: "2-3 предложения" },
  { value: "medium", label: "Среднее", description: "1-2 абзаца" },
  { value: "long", label: "Подробное", description: "Все ключевые детали" },
];

export function SummaryPanel({
  documentId,
  documentName,
  onClose,
}: SummaryPanelProps) {
  const [length, setLength] = useState<SummaryLength>("medium");
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSummarize = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await summarizeDocument(documentId, length);
      setSummary(response);
    } catch (err) {
      console.error("Summarization error:", err);
      setError("Не удалось создать резюме. Попробуйте снова.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (summary?.summary) {
      await navigator.clipboard.writeText(summary.summary);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-purple-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h2 className="font-semibold text-gray-900 dark:text-white">
            AI Резюме
          </h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-500"
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
        )}
      </div>

      {/* Document info */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">Документ:</p>
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {documentName}
        </p>
      </div>

      {/* Length selector */}
      <div className="p-4 border-b dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Длина резюме
        </label>
        <div className="grid grid-cols-3 gap-2">
          {lengthOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setLength(option.value)}
              className={`p-3 rounded-lg border text-center transition-all ${
                length === option.value
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  length === option.value
                    ? "text-purple-700 dark:text-purple-400"
                    : "text-gray-900 dark:text-white"
                }`}
              >
                {option.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {option.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <div className="p-4 border-b dark:border-gray-700">
        <button
          onClick={handleSummarize}
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg
                className="w-5 h-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Создание резюме...</span>
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
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
              <span>Создать резюме</span>
            </>
          )}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b dark:border-gray-700">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Summary display */}
      {summary && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Результат
            </h3>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Копировать"
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
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {summary.summary}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
