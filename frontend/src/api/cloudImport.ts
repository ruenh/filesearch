/**
 * Cloud Import API functions
 * Requirements: 32.1, 32.2, 32.3
 */
import { apiClient } from "./client";
import type { Document } from "@/types";

// ============================================================================
// Types
// ============================================================================

export interface CloudProvider {
  id: string;
  name: string;
  icon: string;
  configured: boolean;
  supported_types: string[];
}

export interface CloudFile {
  id: string;
  name: string;
  mime_type: string;
  size: number | null;
  modified_at: string;
  icon_url: string;
  thumbnail_url: string | null;
  is_folder: boolean;
  is_supported: boolean;
}

export interface CloudFileDetails {
  id: string;
  name: string;
  mime_type: string;
  size: number | null;
  created_at: string;
  modified_at: string;
  parent_ids: string[];
  web_view_link: string;
  is_supported: boolean;
}

export interface ListFilesResponse {
  files: CloudFile[];
  next_page_token: string | null;
  folder_id: string;
}

export interface ImportResult {
  file_id: string;
  file_name?: string;
  success: boolean;
  error?: string;
  document?: Document;
}

interface ImportResponseItem {
  file_id: string;
  file_name?: string;
  success: boolean;
  error?: string;
  document?: DocumentResponse;
}

export interface ImportResponse {
  results: ImportResponseItem[];
  total: number;
  success_count: number;
  failed_count: number;
}

export interface AuthUrlResponse {
  auth_url: string;
  provider: string;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  provider: string;
}

interface DocumentResponse {
  id: string;
  storage_id: string;
  folder_id?: string;
  name: string;
  file_type: "txt" | "pdf" | "docx" | "md" | "image";
  size: number;
  is_favorite: boolean;
  is_archived: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

// Transform API response to frontend Document type
function transformDocument(data: DocumentResponse): Document {
  return {
    id: data.id,
    storageId: data.storage_id,
    folderId: data.folder_id,
    name: data.name,
    type: data.file_type,
    size: data.size,
    isFavorite: data.is_favorite,
    isArchived: data.is_archived,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    tags: [],
    versions: [],
  };
}

// ============================================================================
// Provider Functions
// ============================================================================

/**
 * List available cloud import providers
 * Requirements: 32.1
 */
export async function listCloudProviders(): Promise<CloudProvider[]> {
  const response = await apiClient.get<{ providers: CloudProvider[] }>(
    "/cloud/providers"
  );
  return response.providers;
}

// ============================================================================
// Google Drive Functions
// Requirements: 32.1, 32.2, 32.3
// ============================================================================

/**
 * Get Google OAuth authorization URL
 * Requirements: 32.1
 */
export async function getGoogleAuthUrl(): Promise<string> {
  const response = await apiClient.get<AuthUrlResponse>("/cloud/google/auth");
  return response.auth_url;
}

/**
 * Exchange authorization code for access token
 * Requirements: 32.1
 */
export async function exchangeGoogleToken(
  code: string
): Promise<TokenResponse> {
  const response = await apiClient.post<TokenResponse>("/cloud/google/token", {
    code,
  });
  return response;
}

/**
 * List files from Google Drive
 * Requirements: 32.2
 */
export async function listGoogleDriveFiles(
  token: string,
  folderId: string = "root",
  pageToken?: string
): Promise<ListFilesResponse> {
  const params: Record<string, string> = {
    token,
    folder_id: folderId,
  };

  if (pageToken) {
    params.page_token = pageToken;
  }

  const response = await apiClient.get<ListFilesResponse>(
    "/cloud/google/files",
    params
  );
  return response;
}

/**
 * Get detailed info about a Google Drive file
 * Requirements: 32.2
 */
export async function getGoogleDriveFileInfo(
  token: string,
  fileId: string
): Promise<CloudFileDetails> {
  const response = await apiClient.get<CloudFileDetails>(
    `/cloud/google/file/${fileId}`,
    { token }
  );
  return response;
}

/**
 * Import files from Google Drive to a storage
 * Requirements: 32.3
 */
export async function importFromGoogleDrive(
  token: string,
  fileIds: string[],
  storageId: string,
  folderId?: string
): Promise<{
  results: ImportResult[];
  successCount: number;
  failedCount: number;
}> {
  const response = await apiClient.post<ImportResponse>(
    "/cloud/google/import",
    {
      token,
      file_ids: fileIds,
      storage_id: storageId,
      folder_id: folderId,
    }
  );

  return {
    results: response.results.map(
      (r): ImportResult => ({
        file_id: r.file_id,
        file_name: r.file_name,
        success: r.success,
        error: r.error,
        document: r.document ? transformDocument(r.document) : undefined,
      })
    ),
    successCount: response.success_count,
    failedCount: response.failed_count,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "—";

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Get file icon based on MIME type
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType === "application/vnd.google-apps.folder") return "folder";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "file-pdf";
  if (mimeType.includes("document") || mimeType.includes("word"))
    return "file-text";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return "file-spreadsheet";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return "file-presentation";
  if (mimeType === "text/plain" || mimeType === "text/markdown")
    return "file-text";
  return "file";
}
