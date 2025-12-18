/**
 * ReportExport component
 * Provides CSV and PDF export functionality for analytics reports
 * Requirements: 58.3, 59.1, 59.2, 59.3
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getReport, downloadReportCSV, type ReportData } from "@/api/analytics";

interface ReportExportProps {
  storageId?: string;
}

export function ReportExport({ storageId }: ReportExportProps) {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [showPreview, setShowPreview] = useState(false);

  // Fetch report data for preview
  const {
    data: reportData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["analytics-report", storageId, startDate, endDate],
    queryFn: () =>
      getReport({
        storage_id: storageId,
        start_date: startDate,
        end_date: endDate,
      }) as Promise<ReportData>,
    enabled: showPreview,
  });

  // CSV download mutation
  const csvMutation = useMutation({
    mutationFn: () =>
      downloadReportCSV({
        storage_id: storageId,
        start_date: startDate,
        end_date: endDate,
      }),
  });

  // PDF download (generates from report data)
  const handlePDFDownload = async () => {
    if (!reportData) {
      await refetch();
    }

    // Generate PDF from report data
    const data =
      reportData ||
      ((await getReport({
        storage_id: storageId,
        start_date: startDate,
        end_date: endDate,
      })) as ReportData);

    generatePDF(data);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Экспорт отчета
        </h3>
      </div>

      {/* Date Range Selection */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Начало периода
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Конец периода
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input w-full"
          />
        </div>
      </div>

      {/* Export Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => csvMutation.mutate()}
          disabled={csvMutation.isPending}
          className="btn btn-secondary flex items-center gap-2"
        >
          {csvMutation.isPending ? <LoadingSpinner /> : <CSVIcon />}
          Скачать CSV
        </button>
        <button
          onClick={handlePDFDownload}
          disabled={isLoading}
          className="btn btn-secondary flex items-center gap-2"
        >
          {isLoading ? <LoadingSpinner /> : <PDFIcon />}
          Скачать PDF
        </button>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="btn btn-primary flex items-center gap-2"
        >
          <PreviewIcon />
          {showPreview ? "Скрыть" : "Предпросмотр"}
        </button>
      </div>

      {/* Success/Error Messages */}
      {csvMutation.isSuccess && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm">
          CSV файл успешно скачан
        </div>
      )}
      {csvMutation.isError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
          Ошибка при скачивании CSV
        </div>
      )}

      {/* Report Preview */}
      {showPreview && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : isError ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">Не удалось загрузить отчет</p>
              <button
                onClick={() => refetch()}
                className="btn btn-primary text-sm"
              >
                Повторить
              </button>
            </div>
          ) : reportData ? (
            <ReportPreview report={reportData} />
          ) : null}
        </div>
      )}
    </div>
  );
}

// Report Preview Component
interface ReportPreviewProps {
  report: ReportData;
}

