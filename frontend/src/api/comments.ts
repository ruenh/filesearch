/**
 * Comments API
 * Handles document comments with threaded replies
 * Requirements: 52.1, 52.2, 52.3
 */

import { apiClient } from "./client";

export interface CommentUser {
  id: string;
  name: string;
  email: string;
}

export interface Comment {
  id: string;
  document_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  user?: CommentUser;
  replies?: Comment[];
}

export interface CreateCommentRequest {
  document_id: string;
  user_id: string;
  content: string;
  parent_id?: string;
}

export interface UpdateCommentRequest {
  content: string;
}

/**
 * Create a new comment on a document
 * Requirements: 52.1
 */
export async function createComment(
  data: CreateCommentRequest
): Promise<Comment> {
  return apiClient.post<Comment>("/comments", data);
}

/**
 * Get all comments for a document
 * Requirements: 52.2
 */
export async function getDocumentComments(
  documentId: string,
  threaded: boolean = true
): Promise<Comment[]> {
  return apiClient.get<Comment[]>(`/comments/${documentId}`, {
    threaded: threaded.toString(),
  });
}

/**
 * Get a single comment by ID
 */
export async function getComment(commentId: string): Promise<Comment> {
  return apiClient.get<Comment>(`/comments/comment/${commentId}`);
}

/**
 * Update a comment's content
 */
export async function updateComment(
  commentId: string,
  data: UpdateCommentRequest
): Promise<Comment> {
  return apiClient.put<Comment>(`/comments/comment/${commentId}`, data);
}

/**
 * Delete a comment
 */
export async function deleteComment(
  commentId: string
): Promise<{ message: string; id: string }> {
  return apiClient.delete<{ message: string; id: string }>(
    `/comments/comment/${commentId}`
  );
}
