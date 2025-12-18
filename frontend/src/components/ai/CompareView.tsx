/**
 * CompareView component for AI document comparison
 * Requirements: 21.3
 */

import { useState, useEffect } from "react";
import { compareDocuments } from "@/api/ai";
import type { CompareResponse } from "@/api/ai";

interface Document {
  id: string;
  name: string;
}

interface CompareViewProps {
  document1?: Document;
  document2?: Document;
  documents?: Document[];
  onClose?: () => void;
}

export function CompareView({
  document1: initialDoc1,
  document2: initialDoc2,
  documents = [],
  onClose,
}: CompareViewProps) {
  const [doc1, setDoc1] = useState<Document | null>(initialDoc1 || null);
  const [doc2, setDoc2] = useState<Document | null>(initialDoc2 || null);
  const [comparison, setComparison] = useState<CompareResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-compare when both documents are selected
  useEffect(() => {
    if (initialDoc1 && initialDoc2) {
      handleCompare();
    }
  }, []);

  const handleCompare = async () => {
    if (!doc1 || !doc2) {
      setError("Выберите оба документа для сравнения");
      return;
    }

    if (doc1.id === doc2.id) {
      setError("Выберите разные документы для сравнения");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await compareDocuments(doc1.id, doc2.id);
      setComparison(response);
    } catch (err) {
      console.error("Comparison error:", err);
      setError("Не удалось сравнить документы. Попробуйте снова.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwapDocuments = () => {
    const temp = doc1;
    setDoc1(doc2);
    setDoc2(temp);
    setComparison(null);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-orange-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Сравнение документов
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

      {/* Document selectors */}
      <div className="p-4 border-b dark:border-gray-700">
        <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-end">
          {/* Document 1 selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Документ 1
            </label>
            {documents.length > 0 ? (
              <select
                value={doc1?.id || ""}
                onChange={(e) => {
                  const selected = documents.find(
                    (d) => d.id === e.target.value
                  );
                  setDoc1(selected || null);
                  setComparison(null);
                }}
                className="w-full bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Выберите документ</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                <p className="text-sm text-gray-900 dark:text-white truncate">
                  {doc1?.name || "Не выбран"}
                </p>
              </div>
            )}
          </div>

          {/* Swap button */}
          <button
            onClick={handleSwapDocuments}
            disabled={!doc1 || !doc2}
            className="p-2 rounded-lg border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Поменять местами"
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
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
          </button>

          {/* Document 2 selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Документ 2
            </label>
            {documents.length > 0 ? (
              <select
                value={doc2?.id || ""}
                onChange={(e) => {
                  const selected = documents.find(
                    (d) => d.id === e.target.value
                  );
                  setDoc2(selected || null);
                  setComparison(null);
                }}
                className="w-full bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Выберите документ</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                <p className="text-sm text-gray-900 dark:text-white truncate">
                  {doc2?.name || "Не выбран"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Compare button */}
        <button
          onClick={handleCompare}
          disabled={!doc1 || !doc2 || isLoading}
          className="w-full mt-4 py-2.5 px-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
              <span>Сравнение...</span>
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span>Сравнить</span>
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

      {/* Comparison results */}
      {comparison && (
        <div className="flex-1 overflow-y-auto p-4">
          {/* Document headers */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-blue-500"
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
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400 truncate">
                  {comparison.document_1.name}
                </span>
              </div>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-green-500"
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
                <span className="text-sm font-medium text-green-700 dark:text-green-400 truncate">
                  {comparison.document_2.name}
                </span>
              </div>
            </div>
          </div>

          {/* Analysis */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Анализ различий
            </h3>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {comparison.analysis}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!comparison && !isLoading && !error && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <svg
              className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Сравните документы
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
              Выберите два документа и нажмите "Сравнить" для анализа различий с
              помощью AI
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
