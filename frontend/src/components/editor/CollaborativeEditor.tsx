/**
 * CollaborativeEditor component
 * Wraps Monaco Editor with real-time collaboration support.
 * Requirements: 54.1, 54.2, 54.3
 */
import { useState, useEffect, useRef, useCallback } from "react";
import Editor, { type OnMount, type OnChange } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useThemeStore } from "@/store/useThemeStore";
import { useCollaborativeEditing } from "@/hooks/useCollaborativeEditing";
import {
  UserPresence,
  TypingIndicators,
} from "@/components/collaboration/UserPresence";
import type { CursorPosition, SelectionRange } from "@/lib/collaborative";

interface CollaborativeEditorProps {
  documentId: string;
  content: string;
  filename: string;
  language?: "plaintext" | "markdown";
  readOnly?: boolean;
  collaborativeEnabled?: boolean;
  onChange?: (content: string) => void;
  onSave?: (content: string) => Promise<void>;
  autoSaveDelay?: number;
}

export function CollaborativeEditor({
  documentId,
  content: initialContent,
  filename,
  language = "plaintext",
  readOnly = false,
  collaborativeEnabled = true,
  onChange,
  onSave,
  autoSaveDelay = 2000,
}: CollaborativeEditorProps) {
  const { theme } = useThemeStore();
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);

  // Local editor state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const originalContentRef = useRef(initialContent);
  const isRemoteUpdateRef = useRef(false);

  // Collaborative editing hook
  const {
    content: collaborativeContent,
    isConnected,
    isSyncing,
    activeUsers,
    remoteCursors,
    updateCursor,
    // applyInsert and applyDelete available for fine-grained OT integration
  } = useCollaborativeEditing({
    documentId,
    initialContent,
    enabled: collaborativeEnabled && !readOnly,
  });

  // Use collaborative content when enabled, otherwise use local content
  const [localContent, setLocalContent] = useState(initialContent);
  const editorContent = collaborativeEnabled
    ? collaborativeContent
    : localContent;

  // Update content when initial content changes
  useEffect(() => {
    setLocalContent(initialContent);
    originalContentRef.current = initialContent;
    setHasUnsavedChanges(false);
  }, [initialContent]);

  // Cleanup auto-save timer
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // Update remote cursor decorations in Monaco
  useEffect(() => {
    if (
      !editorRef.current ||
      !monacoRef.current ||
      remoteCursors.length === 0
    ) {
      return;
    }

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    // Create decorations for remote cursors
    const newDecorations: Monaco.editor.IModelDeltaDecoration[] =
      remoteCursors.map((cursor) => {
        const position = {
          lineNumber: cursor.position.line,
          column: cursor.position.column,
        };

        return {
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column + 1
          ),
          options: {
            className: `remote-cursor-${cursor.sessionId}`,
            beforeContentClassName: "remote-cursor-line",
            hoverMessage: { value: cursor.userName || "Anonymous" },
            stickiness:
              monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        };
      });

    // Apply decorations
    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      newDecorations
    );

    // Inject CSS for cursor colors
    const styleId = "remote-cursor-styles";
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    const css = remoteCursors
      .map(
        (cursor) => `
        .remote-cursor-${cursor.sessionId}::before {
          content: '';
          position: absolute;
          width: 2px;
          height: 18px;
          background-color: ${cursor.userColor};
          animation: cursor-blink 1s infinite;
        }
        .remote-cursor-${cursor.sessionId}::after {
          content: '${cursor.userName || "Anonymous"}';
          position: absolute;
          top: -18px;
          left: 0;
          font-size: 10px;
          padding: 1px 4px;
          background-color: ${cursor.userColor};
          color: white;
          border-radius: 2px 2px 2px 0;
          white-space: nowrap;
        }
      `
      )
      .join("\n");

    styleEl.textContent = `
      @keyframes cursor-blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
      }
      ${css}
    `;
  }, [remoteCursors]);

  // Handle save
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

  // Schedule auto-save
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

  // Handle content change from editor
  const handleChange: OnChange = useCallback(
    (value, event) => {
      if (isRemoteUpdateRef.current) {
        isRemoteUpdateRef.current = false;
        return;
      }

      const newContent = value || "";

      if (!collaborativeEnabled) {
        setLocalContent(newContent);
      }

      // Track changes for save indicator
      const hasChanges = newContent !== originalContentRef.current;
      setHasUnsavedChanges(hasChanges);

      if (saveError) setSaveError(null);
      onChange?.(newContent);

      if (hasChanges) {
        scheduleAutoSave();
      }
    },
    [collaborativeEnabled, onChange, saveError, scheduleAutoSave]
  );

  // Handle cursor position change
  const handleCursorChange = useCallback(
    (e: Monaco.editor.ICursorPositionChangedEvent) => {
      if (!collaborativeEnabled) return;

      const position: CursorPosition = {
        line: e.position.lineNumber,
        column: e.position.column,
        offset: 0, // Will be calculated by sync manager
      };

      updateCursor(position);
    },
    [collaborativeEnabled, updateCursor]
  );

  // Handle selection change
  const handleSelectionChange = useCallback(
    (e: Monaco.editor.ICursorSelectionChangedEvent) => {
      if (!collaborativeEnabled) return;

      const selection = e.selection;
      if (
        selection.startLineNumber === selection.endLineNumber &&
        selection.startColumn === selection.endColumn
      ) {
        return; // No selection, just cursor
      }

      const cursorPosition: CursorPosition = {
        line: selection.positionLineNumber,
        column: selection.positionColumn,
        offset: 0,
      };

      const selectionRange: SelectionRange = {
        start: {
          line: selection.startLineNumber,
          column: selection.startColumn,
          offset: 0,
        },
        end: {
          line: selection.endLineNumber,
          column: selection.endColumn,
          offset: 0,
        },
      };

      updateCursor(cursorPosition, selectionRange);
    },
    [collaborativeEnabled, updateCursor]
  );

  // Handle editor mount
  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Add save shortcut
      editor.addCommand(2048 | 49, () => {
        handleSave();
      });

      // Listen for cursor changes
      editor.onDidChangeCursorPosition(handleCursorChange);
      editor.onDidChangeCursorSelection(handleSelectionChange);
    },
    [handleSave, handleCursorChange, handleSelectionChange]
  );

  // Monaco theme
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

          {/* Connection status */}
          {collaborativeEnabled && (
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-400" : "bg-red-400"
                }`}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {isConnected
                  ? isSyncing
                    ? "Syncing..."
                    : "Connected"
                  : "Disconnected"}
              </span>
            </div>
          )}

          {hasUnsavedChanges && (
            <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
              Unsaved changes
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
              Saving...
            </span>
          )}

          {saveError && (
            <span className="text-xs text-red-500 dark:text-red-400">
              Error: {saveError}
            </span>
          )}

          {lastSaved && !isSaving && !hasUnsavedChanges && (
            <span className="text-xs text-green-600 dark:text-green-400">
              Saved at {formatLastSaved(lastSaved)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Active users */}
          {collaborativeEnabled && activeUsers.length > 0 && (
            <UserPresence users={activeUsers} maxVisible={3} />
          )}

          {/* Save button */}
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
              Save
            </button>
          )}
        </div>
      </div>

      {/* Typing indicators */}
      {collaborativeEnabled && remoteCursors.length > 0 && (
        <div className="px-4 py-1 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <TypingIndicators cursors={remoteCursors} />
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-hidden relative">
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

export default CollaborativeEditor;
