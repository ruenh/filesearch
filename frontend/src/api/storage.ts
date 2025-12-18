/**
 * Storage API functions
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */
import { apiClient } from "./client";
import type { Storage } from "@/types";

interface StorageResponse {
  id: string;
  name: string;
  document_count: number;
  total_size: number;
  created_at: string;
  updated_at: string;
}

interface CreateStorageRequest {
  name: string;
}

interface DeleteStorageResponse {
  message: string;
  deleted_id: string;
}

// Transform API response to frontend Storage type
function transformStorage(data: StorageResponse): Storage {
  return {
    id: data.id,
    name: data.name,
    documentCount: data.document_count,
    totalSize: data.total_size,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

/**
 * Create a new storage
 * Requirements: 2.1
 */
export async function createStorage(name: string): Promise<Storage> {
  const data: CreateStorageRequest = { name };
  const response = await apiClient.post<StorageResponse>("/storage", data);
  return transformStorage(response);
}

/**
 * List all storages
 * Requirements: 2.2
 */
export async function listStorages(
  sortBy: "name" | "created_at" | "updated_at" = "created_at",
  order: "asc" | "desc" = "desc"
): Promise<Storage[]> {
  const response = await apiClient.get<StorageResponse[]>("/storage", {
    sort_by: sortBy,
    order,
  });
  return response.map(transformStorage);
}

/**
 * Get storage details
 * Requirements: 2.3
 */
export async function getStorage(storageId: string): Promise<Storage> {
  const response = await apiClient.get<StorageResponse>(
    `/storage/${storageId}`
  );
  return transformStorage(response);
}

/**
 * Delete a storage and all associated documents
 * Requirements: 2.4
 */
export async function deleteStorage(
  storageId: string
): Promise<DeleteStorageResponse> {
  return apiClient.delete<DeleteStorageResponse>(`/storage/${storageId}`);
}

/**
 * Export storage as ZIP archive
 * Requirements: 33.1, 33.2, 33.3
 */
export async function exportStorage(
  storageId: string,
  storageName: string
): Promise<void> {
  const response = await fetch(`/api/storage/${storageId}/export`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Failed to export storage" }));
    throw new Error(error.error || "Failed to export storage");
  }

  // Get the blob from response
  const blob = await response.blob();

  // Create download link
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;

  // Generate filename from storage name
  const safeName = storageName.replace(/[^a-zA-Z0-9\s\-_]/g, "").trim();
  link.download = `${safeName}_export.zip`;

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
