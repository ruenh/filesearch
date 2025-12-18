/**
 * TranslatePanel component for AI document translation
 * Requirements: 18.2, 18.3
 */

import { useState } from "react";
import { translateDocument } from "@/api/ai";
import type { TranslateResponse } from "@/api/ai";

interface TranslatePanelProps {
  documentId: string;
  documentName: string;
  onClose?: () => void;
}

const languages = [
  { code: "English", label: "Английский", flag: "🇬🇧" },
  { code: "Russian", label: "Русский", flag: "🇷🇺" },
  { code: "Spanish", label: "Испанский", flag: "🇪🇸" },
  { code: "French", label: "Французский", flag: "🇫🇷" },
  { code: "German", label: "Немецкий", flag: "🇩🇪" },
  { code: "Chinese", label: "Китайский", flag: "🇨🇳" },
  { code: "Japanese", label: "Японский", flag: "🇯🇵" },
  { code: "Korean", label: "Корейский", flag: "🇰🇷" },
  { code: "Portuguese", label: "Португальский", flag: "🇵🇹" },
  { code: "Italian", label: "Итальянский", flag: "🇮🇹" },
  { code: "Arabic", label: "Арабский", flag: "🇸🇦" },
  { code: "Hindi", label: "Хинди", flag: "🇮🇳" },
];

export function TranslatePanel({
  documentId,
  documentName,
  onClose,
}: TranslatePanelProps) {
  const [targetLanguage, setTargetLanguage] = useState("English");
  const [translation, setTranslation] = useState<TranslateResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTranslate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await translateDocument(documentId, targetLanguage);
      setTranslation(response);
    } catch (err) {
      console.error("Translation error:", err);
      setError("Не удалось перевести документ. Попробуйте снова.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (translation?.translated_content) {
      await navigator.clipboard.writeText(translation.translated_content);
    }
  };

  const selectedLanguage = languages.find((l) => l.code === targetLanguage);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
            />
          </svg>
          <h2 className="font-semibold text-gray-900 dark:text-white">
            AI Перевод
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

      {/* Language selector */}
      <div className="p-4 border-b dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Перевести на
        </label>
        <div className="relative">
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="w-full appearance-none bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg px-4 py-2.5 pr-10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.label}
              </option>
            ))}
          </select>
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
        {selectedLanguage && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Выбран: {selectedLanguage.flag} {selectedLanguage.label}
          </p>
        )}
      </div>

      {/* Translate button */}
      <div className="p-4 border-b dark:border-gray-700">
        <button
          onClick={handleTranslate}
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
              <span>Перевод...</span>
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
                  d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                />
              </svg>
              <span>Перевести</span>
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

      {/* Translation display */}
      {translation && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Перевод на {translation.target_language}
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
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg max-h-96 overflow-y-auto">
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {translation.translated_content}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
