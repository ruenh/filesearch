/**
 * Analytics API client
 * Handles analytics dashboard, trends, and reports
 * Requirements: 57.1, 57.2, 58.3, 59.1, 60.2, 60.3
 */
import { apiClient } from "./client";

// Types
export interface FileTypeBreakdown {
  file_type: string;
  count: number;
  total_size: number;
}

export interface TimelineDataPoint {
  date: string;
  count: number;
}

export interface PopularDocument {
  document_id: string;
  name: string;
  file_type: string;
  view_count: number;
}

export interface PopularSearch {
  query: string;
  count: number;
}

export interface StorageStats {
  storage_id?: string;
  total_documents: number;
  total_size_bytes: number;
  total_views: number;
  total_searches: number;
  storage_count?: number;
}

export interface ActivitySummary {
  total_activities: number;
  by_action: Record<string, number>;
}

export interface DashboardData {
  period_days: number;
  storage_id: string | null;
  storage_stats: StorageStats;
  file_type_breakdown: FileTypeBreakdown[];
  view_timeline: TimelineDataPoint[];
  search_timeline: TimelineDataPoint[];
  popular_documents: PopularDocument[];
  popular_searches: PopularSearch[];
  recent_activity: ActivitySummary;
  generated_at: string;
}

export interface SearchStats {
  total_searches: number;
  avg_results: number;
  avg_response_time_ms: number;
}

export interface ViewStats {
  total_views: number;
  unique_documents: number;
}

export interface TrendsData {
  period_days: number;
  storage_id: string | null;
  search_trends?: TimelineDataPoint[];
  popular_searches?: PopularSearch[];
  search_stats?: SearchStats;
  view_trends?: TimelineDataPoint[];
  popular_documents?: PopularDocument[];
  view_stats?: ViewStats;
}

export interface ReportPeriod {
  start_date: string;
  end_date: string;
}

export interface DocumentStats {
  new_documents: number;
  deleted_documents: number;
}

export interface ReportSearchStats {
  total_searches: number;
  unique_queries: number;
  avg_results_per_search: number;
  zero_result_searches: number;
  zero_result_rate: number;
}

export interface ReportViewStats {
  total_views: number;
  unique_documents_viewed: number;
  unique_users: number;
  avg_views_per_document: number;
}

export interface ActivityBreakdown {
  action: string;
  description: string;
  count: number;
}

export interface ReportData {
  report_period: ReportPeriod;
  storage_id: string | null;
  generated_at: string;
  storage_summary: StorageStats;
  document_stats: DocumentStats;
  search_stats: ReportSearchStats;
  view_stats: ReportViewStats;
  activity_breakdown: ActivityBreakdown[];
  top_documents: PopularDocument[];
  top_searches: PopularSearch[];
}

// API Functions

/**
 * Get analytics dashboard data
 */
export async function getDashboard(
  params: {
    storage_id?: string;
    days?: number;
  } = {}
): Promise<DashboardData> {
  const queryParams: Record<string, string> = {};
  if (params.storage_id) queryParams.storage_id = params.storage_id;
  if (params.days) queryParams.days = params.days.toString();

  return apiClient.get<DashboardData>("/analytics/dashboard", queryParams);
}

/**
 * Get search and view trends
 */
export async function getTrends(
  params: {
    storage_id?: string;
    days?: number;
    type?: "search" | "view" | "all";
  } = {}
): Promise<TrendsData> {
  const queryParams: Record<string, string> = {};
  if (params.storage_id) queryParams.storage_id = params.storage_id;
  if (params.days) queryParams.days = params.days.toString();
  if (params.type) queryParams.type = params.type;

  return apiClient.get<TrendsData>("/analytics/trends", queryParams);
}

/**
 * Get analytics report
 */
export async function getReport(
  params: {
    storage_id?: string;
    start_date?: string;
    end_date?: string;
    format?: "json" | "csv";
  } = {}
): Promise<ReportData | Blob> {
  const queryParams: Record<string, string> = {};
  if (params.storage_id) queryParams.storage_id = params.storage_id;
  if (params.start_date) queryParams.start_date = params.start_date;
  if (params.end_date) queryParams.end_date = params.end_date;
  if (params.format) queryParams.format = params.format;

  if (params.format === "csv") {
    // For CSV, we need to handle the response differently
    const url = `/api/analytics/report?${new URLSearchParams(
      queryParams
    ).toString()}`;
    const response = await fetch(url);
    return response.blob();
  }

  return apiClient.get<ReportData>("/analytics/report", queryParams);
}

/**
 * Download report as CSV
 */
export async function downloadReportCSV(params: {
  storage_id?: string;
  start_date?: string;
  end_date?: string;
}): Promise<void> {
  const queryParams: Record<string, string> = { format: "csv" };
  if (params.storage_id) queryParams.storage_id = params.storage_id;
  if (params.start_date) queryParams.start_date = params.start_date;
  if (params.end_date) queryParams.end_date = params.end_date;

  const url = `/api/analytics/report?${new URLSearchParams(
    queryParams
  ).toString()}`;
  const response = await fetch(url);
  const blob = await response.blob();

  // Create download link
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = `analytics_report_${
    new Date().toISOString().split("T")[0]
  }.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
}

/**
 * Refresh storage statistics
 */
export async function refreshStorageStats(storageId: string): Promise<{
  message: string;
  stats: StorageStats;
}> {
  return apiClient.post(`/analytics/storage/${storageId}/refresh`);
}

/**
 * Get search trends (popular search queries)
 * Requirements: 60.2, 60.3
 */
export async function getSearchTrends(
  params: {
    storage_id?: string;
    limit?: number;
  } = {}
): Promise<{ trends: PopularSearch[] }> {
  const queryParams: Record<string, string> = {};
  if (params.storage_id) queryParams.storage_id = params.storage_id;
  if (params.limit) queryParams.limit = params.limit.toString();

  const data = await getTrends({
    storage_id: params.storage_id,
    type: "search",
  });

  return {
    trends: data.popular_searches || [],
  };
}
