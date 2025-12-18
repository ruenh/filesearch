/**
 * Share API
 * Handles document sharing via unique links
 * Requirements: 51.1, 51.2, 51.3, 65.1, 65.2
 */

import { apiClient } from "./client";

export interface ShareLink {
  id: string;
  document_id: string;
  token: string;
  url: string;
  has_password: boolean;
  expires_at: string | null;
  access_count: number;
  last_accessed_at: string | null;
  is_active: boolean;
  is_expired: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateShareLinkRequest {
  document_id: string;
  password?: string;
  expires_at?: string;
}

export interface UpdateShareLinkRequest {
  password?: string | null;
  expires_at?: string | null;
  is_active?: boolean;
}

export interface SharedDocumentResponse {
  document: {
    id: string;
    name: string;
    file_type: string;
    size: number;
    created_at: string;
    updated_at: string;
  };
  share_link: {
    expires_at: string | null;
    access_count: number;
  };
}

export interface SharedDocumentContent {
  content: string;
  type: string;
  name: string;
  size: number;
}

/**
 * Create a new share link for a document
 * Requirements: 51.1, 65.1
 */
export async function createShareLink(
  data: CreateShareLinkRequest
): Promise<ShareLink> {
  return apiClient.post<ShareLink>("/share", data);
}

/**
 * Get shared document by token
 * Requirements: 51.3, 65.2
 */
export async function getSharedDocument(
  token: string,
  password?: string
): Promise<SharedDocumentResponse> {
  const params: Record<string, string> = {};
  if (password) {
    params.password = password;
  }
  return apiClient.get<SharedDocumentResponse>(`/share/${token}`, params);
}

/**
 * Get shared document content by token
 * Requirements: 51.3
 */
export async function getSharedDocumentContent(
  token: string,
  password?: string
): Promise<SharedDocumentContent> {
  const params: Record<string, string> = {};
  if (password) {
    params.password = password;
  }
  return apiClient.get<SharedDocumentContent>(
    `/share/${token}/content`,
    params
  );
}

/**
 * Delete a share link
 * Requirements: 51.1
 */
export async function deleteShareLink(
  shareId: string
): Promise<{ message: string; id: string }> {
  return apiClient.delete<{ message: string; id: string }>(`/share/${shareId}`);
}

/**
 * List all share links for a document
 */
export async function listDocumentShareLinks(
  documentId: string
): Promise<ShareLink[]> {
  return apiClient.get<ShareLink[]>(`/share/document/${documentId}`);
}

/**
 * Update a share link
 */
export async function updateShareLink(
  shareId: string,
  data: UpdateShareLinkRequest
): Promise<ShareLink> {
  return apiClient.put<ShareLink>(`/share/${shareId}`, data);
}
