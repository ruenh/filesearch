/**
 * CodeViewer component
 * Displays code files with syntax highlighting and line numbers
 * Requirements: 37.1, 37.2, 37.3
 */
import { useState, useMemo } from "react";

interface CodeViewerProps {
  content: string;
  filename: string;
  language?: string;
}

// Language detection based on file extension
const LANGUAGE_MAP: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  rb: "ruby",
  java: "java",
  c: "c",
  cpp: "cpp",
  h: "c",
  hpp: "cpp",
  cs: "csharp",
  go: "go",
  rs: "rust",
  php: "php",
  swift: "swift",
  kt: "kotlin",
  scala: "scala",
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  json: "json",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  ini: "ini",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  sql: "sql",
  graphql: "graphql",
  gql: "graphql",
  dockerfile: "dockerfile",
  makefile: "makefile",
};

// Simple syntax highlighting patterns
const SYNTAX_PATTERNS: Record<
  string,
  Array<{ pattern: RegExp; className: string }>
> = {
  javascript: [
    { pattern: /(\/\/.*$)/gm, className: "text-gray-500" }, // Comments
    { pattern: /(\/\*[\s\S]*?\*\/)/g, className: "text-gray-500" }, // Multi-line comments
    {
      pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g,
      className: "text-green-600 dark:text-green-400",
    }, // Strings
    {
      pattern:
        /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|class|extends|new|this|super|import|export|from|default|async|await|yield)\b/g,
      className: "text-purple-600 dark:text-purple-400",
    }, // Keywords
    {
      pattern: /\b(true|false|null|undefined|NaN|Infinity)\b/g,
      className: "text-orange-600 dark:text-orange-400",
    }, // Literals
    {
      pattern: /\b(\d+\.?\d*)\b/g,
      className: "text-blue-600 dark:text-blue-400",
    }, // Numbers
  ],
  typescript: [
    { pattern: /(\/\/.*$)/gm, className: "text-gray-500" },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, className: "text-gray-500" },
    {
      pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g,
      className: "text-green-600 dark:text-green-400",
    },
    {
      pattern:
        /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|class|extends|new|this|super|import|export|from|default|async|await|yield|type|interface|enum|implements|private|public|protected|readonly|static|abstract)\b/g,
      className: "text-purple-600 dark:text-purple-400",
    },
    {
      pattern:
        /\b(true|false|null|undefined|NaN|Infinity|string|number|boolean|any|void|never|unknown)\b/g,
      className: "text-orange-600 dark:text-orange-400",
    },
    {
      pattern: /\b(\d+\.?\d*)\b/g,
      className: "text-blue-600 dark:text-blue-400",
    },
  ],
  python: [
    { pattern: /(#.*$)/gm, className: "text-gray-500" },
    { pattern: /("""[\s\S]*?"""|'''[\s\S]*?''')/g, className: "text-gray-500" },
    {
      pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,
      className: "text-green-600 dark:text-green-400",
    },
    {
      pattern:
        /\b(def|class|return|if|elif|else|for|while|try|except|finally|raise|import|from|as|with|pass|break|continue|lambda|yield|global|nonlocal|assert|del|in|is|not|and|or)\b/g,
      className: "text-purple-600 dark:text-purple-400",
    },
    {
      pattern: /\b(True|False|None)\b/g,
      className: "text-orange-600 dark:text-orange-400",
    },
    {
      pattern: /\b(\d+\.?\d*)\b/g,
      className: "text-blue-600 dark:text-blue-400",
    },
  ],
  json: [
    {
      pattern: /("(?:[^"\\]|\\.)*")(?=\s*:)/g,
      className: "text-purple-600 dark:text-purple-400",
    }, // Keys
    {
      pattern: /:\s*("(?:[^"\\]|\\.)*")/g,
      className: "text-green-600 dark:text-green-400",
    }, // String values
    {
      pattern: /\b(true|false|null)\b/g,
      className: "text-orange-600 dark:text-orange-400",
    },
    {
      pattern: /\b(-?\d+\.?\d*)\b/g,
      className: "text-blue-600 dark:text-blue-400",
    },
  ],
  html: [
    { pattern: /(<!--[\s\S]*?-->)/g, className: "text-gray-500" },
    {
      pattern: /(<\/?[\w-]+)/g,
      className: "text-purple-600 dark:text-purple-400",
    },
    {
      pattern: /([\w-]+)(?==)/g,
      className: "text-orange-600 dark:text-orange-400",
    },
    {
      pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,
      className: "text-green-600 dark:text-green-400",
    },
  ],
  css: [
    { pattern: /(\/\*[\s\S]*?\*\/)/g, className: "text-gray-500" },
    {
      pattern: /([.#]?[\w-]+)(?=\s*\{)/g,
      className: "text-purple-600 dark:text-purple-400",
    },
    {
      pattern: /([\w-]+)(?=\s*:)/g,
      className: "text-blue-600 dark:text-blue-400",
    },
    {
      pattern: /:\s*([^;{}]+)/g,
      className: "text-green-600 dark:text-green-400",
    },
  ],
  sql: [
    { pattern: /(--.*$)/gm, className: "text-gray-500" },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, className: "text-gray-500" },
    {
      pattern: /('(?:[^'\\]|\\.)*')/g,
      className: "text-green-600 dark:text-green-400",
    },
    {
      pattern:
        /\b(SELECT|FROM|WHERE|AND|OR|NOT|IN|LIKE|ORDER BY|GROUP BY|HAVING|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|INDEX|DROP|ALTER|ADD|COLUMN|PRIMARY KEY|FOREIGN KEY|REFERENCES|UNIQUE|NULL|DEFAULT|AUTO_INCREMENT|LIMIT|OFFSET|UNION|DISTINCT|COUNT|SUM|AVG|MIN|MAX|CASE|WHEN|THEN|ELSE|END)\b/gi,
      className: "text-purple-600 dark:text-purple-400",
    },
    {
      pattern: /\b(\d+\.?\d*)\b/g,
      className: "text-blue-600 dark:text-blue-400",
    },
  ],
  bash: [
    { pattern: /(#.*$)/gm, className: "text-gray-500" },
    {
      pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,
      className: "text-green-600 dark:text-green-400",
    },
    {
      pattern:
        /\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|exit|echo|read|export|source|alias|unalias|cd|pwd|ls|mkdir|rm|cp|mv|cat|grep|sed|awk|find|xargs|pipe|sudo)\b/g,
      className: "text-purple-600 dark:text-purple-400",
    },
    {
      pattern: /(\$[\w_]+|\$\{[\w_]+\})/g,
      className: "text-orange-600 dark:text-orange-400",
    },
  ],
};

