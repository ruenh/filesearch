/**
 * TextEditor component
 * Monaco Editor integration for TXT and MD file editing with auto-save
 * Requirements: 34.1, 34.2
 */
import { useState, useEffect, useRef, useCallback } from "react";
import Editor, { type OnMount, type OnChange } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useThemeStore } from "@/store/useThemeStore";

interface TextEditorProps {
  content: string;
  filename: string;
  language?: "plaintext" | "markdown";
  readOnly?: boolean;
  onChange?: (content: string) => void;
  onSave?: (content: string) => Promise<void>;
  autoSaveDelay?: number; // milliseconds, default 2000
}

export function TextEditor({
  content,
  filename,
  language = "plaintext",
  readOnly = false,
  onChange,
  onSave,
  autoSaveDelay = 2000,
}: TextEditorProps) {
  const { theme } = useThemeStore();
  const [editorContent, setEditorContent] = useState(content);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const originalContentRef = useRef(content);

  // Update content when prop changes (e.g., loading new document)
  useEffect(() => {
    setEditorContent(content);
    originalContentRef.current = content;
    setHasUnsavedChanges(false);
  }, [content]);

  // Cleanup auto-save timer on unmount
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

      // Check if content has changed from original
      const hasChanges = newContent !== originalContentRef.current;
      setHasUnsavedChanges(hasChanges);

      // Clear any previous save error
      if (saveError) setSaveError(null);

      // Notify parent of change
      onChange?.(newContent);

      // Schedule auto-save if there are changes
      if (hasChanges) {
        scheduleAutoSave();
      }
    },
    [onChange, saveError, scheduleAutoSave]
  );

  // Handle editor mount
  const handleEditorMount: OnMount = useCallback(
    (editor) => {
      editorRef.current = editor;

      // Add keyboard shortcut for save (Ctrl+S / Cmd+S)
      editor.addCommand(
        // Monaco.KeyMod.CtrlCmd | Monaco.KeyCode.KeyS
        2048 | 49, // CtrlCmd + S
        () => {
          handleSave();
        }
      );
    },
    [handleSave]
  );

  // Determine Monaco theme based on app theme
  const monacoTheme = theme === "dark" ? "vs-dark" : "light";

  // Format last saved time
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
            {filename}
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

        <div className="flex items-center gap-2">
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

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={language}
          value={editorContent}
          theme={monacoTheme}
          onChange={handleChange}
          onMount={handleEditorMount}
          options={{
            readOnly,
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: "on",
            wordWrap: "on",
            automaticLayout: true,
            scrollBeyondLastLine: false,
            tabSize: 2,
            insertSpaces: true,
            renderWhitespace: "selection",
            bracketPairColorization: { enabled: true },
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
  );
}