function ReportPreview({ report }: ReportPreviewProps) {
  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="text-center pb-4 border-b border-gray-200 dark:border-gray-700">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
          Аналитический отчет
        </h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {formatDate(report.report_period.start_date)} —{" "}
          {formatDate(report.report_period.end_date)}
        </p>
      </div>

      {/* Storage Summary */}
      <ReportSection title="Сводка по хранилищу">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatItem
            label="Документов"
            value={report.storage_summary.total_documents}
          />
          <StatItem
            label="Размер"
            value={formatBytes(report.storage_summary.total_size_bytes)}
          />
          <StatItem
            label="Просмотров"
            value={report.storage_summary.total_views}
          />
          <StatItem
            label="Поисков"
            value={report.storage_summary.total_searches}
          />
        </div>
      </ReportSection>

      {/* Document Stats */}
      <ReportSection title="Статистика документов">
        <div className="grid grid-cols-2 gap-4">
          <StatItem
            label="Новых документов"
            value={report.document_stats.new_documents}
          />
          <StatItem
            label="Удалено документов"
            value={report.document_stats.deleted_documents}
          />
        </div>
      </ReportSection>

      {/* Search Stats */}
      <ReportSection title="Статистика поиска">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatItem
            label="Всего поисков"
            value={report.search_stats.total_searches}
          />
          <StatItem
            label="Уникальных запросов"
            value={report.search_stats.unique_queries}
          />
          <StatItem
            label="Ср. результатов"
            value={report.search_stats.avg_results_per_search.toFixed(1)}
          />
          <StatItem
            label="Без результатов"
            value={`${report.search_stats.zero_result_rate.toFixed(1)}%`}
          />
        </div>
      </ReportSection>

      {/* View Stats */}
      <ReportSection title="Статистика просмотров">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatItem
            label="Всего просмотров"
            value={report.view_stats.total_views}
          />
          <StatItem
            label="Уникальных документов"
            value={report.view_stats.unique_documents_viewed}
          />
          <StatItem
            label="Уникальных пользователей"
            value={report.view_stats.unique_users}
          />
          <StatItem
            label="Ср. просмотров/док"
            value={report.view_stats.avg_views_per_document.toFixed(1)}
          />
        </div>
      </ReportSection>

      {/* Top Documents */}
      {report.top_documents.length > 0 && (
        <ReportSection title="Топ документов">
          <div className="space-y-2">
            {report.top_documents.slice(0, 5).map((doc, index) => (
              <div
                key={doc.document_id}
                className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-400">
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {doc.name}
                  </span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {doc.view_count} просм.
                </span>
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {/* Top Searches */}
      {report.top_searches.length > 0 && (
        <ReportSection title="Топ поисковых запросов">
          <div className="space-y-2">
            {report.top_searches.slice(0, 5).map((search, index) => (
              <div
                key={search.query}
                className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-400">
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {search.query}
                  </span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {search.count}
                </span>
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {/* Generated timestamp */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center pt-4">
        Отчет сгенерирован: {formatDateTime(report.generated_at)}
      </p>
    </div>
  );
}

// Report Section Component
interface ReportSectionProps {
  title: string;
  children: React.ReactNode;
}

function ReportSection({ title, children }: ReportSectionProps) {
  return (
    <div>
      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        {title}
      </h5>
      {children}
    </div>
  );
}

// Stat Item Component
interface StatItemProps {
  label: string;
  value: string | number;
}

function StatItem({ label, value }: StatItemProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-lg font-semibold text-gray-900 dark:text-white">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

// Helper Functions
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// PDF Generation Function
function generatePDF(report: ReportData) {
  // Create a printable HTML document
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Пожалуйста, разрешите всплывающие окна для скачивания PDF");
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Аналитический отчет</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
          color: #1f2937;
        }
        h1 { text-align: center; margin-bottom: 8px; }
        .period { text-align: center; color: #6b7280; margin-bottom: 32px; }
        h2 { font-size: 14px; color: #374151; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .stat-item { background: #f9fafb; padding: 12px; border-radius: 8px; }
        .stat-label { font-size: 12px; color: #6b7280; }
        .stat-value { font-size: 18px; font-weight: 600; }
        .list-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
        .list-rank { color: #9ca3af; width: 24px; }
        .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 32px; }
        @media print {
          body { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <h1>Аналитический отчет</h1>
      <p class="period">${formatDate(
        report.report_period.start_date
      )} — ${formatDate(report.report_period.end_date)}</p>
      
      <h2>Сводка по хранилищу</h2>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">Документов</div>
          <div class="stat-value">${report.storage_summary.total_documents.toLocaleString()}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Размер</div>
          <div class="stat-value">${formatBytes(
            report.storage_summary.total_size_bytes
          )}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Просмотров</div>
          <div class="stat-value">${report.storage_summary.total_views.toLocaleString()}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Поисков</div>
          <div class="stat-value">${report.storage_summary.total_searches.toLocaleString()}</div>
        </div>
      </div>

      <h2>Статистика поиска</h2>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">Всего поисков</div>
          <div class="stat-value">${report.search_stats.total_searches.toLocaleString()}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Уникальных запросов</div>
          <div class="stat-value">${report.search_stats.unique_queries.toLocaleString()}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Ср. результатов</div>
          <div class="stat-value">${report.search_stats.avg_results_per_search.toFixed(
            1
          )}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Без результатов</div>
          <div class="stat-value">${report.search_stats.zero_result_rate.toFixed(
            1
          )}%</div>
        </div>
      </div>

      <h2>Статистика просмотров</h2>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">Всего просмотров</div>
          <div class="stat-value">${report.view_stats.total_views.toLocaleString()}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Уникальных документов</div>
          <div class="stat-value">${report.view_stats.unique_documents_viewed.toLocaleString()}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Уникальных пользователей</div>
          <div class="stat-value">${report.view_stats.unique_users.toLocaleString()}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Ср. просмотров/док</div>
          <div class="stat-value">${report.view_stats.avg_views_per_document.toFixed(
            1
          )}</div>
        </div>
      </div>

      ${
        report.top_documents.length > 0
          ? `
        <h2>Топ документов</h2>
        ${report.top_documents
          .slice(0, 10)
          .map(
            (doc, i) => `
          <div class="list-item">
            <span><span class="list-rank">${i + 1}.</span> ${doc.name}</span>
            <span>${doc.view_count} просм.</span>
          </div>
        `
          )
          .join("")}
      `
          : ""
      }

      ${
        report.top_searches.length > 0
          ? `
        <h2>Топ поисковых запросов</h2>
        ${report.top_searches
          .slice(0, 10)
          .map(
            (search, i) => `
          <div class="list-item">
            <span><span class="list-rank">${i + 1}.</span> ${
              search.query
            }</span>
            <span>${search.count}</span>
          </div>
        `
          )
          .join("")}
      `
          : ""
      }

      <p class="footer">Отчет сгенерирован: ${formatDateTime(
        report.generated_at
      )}</p>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content to load then print
  printWindow.onload = () => {
    printWindow.print();
  };
}

// Icons
function LoadingSpinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
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
  );
}

function CSVIcon() {
  return (
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
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function PDFIcon() {
  return (
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
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  );
}

function PreviewIcon() {
  return (
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
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

export default ReportExport;
