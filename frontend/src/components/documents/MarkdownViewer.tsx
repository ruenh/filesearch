/**
 * MarkdownViewer component
 * Displays Markdown content with rendered preview and raw/preview toggle
 * Requirements: 35.1, 35.2
 */
import { useState, useMemo } from "react";

interface MarkdownViewerProps {
  content: string;
  filename: string;
}

type ViewMode = "preview" | "raw" | "split";

/**
 * Simple Markdown to HTML converter
 * Handles basic Markdown syntax
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

  // Paragraphs (wrap remaining text)
  html = html
    .split("\n\n")
    .map((block) => {
      // Don't wrap if already wrapped in HTML tags
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

export function MarkdownViewer({ content, filename }: MarkdownViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("preview");

  const renderedHtml = useMemo(() => parseMarkdown(content), [content]);
  const lines = useMemo(() => content.split("\n"), [content]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {lines.length} строк • Markdown
        </span>

        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode("preview")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              viewMode === "preview"
                ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Просмотр
          </button>
          <button
            onClick={() => setViewMode("raw")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              viewMode === "raw"
                ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Исходник
          </button>
          <button
            onClick={() => setViewMode("split")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              viewMode === "split"
                ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Разделить
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "preview" && (
          <div className="h-full overflow-auto p-6">
            <article
              className="prose prose-gray dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          </div>
        )}

        {viewMode === "raw" && (
          <div className="h-full overflow-auto">
            <pre className="p-4 font-mono text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
              {content}
            </pre>
          </div>
        )}

        {viewMode === "split" && (
          <div className="flex h-full">
            <div className="w-1/2 border-r dark:border-gray-700 overflow-auto">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-700">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Исходник
                </span>
              </div>
              <pre className="p-4 font-mono text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                {content}
              </pre>
            </div>
            <div className="w-1/2 overflow-auto">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-700">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Просмотр
                </span>
              </div>
              <div className="p-6">
                <article
                  className="prose prose-gray dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
