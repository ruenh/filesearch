/**
 * Webhooks API client
 * Requirements: 45.1, 45.2, 45.3
 */
import { apiClient } from "./client";

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  headers: Record<string, string>;
  last_triggered_at: string | null;
  last_status_code: number | null;
  last_error: string | null;
  success_count: number;
  failure_count: number;
  created_at: string;
  updated_at: string;
  has_secret?: boolean;
  secret?: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status_code: number | null;
  response_body: string | null;
  error: string | null;
  success: boolean;
  duration_ms: number | null;
  created_at: string;
}

export interface CreateWebhookRequest {
  name: string;
  url: string;
  events: string[];
  headers?: Record<string, string>;
  generate_secret?: boolean;
}

export interface UpdateWebhookRequest {
  name?: string;
  url?: string;
  events?: string[];
  headers?: Record<string, string>;
  is_active?: boolean;
}

export interface WebhookListResponse {
  webhooks: Webhook[];
  count: number;
  available_events: Record<string, string>;
}

export interface DeliveryListResponse {
  deliveries: WebhookDelivery[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

/**
 * List all webhooks for the current user
 */
export const listWebhooks = (
  isActive?: boolean
): Promise<WebhookListResponse> => {
  const params: Record<string, string> = {};
  if (isActive !== undefined) {
    params.is_active = String(isActive);
  }
  return apiClient.get<WebhookListResponse>(
    "/webhooks",
    Object.keys(params).length > 0 ? params : undefined
  );
};

/**
 * Get available webhook event types
 */
export const getEventTypes = (): Promise<{
  events: Record<string, string>;
}> => {
  return apiClient.get<{ events: Record<string, string> }>("/webhooks/events");
};

/**
 * Create a new webhook
 */
export const createWebhook = (data: CreateWebhookRequest): Promise<Webhook> => {
  return apiClient.post<Webhook>("/webhooks", data);
};

/**
 * Get a specific webhook
 */
export const getWebhook = (webhookId: string): Promise<Webhook> => {
  return apiClient.get<Webhook>(`/webhooks/${webhookId}`);
};

/**
 * Update a webhook
 */
export const updateWebhook = (
  webhookId: string,
  data: UpdateWebhookRequest
): Promise<Webhook> => {
  return apiClient.put<Webhook>(`/webhooks/${webhookId}`, data);
};

/**
 * Delete a webhook
 */
export const deleteWebhook = (
  webhookId: string
): Promise<{ message: string }> => {
  return apiClient.delete<{ message: string }>(`/webhooks/${webhookId}`);
};

/**
 * Regenerate webhook secret
 */
export const regenerateSecret = (
  webhookId: string
): Promise<{ id: string; secret: string; warning: string }> => {
  return apiClient.post<{ id: string; secret: string; warning: string }>(
    `/webhooks/${webhookId}/regenerate-secret`
  );
};

/**
 * Test a webhook by sending a test event
 */
export const testWebhook = (
  webhookId: string
): Promise<{ success: boolean; delivery: WebhookDelivery }> => {
  return apiClient.post<{ success: boolean; delivery: WebhookDelivery }>(
    `/webhooks/${webhookId}/test`
  );
};

/**
 * List delivery history for a webhook
 */
export const listDeliveries = (
  webhookId: string,
  options?: { limit?: number; offset?: number; success?: boolean }
): Promise<DeliveryListResponse> => {
  const params: Record<string, string> = {};
  if (options?.limit) params.limit = String(options.limit);
  if (options?.offset) params.offset = String(options.offset);
  if (options?.success !== undefined) params.success = String(options.success);

  return apiClient.get<DeliveryListResponse>(
    `/webhooks/${webhookId}/deliveries`,
    Object.keys(params).length > 0 ? params : undefined
  );
};
