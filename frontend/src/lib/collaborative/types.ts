/**
 * Types for collaborative editing with Operational Transformation (OT).
 * Requirements: 54.2
 */

// Operation types for text editing
export type OperationType = "insert" | "delete" | "retain";

export interface Operation {
  type: OperationType;
  position: number;
  text?: string; // For insert operations
  length?: number; // For delete/retain operations
}

// Document state with version tracking
export interface DocumentState {
  content: string;
  version: number;
  lastModified: Date;
}

// Cursor position in the document
export interface CursorPosition {
  line: number;
  column: number;
  offset: number; // Absolute character offset
}

// Selection range
export interface SelectionRange {
  start: CursorPosition;
  end: CursorPosition;
}

// Remote user cursor state
export interface RemoteCursor {
  userId: string;
  sessionId: string;
  userName?: string;
  userColor: string;
  position: CursorPosition;
  selection?: SelectionRange;
  lastUpdate: Date;
}

// Pending operation waiting for acknowledgment
export interface PendingOperation {
  id: string;
  operation: Operation;
  baseVersion: number;
  timestamp: Date;
}

// Sync state for the collaborative session
export interface SyncState {
  documentId: string;
  localVersion: number;
  serverVersion: number;
  pendingOperations: PendingOperation[];
  isConnected: boolean;
  isSyncing: boolean;
}

// Event types for collaborative editing
export interface CollaborativeEvent {
  type: "operation" | "cursor" | "presence" | "sync";
  documentId: string;
  userId: string;
  sessionId: string;
  timestamp: Date;
}

export interface OperationEvent extends CollaborativeEvent {
  type: "operation";
  operation: Operation;
  version: number;
}

export interface CursorEvent extends CollaborativeEvent {
  type: "cursor";
  position: CursorPosition;
  selection?: SelectionRange;
}

export interface PresenceEvent extends CollaborativeEvent {
  type: "presence";
  action: "join" | "leave";
  userName?: string;
}

export interface SyncEvent extends CollaborativeEvent {
  type: "sync";
  content: string;
  version: number;
}
