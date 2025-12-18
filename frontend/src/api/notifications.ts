/**
 * Notification API functions.
 * Requirements: 55.1, 55.2, 55.3
 */
import { apiClient } from "./client";
import type { Notification, NotificationsResponse } from "@/types";

/**
 * Get notifications for the current user.
 */
export async function getNotifications(params?: {
  limit?: number;
  offset?: number;
  unread_only?: boolean;
}): Promise<NotificationsResponse> {
  const queryParams: Record<string, string> = {};
  if (params?.limit !== undefined) queryParams.limit = String(params.limit);
  if (params?.offset !== undefined) queryParams.offset = String(params.offset);
  if (params?.unread_only !== undefined)
    queryParams.unread_only = String(params.unread_only);

  return apiClient.get<NotificationsResponse>("/notifications", queryParams);
}

/**
 * Get count of unread notifications.
 */
export async function getUnreadCount(): Promise<{ unread_count: number }> {
  return apiClient.get<{ unread_count: number }>("/notifications/unread-count");
}

/**
 * Mark a notification as read.
 */
export async function markNotificationRead(
  notificationId: string
): Promise<{ notification: Notification; unread_count: number }> {
  return apiClient.put<{ notification: Notification; unread_count: number }>(
    `/notifications/${notificationId}/read`
  );
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsRead(): Promise<{
  success: boolean;
  unread_count: number;
}> {
  return apiClient.put<{ success: boolean; unread_count: number }>(
    "/notifications/read-all"
  );
}

/**
 * Delete a notification.
 */
export async function deleteNotification(
  notificationId: string
): Promise<{ success: boolean; unread_count: number }> {
  return apiClient.delete<{ success: boolean; unread_count: number }>(
    `/notifications/${notificationId}`
  );
}

/**
 * Clear all notifications.
 */
export async function clearAllNotifications(): Promise<{
  success: boolean;
  unread_count: number;
}> {
  return apiClient.delete<{ success: boolean; unread_count: number }>(
    "/notifications/clear"
  );
}
