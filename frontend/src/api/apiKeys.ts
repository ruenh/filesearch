/**
 * API Keys API module
 * Handles API key management operations
 */

import { apiClient } from "./client";

export interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  rate_limit: number;
  request_count: number;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface APIKeyWithSecret extends APIKey {
  key: string;
  warning: string;
}

export interface CreateAPIKeyRequest {
  name: string;
  rate_limit?: number;
  expires_at?: string;
}

export interface UpdateAPIKeyRequest {
  name?: string;
  rate_limit?: number;
  is_active?: boolean;
  expires_at?: string | null;
}

export interface APIKeyUsageStats {
  total_requests: number;
  requests_last_hour: number;
  requests_last_day: number;
  rate_limit: number;
  rate_limit_remaining: number;
}

export interface APIKeyUsageLog {
  endpoint: string;
  method: string;
  status_code: number | null;
  response_time_ms: number | null;
  ip_address: string | null;
  timestamp: string;
}

export interface APIKeyUsageResponse {
  api_key: APIKey;
  stats: APIKeyUsageStats;
  recent_usage: APIKeyUsageLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface ListAPIKeysResponse {
  api_keys: APIKey[];
  count: number;
}

/**
 * List all API keys for the current user
 */
export const listAPIKeys = (): Promise<ListAPIKeysResponse> => {
  return apiClient.get<ListAPIKeysResponse>("/api-keys");
};

/**
 * Create a new API key
 */
export const createAPIKey = (
  data: CreateAPIKeyRequest
): Promise<APIKeyWithSecret> => {
  return apiClient.post<APIKeyWithSecret>("/api-keys", data);
};

/**
 * Get details of a specific API key
 */
export const getAPIKey = (id: string): Promise<APIKey> => {
  return apiClient.get<APIKey>(`/api-keys/${id}`);
};

/**
 * Update an API key
 */
export const updateAPIKey = (
  id: string,
  data: UpdateAPIKeyRequest
): Promise<APIKey> => {
  return apiClient.put<APIKey>(`/api-keys/${id}`, data);
};

/**
 * Delete an API key
 */
export const deleteAPIKey = (id: string): Promise<{ message: string }> => {
  return apiClient.delete<{ message: string }>(`/api-keys/${id}`);
};

/**
 * Regenerate an API key (creates new key value)
 */
export const regenerateAPIKey = (id: string): Promise<APIKeyWithSecret> => {
  return apiClient.post<APIKeyWithSecret>(`/api-keys/${id}/regenerate`);
};

/**
 * Get usage statistics for an API key
 */
export const getAPIKeyUsage = (
  id: string,
  params?: { limit?: number; offset?: number }
): Promise<APIKeyUsageResponse> => {
  const queryParams: Record<string, string> = {};
  if (params?.limit) queryParams.limit = params.limit.toString();
  if (params?.offset) queryParams.offset = params.offset.toString();

  return apiClient.get<APIKeyUsageResponse>(
    `/api-keys/${id}/usage`,
    queryParams
  );
};