// Detect language from filename
function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return LANGUAGE_MAP[ext] || "text";
}

// Apply syntax highlighting (simple approach)
function highlightCode(code: string, language: string): string {
  const patterns = SYNTAX_PATTERNS[language];
  if (!patterns) return escapeHtml(code);

  let highlighted = escapeHtml(code);

  // Apply patterns in order
  for (const { pattern, className } of patterns) {
    highlighted = highlighted.replace(pattern, (match) => {
      // Don't highlight if already inside a span
      if (match.includes("<span")) return match;
      return `<span class="${className}">${match}</span>`;
    });
  }

  return highlighted;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function CodeViewer({
  content,
  filename,
  language: propLanguage,
}: CodeViewerProps) {
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wordWrap, setWordWrap] = useState(false);

  const language = propLanguage || detectLanguage(filename);
  const lines = useMemo(() => content.split("\n"), [content]);

  // Calculate line number width
  const lineNumberWidth = useMemo(() => {
    const digits = String(lines.length).length;
    return Math.max(digits * 0.6 + 1, 2.5);
  }, [lines.length]);

  // Highlight each line
  const highlightedLines = useMemo(() => {
    return lines.map((line) => highlightCode(line, language));
  }, [lines, language]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {lines.length} строк
          </span>
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
            {language.toUpperCase()}
          </span>
        </div>

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

      {/* Code content */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        <table className="w-full border-collapse font-mono text-sm">
          <tbody>
            {highlightedLines.map((line, index) => (
              <tr
                key={index}
                className="hover:bg-gray-100 dark:hover:bg-gray-800/50"
              >
                {showLineNumbers && (
                  <td
                    className="select-none text-right pr-4 pl-2 text-gray-400 dark:text-gray-500 border-r dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50 sticky left-0"
                    style={{
                      width: `${lineNumberWidth}em`,
                      minWidth: `${lineNumberWidth}em`,
                    }}
                  >
                    {index + 1}
                  </td>
                )}
                <td
                  className={`pl-4 pr-4 py-0.5 text-gray-900 dark:text-gray-100 ${
                    wordWrap
                      ? "whitespace-pre-wrap break-words"
                      : "whitespace-pre"
                  }`}
                  dangerouslySetInnerHTML={{ __html: line || "\u00A0" }}
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
