/**
 * Activity API client
 * Handles activity log retrieval and filtering
 * Requirements: 53.1, 53.2, 53.3
 */
import { apiClient } from "./client";

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  action_description: string;
  resource_type: string;
  resource_id: string | null;
  resource_name: string | null;
  details: Record<string, unknown>;
  timestamp: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ActivityResponse {
  activities: ActivityLog[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface ActivityTypesResponse {
  action_types: Record<string, string>;
  resource_types: string[];
}

export interface ActivityStatsResponse {
  total_activities: number;
  days: number;
  by_action: Record<string, number>;
  by_resource_type: Record<string, number>;
}

export interface GetActivityParams {
  filter?: string;
  resource_type?: string;
  resource_id?: string;
  user_id?: string;
  limit?: number;
  offset?: number;
  start_date?: string;
  end_date?: string;
}

/**
 * Get activity logs with optional filtering
 */
export async function getActivity(
  params: GetActivityParams = {}
): Promise<ActivityResponse> {
  const queryParams: Record<string, string> = {};

  if (params.filter) queryParams.filter = params.filter;
  if (params.resource_type) queryParams.resource_type = params.resource_type;
  if (params.resource_id) queryParams.resource_id = params.resource_id;
  if (params.user_id) queryParams.user_id = params.user_id;
  if (params.limit) queryParams.limit = params.limit.toString();
  if (params.offset) queryParams.offset = params.offset.toString();
  if (params.start_date) queryParams.start_date = params.start_date;
  if (params.end_date) queryParams.end_date = params.end_date;

  return apiClient.get<ActivityResponse>("/activity", queryParams);
}

/**
 * Get available action types and resource types
 */
export async function getActivityTypes(): Promise<ActivityTypesResponse> {
  return apiClient.get<ActivityTypesResponse>("/activity/types");
}

/**
 * Get activity for a specific user
 */
export async function getUserActivity(
  userId: string,
  params: { limit?: number; offset?: number } = {}
): Promise<
  ActivityResponse & { user: { id: string; name: string; email: string } }
> {
  const queryParams: Record<string, string> = {};
  if (params.limit) queryParams.limit = params.limit.toString();
  if (params.offset) queryParams.offset = params.offset.toString();

  return apiClient.get(`/activity/user/${userId}`, queryParams);
}

/**
 * Get activity for a specific resource
 */
export async function getResourceActivity(
  resourceType: string,
  resourceId: string,
  params: { limit?: number; offset?: number } = {}
): Promise<ActivityResponse & { resource_type: string; resource_id: string }> {
  const queryParams: Record<string, string> = {};
  if (params.limit) queryParams.limit = params.limit.toString();
  if (params.offset) queryParams.offset = params.offset.toString();

  return apiClient.get(
    `/activity/resource/${resourceType}/${resourceId}`,
    queryParams
  );
}

/**
 * Get recent activity
 */
export async function getRecentActivity(
  limit: number = 20
): Promise<{ activities: ActivityLog[] }> {
  return apiClient.get<{ activities: ActivityLog[] }>("/activity/recent", {
    limit: limit.toString(),
  });
}

/**
 * Get activity statistics
 */
export async function getActivityStats(
  params: { user_id?: string; days?: number } = {}
): Promise<ActivityStatsResponse> {
  const queryParams: Record<string, string> = {};
  if (params.user_id) queryParams.user_id = params.user_id;
  if (params.days) queryParams.days = params.days.toString();

  return apiClient.get<ActivityStatsResponse>("/activity/stats", queryParams);
}
