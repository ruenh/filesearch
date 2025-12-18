/**
 * Search API client
 * Handles search operations, history, and suggestions
 * Requirements: 6.1, 6.2, 9.1, 14.1, 14.2, 15.1, 16.1, 16.2
 */

import { apiClient } from "./client";

// Types
export interface SearchFilters {
  date_from?: string;
  date_to?: string;
  file_types?: string;
  size_min?: number;
  size_max?: number;
}

export interface SearchResult {
  documentId: string;
  documentName: string;
  snippet: string;
  score: number;
  fileType: string;
  size: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  storage_id: string;
  cached: boolean;
  total: number;
}

export interface SearchHistoryItem {
  id: string;
  search_query: string;
  storage_id: string;
  result_count: number;
  filters: SearchFilters;
  created_at: string;
}

export interface SearchHistoryResponse {
  history: SearchHistoryItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  search_query: string;
  storage_id: string;
  filters: SearchFilters;
  created_at: string;
}

export interface SavedSearchesResponse {
  saved_searches: SavedSearch[];
  total: number;
}

export interface Suggestion {
  text: string;
  type: "history" | "document" | "saved";
  result_count?: number;
  document_id?: string;
  name?: string;
}

export interface SuggestionsResponse {
  suggestions: Suggestion[];
  query: string;
}

// API functions

/**
 * Perform semantic search across documents
 * Requirements: 6.1, 6.2
 */
export async function search(
  query: string,
  storageId: string,
  filters?: SearchFilters,
  useAi: boolean = true
): Promise<SearchResponse> {
  return apiClient.post<SearchResponse>("/search", {
    query,
    storage_id: storageId,
    filters,
    use_ai: useAi,
  });
}

/**
 * Get search history
 * Requirements: 14.1, 14.2
 */
export async function getSearchHistory(
  storageId?: string,
  limit: number = 20,
  offset: number = 0
): Promise<SearchHistoryResponse> {
  const params: Record<string, string> = {
    limit: limit.toString(),
    offset: offset.toString(),
  };
  if (storageId) {
    params.storage_id = storageId;
  }
  return apiClient.get<SearchHistoryResponse>("/search/history", params);
}

/**
 * Delete a search history entry
 * Requirements: 14.2
 */
export async function deleteSearchHistoryItem(
  historyId: string
): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(`/search/history/${historyId}`);
}

/**
 * Clear all search history
 * Requirements: 14.2
 */
export async function clearSearchHistory(
  storageId?: string
): Promise<{ message: string; deleted_count: number }> {
  const params: Record<string, string> = {};
  if (storageId) {
    params.storage_id = storageId;
  }
  return apiClient.delete<{ message: string; deleted_count: number }>(
    `/search/history${storageId ? `?storage_id=${storageId}` : ""}`
  );
}

/**
 * Save a search query
 * Requirements: 16.1
 */
export async function saveSearch(
  name: string,
  query: string,
  storageId: string,
  filters?: SearchFilters
): Promise<SavedSearch> {
  return apiClient.post<SavedSearch>("/search/save", {
    name,
    query,
    storage_id: storageId,
    filters,
  });
}

/**
 * Get saved searches
 * Requirements: 16.2
 */
export async function getSavedSearches(
  storageId?: string
): Promise<SavedSearchesResponse> {
  const params: Record<string, string> = {};
  if (storageId) {
    params.storage_id = storageId;
  }
  return apiClient.get<SavedSearchesResponse>("/search/save", params);
}

/**
 * Delete a saved search
 * Requirements: 16.2
 */
export async function deleteSavedSearch(
  savedId: string
): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(`/search/save/${savedId}`);
}

/**
 * Get autocomplete suggestions
 * Requirements: 15.1, 15.2, 15.3
 */
export async function getSuggestions(
  query: string,
  storageId?: string,
  limit: number = 10
): Promise<SuggestionsResponse> {
  const params: Record<string, string> = {
    q: query,
    limit: limit.toString(),
  };
  if (storageId) {
    params.storage_id = storageId;
  }
  return apiClient.get<SuggestionsResponse>("/search/suggestions", params);
}
