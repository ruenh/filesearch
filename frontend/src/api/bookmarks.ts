/**
 * Bookmarks API client
 * Requirements: 39.1, 39.2, 39.3
 */

import { apiClient } from "./client";

export interface Bookmark {
  id: string;
  document_id: string;
  user_id: string | null;
  name: string;
  position: number;
  position_type: "offset" | "page" | "line";
  context_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBookmarkRequest {
  document_id: string;
  name: string;
  position: number;
  position_type?: "offset" | "page" | "line";
  context_text?: string;
}

export interface UpdateBookmarkRequest {
  name?: string;
  position?: number;
  context_text?: string;
}

export interface BookmarksResponse {
  bookmarks: Bookmark[];
  count: number;
}

/**
 * Create a new bookmark in a document
 * Requirements: 39.1
 */
export async function createBookmark(
  data: CreateBookmarkRequest
): Promise<Bookmark> {
  return apiClient.post<Bookmark>("/bookmarks", data);
}

/**
 * Get all bookmarks for a document
 * Requirements: 39.2
 */
export async function getDocumentBookmarks(
  documentId: string
): Promise<BookmarksResponse> {
  return apiClient.get<BookmarksResponse>(`/bookmarks/document/${documentId}`);
}

/**
 * Get a specific bookmark
 */
export async function getBookmark(bookmarkId: string): Promise<Bookmark> {
  return apiClient.get<Bookmark>(`/bookmarks/${bookmarkId}`);
}

/**
 * Update a bookmark
 */
export async function updateBookmark(
  bookmarkId: string,
  data: UpdateBookmarkRequest
): Promise<Bookmark> {
  return apiClient.put<Bookmark>(`/bookmarks/${bookmarkId}`, data);
}

/**
 * Delete a bookmark
 */
export async function deleteBookmark(bookmarkId: string): Promise<void> {
  await apiClient.delete(`/bookmarks/${bookmarkId}`);
}
