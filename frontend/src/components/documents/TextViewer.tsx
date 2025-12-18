/**
 * TextViewer component
 * Displays text file content with proper formatting and optional line numbers
 * Requirements: 4.2
 */
import { useState, useMemo } from "react";

interface TextViewerProps {
  content: string;
  filename: string;
}

export function TextViewer({ content, filename }: TextViewerProps) {
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wordWrap, setWordWrap] = useState(true);

  // Split content into lines for line numbering
  const lines = useMemo(() => content.split("\n"), [content]);

  // Calculate line number width based on total lines
  const lineNumberWidth = useMemo(() => {
    const digits = String(lines.length).length;
    return Math.max(digits * 0.6 + 1, 2.5); // em units
  }, [lines.length]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {lines.length} строк • {content.length} символов
        </span>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showLineNumbers}
              onChange={(e) => setShowLineNumbers(e.target.checked)}
              className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
            />
            Номера строк
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={wordWrap}
              onChange={(e) => setWordWrap(e.target.checked)}
              className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
            />
            Перенос строк
          </label>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div
          className={`font-mono text-sm ${wordWrap ? "" : "overflow-x-auto"}`}
        >
          {showLineNumbers ? (
            <table className="w-full border-collapse">
              <tbody>
                {lines.map((line, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-100 dark:hover:bg-gray-800/50"
                  >
                    <td
                      className="select-none text-right pr-4 pl-2 text-gray-400 dark:text-gray-500 border-r dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 sticky left-0"
                      style={{
                        width: `${lineNumberWidth}em`,
                        minWidth: `${lineNumberWidth}em`,
                      }}
                    >
                      {index + 1}
                    </td>
                    <td
                      className={`pl-4 pr-4 py-0.5 text-gray-900 dark:text-gray-100 ${
                        wordWrap
                          ? "whitespace-pre-wrap break-words"
                          : "whitespace-pre"
                      }`}
                    >
                      {line || "\u00A0"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <pre
              className={`p-4 text-gray-900 dark:text-gray-100 ${
                wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre"
              }`}
            >
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
