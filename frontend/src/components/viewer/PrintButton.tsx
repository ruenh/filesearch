/**
 * PrintButton component for printing documents
 * Requirements: 43.1, 43.2, 43.3
 */

import { useCallback } from "react";
import { Printer } from "lucide-react";

interface PrintButtonProps {
  content: string;
  title?: string;
  className?: string;
}

export function PrintButton({
  content,
  title,
  className = "",
}: PrintButtonProps) {
  const handlePrint = useCallback(() => {
    // Create a new window for printing
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print");
      return;
    }

    // Generate print-friendly HTML
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title || "Document"}</title>
          <style>
            @media print {
              @page {
                margin: 2cm;
                size: A4;
              }
            }
            body {
              font-family: 'Georgia', 'Times New Roman', serif;
              font-size: 12pt;
              line-height: 1.6;
              color: #000;
              max-width: 100%;
              margin: 0;
              padding: 20px;
            }
            h1 {
              font-size: 18pt;
              margin-bottom: 20px;
              border-bottom: 1px solid #ccc;
              padding-bottom: 10px;
            }
            pre {
              white-space: pre-wrap;
              word-wrap: break-word;
              font-family: 'Courier New', monospace;
              font-size: 10pt;
              background: #f5f5f5;
              padding: 10px;
              border-radius: 4px;
            }
            .content {
              white-space: pre-wrap;
              word-wrap: break-word;
            }
            .footer {
              margin-top: 30px;
              padding-top: 10px;
              border-top: 1px solid #ccc;
              font-size: 9pt;
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          ${title ? `<h1>${escapeHtml(title)}</h1>` : ""}
          <div class="content">${escapeHtml(content)}</div>
          <div class="footer">
            Printed on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
  }, [content, title]);

  return (
    <button
      onClick={handlePrint}
      className={`flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${className}`}
      title="Print document"
    >
      <Printer className="w-4 h-4" />
      <span>Print</span>
    </button>
  );
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export default PrintButton;
