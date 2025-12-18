/**
 * Folders API functions
 * Requirements: 22.1, 22.2, 22.3
 */
import { apiClient } from "./client";
import type { Folder } from "@/types";

interface FolderResponse {
  id: string;
  storage_id: string;
  parent_id?: string;
  name: string;
  created_at: string;
  updated_at: string;
  children?: FolderResponse[];
}

interface BreadcrumbItem {
  id: string;
  name: string;
  parent_id?: string;
}

// Transform API response to frontend Folder type
function transformFolder(data: FolderResponse): Folder {
  return {
    id: data.id,
    storageId: data.storage_id,
    parentId: data.parent_id,
    name: data.name,
    children: data.children?.map(transformFolder) || [],
  };
}

/**
 * Create a new folder
 * Requirements: 22.1
 */
export async function createFolder(
  name: string,
  storageId: string,
  parentId?: string
): Promise<Folder> {
  const payload: Record<string, string> = {
    name,
    storage_id: storageId,
  };
  if (parentId) {
    payload.parent_id = parentId;
  }
  const response = await apiClient.post<FolderResponse>("/folders", payload);
  return transformFolder(response);
}

/**
 * List folders in a storage
 * Requirements: 22.2
 */
export async function listFolders(
  storageId: string,
  parentId?: string | null,
  includeChildren = false
): Promise<Folder[]> {
  const params: Record<string, string> = {
    storage_id: storageId,
  };
  if (parentId === null) {
    params.parent_id = "null";
  } else if (parentId) {
    params.parent_id = parentId;
  }
  if (includeChildren) {
    params.include_children = "true";
  }
  const response = await apiClient.get<FolderResponse[]>("/folders", params);
  return response.map(transformFolder);
}

/**
 * Get folder details
 */
export async function getFolder(
  folderId: string,
  includeChildren = false
): Promise<Folder> {
  const params: Record<string, string> = {};
  if (includeChildren) {
    params.include_children = "true";
  }
  const response = await apiClient.get<FolderResponse>(
    `/folders/${folderId}`,
    params
  );
  return transformFolder(response);
}

/**
 * Update folder
 * Requirements: 22.2
 */
export async function updateFolder(
  folderId: string,
  data: { name?: string; parentId?: string | null }
): Promise<Folder> {
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.parentId !== undefined) payload.parent_id = data.parentId;
  const response = await apiClient.put<FolderResponse>(
    `/folders/${folderId}`,
    payload
  );
  return transformFolder(response);
}

/**
 * Delete folder
 * Requirements: 22.2
 */
export async function deleteFolder(
  folderId: string,
  cascade = true
): Promise<void> {
  const cascadeParam = cascade ? "true" : "false";
  await apiClient.delete(`/folders/${folderId}?cascade=${cascadeParam}`);
}

/**
 * Get folder breadcrumb path
 * Requirements: 22.3
 */
export async function getFolderBreadcrumb(
  folderId: string
): Promise<BreadcrumbItem[]> {
  const response = await apiClient.get<BreadcrumbItem[]>(
    `/folders/${folderId}/breadcrumb`
  );
  return response;
}

/**
 * Get complete folder tree for a storage
 * Requirements: 22.2
 */
export async function getFolderTree(storageId: string): Promise<Folder[]> {
  const params: Record<string, string> = {
    storage_id: storageId,
  };
  const response = await apiClient.get<FolderResponse[]>(
    "/folders/tree",
    params
  );
  return response.map(transformFolder);
}
