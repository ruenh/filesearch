/**
 * Users API client
 * Handles user management operations (admin only)
 */

import { apiClient } from "./client";

export type UserRole = "admin" | "editor" | "viewer";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  two_factor_enabled: boolean;
  preferences: Record<string, unknown>;
  created_at: string;
}

export interface RoleInfo {
  id: UserRole;
  name: string;
  description: string;
  level: number;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface UserStatsResponse {
  total: number;
  by_role: {
    admin: number;
    editor: number;
    viewer: number;
  };
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: UserRole;
}

export interface ListUsersParams {
  role?: UserRole;
  search?: string;
  page?: number;
  per_page?: number;
}

/**
 * List all users (admin only)
 */
export async function listUsers(
  params?: ListUsersParams
): Promise<UserListResponse> {
  const queryParams: Record<string, string> = {};

  if (params?.role) queryParams.role = params.role;
  if (params?.search) queryParams.search = params.search;
  if (params?.page) queryParams.page = params.page.toString();
  if (params?.per_page) queryParams.per_page = params.per_page.toString();

  return apiClient.get<UserListResponse>("/users", queryParams);
}

/**
 * Get a specific user by ID (admin only)
 */
export async function getUser(userId: string): Promise<{ user: User }> {
  return apiClient.get<{ user: User }>(`/users/${userId}`);
}

/**
 * Create a new user (admin only)
 */
export async function createUser(
  data: CreateUserData
): Promise<{ message: string; user: User }> {
  return apiClient.post<{ message: string; user: User }>("/users", data);
}

/**
 * Update a user (admin only)
 */
export async function updateUser(
  userId: string,
  data: UpdateUserData
): Promise<{ message: string; user: User }> {
  return apiClient.put<{ message: string; user: User }>(
    `/users/${userId}`,
    data
  );
}

/**
 * Update a user's role (admin only)
 */
export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<{ message: string; user: User }> {
  return apiClient.put<{ message: string; user: User }>(
    `/users/${userId}/role`,
    {
      role,
    }
  );
}

/**
 * Delete a user (admin only)
 */
export async function deleteUser(userId: string): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(`/users/${userId}`);
}

/**
 * Get available roles
 */
export async function getRoles(): Promise<{ roles: RoleInfo[] }> {
  return apiClient.get<{ roles: RoleInfo[] }>("/users/roles");
}

/**
 * Get user statistics (admin only)
 */
export async function getUserStats(): Promise<UserStatsResponse> {
  return apiClient.get<UserStatsResponse>("/users/stats");
}
