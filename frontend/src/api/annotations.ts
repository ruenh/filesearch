/**
 * Annotations API client
 * Requirements: 38.1, 38.2, 38.3
 */

import { apiClient } from "./client";

export interface Annotation {
  id: string;
  document_id: string;
  user_id: string | null;
  selected_text: string;
  start_offset: number;
  end_offset: number;
  note: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAnnotationRequest {
  document_id: string;
  selected_text: string;
  start_offset: number;
  end_offset: number;
  note?: string;
  color?: string;
}

export interface UpdateAnnotationRequest {
  note?: string;
  color?: string;
}

export interface AnnotationsResponse {
  annotations: Annotation[];
  count: number;
}

/**
 * Create a new annotation on a document
 * Requirements: 38.1, 38.2
 */
export async function createAnnotation(
  data: CreateAnnotationRequest
): Promise<Annotation> {
  return apiClient.post<Annotation>("/annotations", data);
}

/**
 * Get all annotations for a document
 * Requirements: 38.3
 */
export async function getDocumentAnnotations(
  documentId: string
): Promise<AnnotationsResponse> {
  return apiClient.get<AnnotationsResponse>(
    `/annotations/document/${documentId}`
  );
}

/**
 * Get a specific annotation
 */
export async function getAnnotation(annotationId: string): Promise<Annotation> {
  return apiClient.get<Annotation>(`/annotations/${annotationId}`);
}

/**
 * Update an annotation
 */
export async function updateAnnotation(
  annotationId: string,
  data: UpdateAnnotationRequest
): Promise<Annotation> {
  return apiClient.put<Annotation>(`/annotations/${annotationId}`, data);
}

/**
 * Delete an annotation
 */
export async function deleteAnnotation(annotationId: string): Promise<void> {
  await apiClient.delete(`/annotations/${annotationId}`);
}
