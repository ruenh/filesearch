/**
 * AI API client
 * Handles chat, summarization, translation, comparison, and tagging
 * Requirements: 7.1, 7.2, 7.3, 17.1, 17.2, 17.3, 18.1, 18.2, 18.3, 19.1, 19.2, 20.1, 20.2, 20.4, 21.1, 21.2, 21.3
 */

import { apiClient } from "./client";

// Types
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: DocumentSource[];
  timestamp: string;
}

export interface DocumentSource {
  documentId: string;
  documentName: string;
}

export interface ChatSession {
  id: string;
  storage_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: ChatMessage[];
}

export interface ChatResponse {
  id: string;
  session_id: string;
  role: "assistant";
  content: string;
  sources: DocumentSource[];
  timestamp: string;
}

export interface SummaryResponse {
  document_id: string;
  document_name: string;
  summary: string;
  length: "short" | "medium" | "long";
}

export interface TranslateResponse {
  document_id: string;
  document_name: string;
  target_language: string;
  translated_content: string;
}

export interface CompareResponse {
  document_1: { id: string; name: string };
  document_2: { id: string; name: string };
  analysis: string;
}

export interface TagsResponse {
  document_id: string;
  document_name: string;
  suggested_tags: string[];
}

export interface SimilarDocument {
  documentId: string;
  documentName: string;
  similarityScore: number;
}

export interface SimilarResponse {
  document_id: string;
  document_name: string;
  similar_documents: SimilarDocument[];
}

// Chat API
export async function sendChatMessage(
  message: string,
  storageId: string,
  sessionId?: string
): Promise<ChatResponse> {
  return apiClient.post<ChatResponse>("/ai/chat", {
    message,
    storage_id: storageId,
    session_id: sessionId,
  });
}

export async function getChatSessions(
  storageId: string,
  limit = 20,
  offset = 0
): Promise<{ sessions: ChatSession[]; total: number }> {
  return apiClient.get<{ sessions: ChatSession[]; total: number }>(
    "/ai/chat/sessions",
    { storage_id: storageId, limit: String(limit), offset: String(offset) }
  );
}

export async function getChatSession(sessionId: string): Promise<ChatSession> {
  return apiClient.get<ChatSession>(`/ai/chat/sessions/${sessionId}`);
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/ai/chat/sessions/${sessionId}`);
}

export async function updateChatSessionTitle(
  sessionId: string,
  title: string
): Promise<ChatSession> {
  return apiClient.put<ChatSession>(`/ai/chat/sessions/${sessionId}/title`, {
    title,
  });
}

// Summarization API
export async function summarizeDocument(
  documentId: string,
  length: "short" | "medium" | "long" = "medium"
): Promise<SummaryResponse> {
  return apiClient.post<SummaryResponse>("/ai/summarize", {
    document_id: documentId,
    length,
  });
}

// Translation API
export async function translateDocument(
  documentId: string,
  targetLanguage: string
): Promise<TranslateResponse> {
  return apiClient.post<TranslateResponse>("/ai/translate", {
    document_id: documentId,
    target_language: targetLanguage,
  });
}

// Comparison API
export async function compareDocuments(
  documentId1: string,
  documentId2: string
): Promise<CompareResponse> {
  return apiClient.post<CompareResponse>("/ai/compare", {
    document_id_1: documentId1,
    document_id_2: documentId2,
  });
}

// Tags API
export async function generateTags(
  documentId: string,
  maxTags = 5
): Promise<TagsResponse> {
  return apiClient.post<TagsResponse>("/ai/tags", {
    document_id: documentId,
    max_tags: maxTags,
  });
}

// Similar documents API
export async function findSimilarDocuments(
  documentId: string,
  limit = 5
): Promise<SimilarResponse> {
  return apiClient.post<SimilarResponse>("/ai/similar", {
    document_id: documentId,
    limit,
  });
}
