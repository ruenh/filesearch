/**
 * MarkdownEditor component
 * Split view editor with real-time Markdown preview
 * Requirements: 35.3
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Editor, { type OnMount, type OnChange } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useThemeStore } from "@/store/useThemeStore";

interface MarkdownEditorProps {
  content: string;
  filename: string;
  readOnly?: boolean;
  onSave?: (content: string) => Promise<void>;
  autoSaveDelay?: number;
}

/**
 * Simple Markdown to HTML converter for preview
 */
function parseMarkdown(markdown: string): string {
  let html = markdown;

  // Escape HTML entities first
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks (must be before inline code)
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<pre class="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto my-4"><code class="language-$1">$2</code></pre>'
  );

  // Inline code
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm">$1</code>'
  );

  // Headers
  html = html.replace(
    /^######\s+(.+)$/gm,
    '<h6 class="text-sm font-semibold text-gray-900 dark:text-white mt-4 mb-2">$1</h6>'
  );
  html = html.replace(
    /^#####\s+(.+)$/gm,
    '<h5 class="text-base font-semibold text-gray-900 dark:text-white mt-4 mb-2">$1</h5>'
  );
  html = html.replace(
    /^####\s+(.+)$/gm,
    '<h4 class="text-lg font-semibold text-gray-900 dark:text-white mt-5 mb-2">$1</h4>'
  );
  html = html.replace(
    /^###\s+(.+)$/gm,
    '<h3 class="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">$1</h3>'
  );
  html = html.replace(
    /^##\s+(.+)$/gm,
    '<h2 class="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">$1</h2>'
  );
  html = html.replace(
    /^#\s+(.+)$/gm,
    '<h1 class="text-3xl font-bold text-gray-900 dark:text-white mt-8 mb-4">$1</h1>'
  );

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/___(.+?)___/g, "<strong><em>$1</em></strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-sky-600 hover:text-sky-700 underline" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Images
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg my-4" />'
  );

  // Blockquotes
  html = html.replace(
    /^&gt;\s+(.+)$/gm,
    '<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 py-1 my-4 text-gray-600 dark:text-gray-400 italic">$1</blockquote>'
  );

  // Horizontal rules
  html = html.replace(
    /^(-{3,}|\*{3,}|_{3,})$/gm,
    '<hr class="my-8 border-gray-200 dark:border-gray-700" />'
  );

  // Unordered lists
  html = html.replace(
    /^[\*\-]\s+(.+)$/gm,
    '<li class="ml-4 list-disc">$1</li>'
  );

  // Ordered lists
  html = html.replace(
    /^\d+\.\s+(.+)$/gm,
    '<li class="ml-4 list-decimal">$1</li>'
  );

  // Wrap consecutive list items
  html = html.replace(
    /(<li class="ml-4 list-disc">[\s\S]*?<\/li>)+/g,
    '<ul class="my-4 space-y-1">$&</ul>'
  );
  html = html.replace(
    /(<li class="ml-4 list-decimal">[\s\S]*?<\/li>)+/g,
    '<ol class="my-4 space-y-1">$&</ol>'
  );

  // Task lists
  html = html.replace(
    /\[x\]/gi,
    '<input type="checkbox" checked disabled class="mr-2" />'
  );
  html = html.replace(
    /\[ \]/g,
    '<input type="checkbox" disabled class="mr-2" />'
  );

  // Paragraphs
  html = html
    .split("\n\n")
    .map((block) => {
      if (block.trim().startsWith("<") || block.trim() === "") {
        return block;
      }
      return `<p class="my-4 text-gray-700 dark:text-gray-300 leading-relaxed">${block.replace(
        /\n/g,
        "<br />"
      )}</p>`;
    })
    .join("\n");

  return html;
}

