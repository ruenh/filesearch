/**
 * DocumentViewer container component
 * Displays document content with metadata panel
 * Requirements: 4.1, 4.3, 34.1, 34.2, 34.3
 */
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getDocument,
  getDocumentContent,
  getDocumentContentUrl,
  getDocumentDownloadUrl,
  updateDocumentContent,
  type DocumentContent,
} from "@/api/documents";
import type { Document } from "@/types";
import { TextViewer } from "./TextViewer";
import { MarkdownViewer } from "./MarkdownViewer";
import { MarkdownEditor } from "./MarkdownEditor";
import { PDFViewer } from "./PDFViewer";
import { ImageViewer } from "./ImageViewer";
import { TextEditor } from "@/components/editor/TextEditor";

// File type icons and colors
const FILE_TYPE_CONFIG: Record<
  string,
  { icon: string; color: string; bgColor: string }
> = {
  txt: {
    icon: "📄",
    color: "text-gray-600",
    bgColor: "bg-gray-100 dark:bg-gray-700",
  },
  pdf: {
    icon: "📕",
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
  docx: {
    icon: "📘",
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  md: {
    icon: "📝",
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  image: {
    icon: "🖼️",
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
};

export function DocumentViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [document, setDocument] = useState<Document | null>(null);
  const [content, setContent] = useState<DocumentContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMetadata, setShowMetadata] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("Document ID not provided");
      setLoading(false);
      return;
    }

    async function loadDocument() {
      setLoading(true);
      setError(null);

      try {
        // Fetch document metadata
        const doc = await getDocument(id!, true);
        setDocument(doc);

        // For text-based files, fetch content
        if (doc.type === "txt" || doc.type === "md") {
          const contentData = await getDocumentContent(id!);
          setContent(contentData);
        }
      } catch (err) {
        console.error("Failed to load document:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load document"
        );
      } finally {
        setLoading(false);
      }
    }

    loadDocument();
  }, [id]);

  // Format date for display
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Б";
    const k = 1024;
    const sizes = ["Б", "КБ", "МБ", "ГБ"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleDownload = () => {
    if (id) {
      window.open(getDocumentDownloadUrl(id), "_blank");
    }
  };

  // Handle save from editor - creates new version
  const handleSave = useCallback(
    async (newContent: string) => {
      if (!id || !document) return;

      const result = await updateDocumentContent(id, newContent);

      // Update local document state with new data
      setDocument(result.document);

      // Update content state
      if (content) {
        setContent({
          ...content,
          content: newContent,
          size: new Blob([newContent]).size,
        });
      }
    },
    [id, document, content]
  );

  // Toggle edit mode
  const handleToggleEdit = () => {
    setIsEditing(!isEditing);
  };

  // Check if document is editable
  const isEditable = document?.type === "txt" || document?.type === "md";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-red-500 mb-4">
          <svg
            className="w-16 h-16"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {error || "Document not found"}
        </h3>
        <button
          onClick={handleBack}
          className="mt-4 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
        >
          Назад
        </button>
      </div>
    );
  }

  const fileConfig = FILE_TYPE_CONFIG[document.type] || FILE_TYPE_CONFIG.txt;

  // Render content based on file type
  const renderContent = () => {
    // Edit mode for text files
    if (isEditing && isEditable) {
      if (document.type === "md") {
        return (
          <MarkdownEditor
            content={content?.content || ""}
            filename={document.name}
            onSave={handleSave}
          />
        );
      }
      // For txt files
      return (
        <TextEditor
          content={content?.content || ""}
          filename={document.name}
          language="plaintext"
          onSave={handleSave}
        />
      );
    }

    // View mode
    switch (document.type) {
      case "txt":
        return (
          <TextViewer
            content={content?.content || ""}
            filename={document.name}
          />
        );
      case "md":
        return (
          <MarkdownViewer
            content={content?.content || ""}
            filename={document.name}
          />
        );
      case "pdf":
        return (
          <PDFViewer
            url={getDocumentContentUrl(id!)}
            filename={document.name}
          />
        );
      case "image":
        return (
          <ImageViewer
            url={getDocumentContentUrl(id!)}
            filename={document.name}
          />
        );
      case "docx":
        return (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div
              className={`w-20 h-20 rounded-lg flex items-center justify-center text-4xl mb-4 ${fileConfig.bgColor}`}
            >
              {fileConfig.icon}
            </div>
            <p className="mb-4">Предпросмотр DOCX файлов недоступен</p>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
            >
              Скачать файл
            </button>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <p>Предпросмотр недоступен для этого типа файла</p>
            <button
              onClick={handleDownload}
              className="mt-4 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
            >
              Скачать файл
            </button>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Назад"
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${fileConfig.bgColor}`}
            >
              {fileConfig.icon}
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 dark:text-white truncate max-w-md">
                {document.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatSize(document.size)} • {document.type.toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Edit button for text files */}
          {isEditable && (
            <button
              onClick={handleToggleEdit}
              className={`p-2 rounded-lg transition-colors ${
                isEditing
                  ? "bg-sky-100 dark:bg-sky-900/30 text-sky-600"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              }`}
              aria-label={isEditing ? "Просмотр" : "Редактировать"}
              title={isEditing ? "Просмотр" : "Редактировать"}
            >
              {isEditing ? (
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
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              ) : (
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              )}
            </button>
          )}

          <button
            onClick={handleDownload}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Скачать"
            title="Скачать"
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </button>

          <button
            onClick={() => setShowMetadata(!showMetadata)}
            className={`p-2 rounded-lg transition-colors ${
              showMetadata
                ? "bg-sky-100 dark:bg-sky-900/30 text-sky-600"
                : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            }`}
            aria-label="Показать метаданные"
            title="Метаданные"
          >
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
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          {renderContent()}
        </div>

        {/* Metadata panel */}
        {showMetadata && (
          <div className="w-80 border-l dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
            <div className="p-4 space-y-6">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Информация о файле
              </h2>

              {/* File details */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Имя файла
                  </label>
                  <p className="text-gray-900 dark:text-white break-words">
                    {document.name}
                  </p>
                </div>

                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Тип
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {document.type.toUpperCase()}
                  </p>
                </div>

                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Размер
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {formatSize(document.size)}
                  </p>
                </div>

                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Создан
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {formatDate(document.createdAt)}
                  </p>
                </div>

                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Изменен
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {formatDate(document.updatedAt)}
                  </p>
                </div>
              </div>

              {/* Tags */}
              {document.tags.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Теги
                  </label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {document.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2 py-1 text-sm rounded-full"
                        style={{
                          backgroundColor: tag.color + "20",
                          color: tag.color,
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Version history */}
              {document.versions.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    История версий
                  </label>
                  <div className="mt-2 space-y-2">
                    {document.versions.slice(0, 5).map((version) => (
                      <div
                        key={version.id}
                        className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-white">
                            Версия {version.versionNumber}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {formatSize(version.size)}
                          </span>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                          {formatDate(version.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