export function MarkdownEditor({
  content,
  filename,
  readOnly = false,
  onSave,
  autoSaveDelay = 2000,
}: MarkdownEditorProps) {
  const { theme } = useThemeStore();
  const [editorContent, setEditorContent] = useState(content);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [splitRatio, setSplitRatio] = useState(50); // percentage for editor

  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const originalContentRef = useRef(content);

  // Real-time preview HTML
  const previewHtml = useMemo(
    () => parseMarkdown(editorContent),
    [editorContent]
  );

  // Update content when prop changes
  useEffect(() => {
    setEditorContent(content);
    originalContentRef.current = content;
    setHasUnsavedChanges(false);
  }, [content]);

  // Cleanup auto-save timer
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // Handle save operation
  const handleSave = useCallback(async () => {
    if (!onSave || isSaving || !hasUnsavedChanges) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      await onSave(editorContent);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      originalContentRef.current = editorContent;
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }, [editorContent, hasUnsavedChanges, isSaving, onSave]);

  // Auto-save functionality
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    if (onSave && autoSaveDelay > 0) {
      autoSaveTimerRef.current = setTimeout(() => {
        handleSave();
      }, autoSaveDelay);
    }
  }, [autoSaveDelay, handleSave, onSave]);

  // Handle content change
  const handleChange: OnChange = useCallback(
    (value) => {
      const newContent = value || "";
      setEditorContent(newContent);

      const hasChanges = newContent !== originalContentRef.current;
      setHasUnsavedChanges(hasChanges);

      if (saveError) setSaveError(null);

      if (hasChanges) {
        scheduleAutoSave();
      }
    },
    [saveError, scheduleAutoSave]
  );

  // Handle editor mount
  const handleEditorMount: OnMount = useCallback(
    (editor) => {
      editorRef.current = editor;

      // Add keyboard shortcut for save (Ctrl+S / Cmd+S)
      editor.addCommand(2048 | 49, () => {
        handleSave();
      });
    },
    [handleSave]
  );

  const monacoTheme = theme === "dark" ? "vs-dark" : "light";

  const formatLastSaved = (date: Date) => {
    return new Intl.DateTimeFormat("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filename} • Markdown
          </span>
          {hasUnsavedChanges && (
            <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
              Несохраненные изменения
            </span>
          )}
          {isSaving && (
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Сохранение...
            </span>
          )}
          {saveError && (
            <span className="text-xs text-red-500 dark:text-red-400">
              Ошибка: {saveError}
            </span>
          )}
          {lastSaved && !isSaving && !hasUnsavedChanges && (
            <span className="text-xs text-green-600 dark:text-green-400">
              Сохранено в {formatLastSaved(lastSaved)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Split ratio slider */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Редактор
            </span>
            <input
              type="range"
              min="20"
              max="80"
              value={splitRatio}
              onChange={(e) => setSplitRatio(Number(e.target.value))}
              className="w-20 h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Просмотр
            </span>
          </div>

          {!readOnly && onSave && (
            <button
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 ${
                hasUnsavedChanges && !isSaving
                  ? "bg-sky-500 text-white hover:bg-sky-600"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
              }`}
            >
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
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                />
              </svg>
              Сохранить
            </button>
          )}
        </div>
      </div>

      {/* Split view: Editor + Preview */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor panel */}
        <div
          className="border-r dark:border-gray-700 overflow-hidden"
          style={{ width: `${splitRatio}%` }}
        >
          <div className="h-8 px-4 flex items-center bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-700">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Редактор
            </span>
          </div>
          <div className="h-[calc(100%-2rem)]">
            <Editor
              height="100%"
              language="markdown"
              value={editorContent}
              theme={monacoTheme}
              onChange={handleChange}
              onMount={handleEditorMount}
              options={{
                readOnly,
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                wordWrap: "on",
                automaticLayout: true,
                scrollBeyondLastLine: false,
                tabSize: 2,
                insertSpaces: true,
                padding: { top: 16, bottom: 16 },
              }}
              loading={
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
                </div>
              }
            />
          </div>
        </div>

        {/* Preview panel */}
        <div
          className="overflow-hidden"
          style={{ width: `${100 - splitRatio}%` }}
        >
          <div className="h-8 px-4 flex items-center bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-700">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Просмотр
            </span>
          </div>
          <div className="h-[calc(100%-2rem)] overflow-auto p-6 bg-white dark:bg-gray-900">
            <article
              className="prose prose-gray dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
