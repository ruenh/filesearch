/**
 * Sync Manager for collaborative editing.
 * Handles operation buffering, conflict resolution, and state synchronization.
 * Requirements: 54.2
 */

import type { Socket } from "socket.io-client";
import type {
  Operation,
  PendingOperation,
  SyncState,
  CursorPosition,
  SelectionRange,
  RemoteCursor,
} from "./types";
import {
  applyOperation,
  transformOperation,
  transformCursorPosition,
  generateOperationId,
} from "./operations";

export interface SyncManagerOptions {
  documentId: string;
  initialContent: string;
  initialVersion: number;
  socket: Socket;
  userId: string;
  sessionId: string;
  onContentChange: (content: string, version: number) => void;
  onRemoteCursorUpdate: (cursors: Map<string, RemoteCursor>) => void;
  onSyncStateChange: (state: SyncState) => void;
}

export class SyncManager {
  private documentId: string;
  private content: string;
  private version: number;
  private socket: Socket;
  private sessionId: string;

  private pendingOperations: PendingOperation[] = [];
  private remoteCursors: Map<string, RemoteCursor> = new Map();
  private isConnected: boolean = false;
  private isSyncing: boolean = false;

  private onContentChange: (content: string, version: number) => void;
  private onRemoteCursorUpdate: (cursors: Map<string, RemoteCursor>) => void;
  private onSyncStateChange: (state: SyncState) => void;

  // Debounce timer for cursor updates
  private cursorUpdateTimer: NodeJS.Timeout | null = null;

  constructor(options: SyncManagerOptions) {
    this.documentId = options.documentId;
    this.content = options.initialContent;
    this.version = options.initialVersion;
    this.socket = options.socket;
    this.sessionId = options.sessionId;
    this.onContentChange = options.onContentChange;
    this.onRemoteCursorUpdate = options.onRemoteCursorUpdate;
    this.onSyncStateChange = options.onSyncStateChange;

    this.setupSocketListeners();
    this.isConnected = this.socket.connected;
    this.emitSyncState();
  }

  /**
   * Set up Socket.IO event listeners
   */
  private setupSocketListeners(): void {
    // Handle incoming content updates from other users
    this.socket.on(
      "content_update",
      (data: {
        document_id: string;
        session_id: string;
        operation: Operation;
        version: number;
      }) => {
        if (data.document_id !== this.documentId) return;
        if (data.session_id === this.sessionId) return; // Ignore own operations

        this.handleRemoteOperation(data.operation, data.version);
      }
    );

    // Handle cursor updates from other users
    this.socket.on(
      "cursor_update",
      (data: {
        document_id: string;
        session_id: string;
        user_id?: string;
        user_name?: string;
        position: CursorPosition;
        selection?: SelectionRange;
      }) => {
        if (data.document_id !== this.documentId) return;
        if (data.session_id === this.sessionId) return;

        this.handleRemoteCursor(data);
      }
    );

    // Handle user joining
    this.socket.on(
      "user_joined",
      (data: {
        document_id: string;
        session_id: string;
        user_id: string;
        user_name?: string;
      }) => {
        if (data.document_id !== this.documentId) return;
        // New user joined - they'll request sync if needed
      }
    );

    // Handle user leaving
    this.socket.on(
      "user_left",
      (data: { document_id: string; session_id: string }) => {
        if (data.document_id !== this.documentId) return;

        // Remove their cursor
        this.remoteCursors.delete(data.session_id);
        this.onRemoteCursorUpdate(this.remoteCursors);
      }
    );

    // Handle sync response
    this.socket.on(
      "sync_response",
      (data: { document_id: string; content: string; version: number }) => {
        if (data.document_id !== this.documentId) return;

        this.content = data.content;
        this.version = data.version;
        this.pendingOperations = [];
        this.isSyncing = false;
        this.onContentChange(this.content, this.version);
        this.emitSyncState();
      }
    );

    // Handle connection state
    this.socket.on("connect", () => {
      this.isConnected = true;
      this.emitSyncState();
    });

    this.socket.on("disconnect", () => {
      this.isConnected = false;
      this.emitSyncState();
    });
  }

  /**
   * Handle a remote operation from another user
   */
  private handleRemoteOperation(op: Operation, serverVersion: number): void {
    // Transform the operation against any pending local operations
    let transformedOp = op;
    for (const pending of this.pendingOperations) {
      transformedOp = transformOperation(transformedOp, pending.operation);
    }

    // Apply the transformed operation
    this.content = applyOperation(this.content, transformedOp);
    this.version = serverVersion;

    // Transform remote cursors
    this.remoteCursors.forEach((cursor, sessionId) => {
      cursor.position.offset = transformCursorPosition(
        cursor.position.offset,
        transformedOp
      );
      // Update line/column from offset
      const { line, column } = this.offsetToLineColumn(cursor.position.offset);
      cursor.position.line = line;
      cursor.position.column = column;
    });

    this.onContentChange(this.content, this.version);
    this.onRemoteCursorUpdate(this.remoteCursors);
    this.emitSyncState();
  }

  /**
   * Handle a remote cursor update
   */
  private handleRemoteCursor(data: {
    session_id: string;
    user_id?: string;
    user_name?: string;
    position: CursorPosition;
    selection?: SelectionRange;
  }): void {
    const cursor: RemoteCursor = {
      userId: data.user_id || "unknown",
      sessionId: data.session_id,
      userName: data.user_name,
      userColor: this.getUserColor(data.session_id),
      position: data.position,
      selection: data.selection,
      lastUpdate: new Date(),
    };

    this.remoteCursors.set(data.session_id, cursor);
    this.onRemoteCursorUpdate(this.remoteCursors);
  }

  /**
   * Apply a local operation and broadcast to other users
   */
  public applyLocalOperation(op: Operation): void {
    // Apply locally
    this.content = applyOperation(this.content, op);

    // Add to pending operations
    const pendingOp: PendingOperation = {
      id: generateOperationId(),
      operation: op,
      baseVersion: this.version,
      timestamp: new Date(),
    };
    this.pendingOperations.push(pendingOp);

    // Broadcast to other users
    this.socket.emit("edit_content", {
      document_id: this.documentId,
      operation: op,
      version: this.version,
    });

    // Update local version optimistically
    this.version++;

    this.onContentChange(this.content, this.version);
    this.emitSyncState();
  }

  /**
   * Update local cursor position and broadcast
   */
  public updateCursorPosition(
    position: CursorPosition,
    selection?: SelectionRange
  ): void {
    // Debounce cursor updates to avoid flooding
    if (this.cursorUpdateTimer) {
      clearTimeout(this.cursorUpdateTimer);
    }

    this.cursorUpdateTimer = setTimeout(() => {
      this.socket.emit("cursor_move", {
        document_id: this.documentId,
        position,
        selection,
      });
    }, 50); // 50ms debounce
  }

  /**
   * Request full sync from server
   */
  public requestSync(): void {
    this.isSyncing = true;
    this.emitSyncState();

    this.socket.emit("request_sync", {
      document_id: this.documentId,
      current_version: this.version,
    });
  }

  /**
   * Get current document content
   */
  public getContent(): string {
    return this.content;
  }

  /**
   * Get current version
   */
  public getVersion(): number {
    return this.version;
  }

  /**
   * Get remote cursors
   */
  public getRemoteCursors(): Map<string, RemoteCursor> {
    return this.remoteCursors;
  }

  /**
   * Convert character offset to line/column
   */
  private offsetToLineColumn(offset: number): { line: number; column: number } {
    const lines = this.content.slice(0, offset).split("\n");
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1,
    };
  }

  /**
   * Generate a consistent color for a user based on their session ID
   */
  private getUserColor(sessionId: string): string {
    const colors = [
      "#3B82F6", // blue
      "#10B981", // green
      "#8B5CF6", // purple
      "#EC4899", // pink
      "#F59E0B", // amber
      "#EF4444", // red
      "#6366F1", // indigo
      "#14B8A6", // teal
    ];

    let hash = 0;
    for (let i = 0; i < sessionId.length; i++) {
      hash = sessionId.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Emit current sync state
   */
  private emitSyncState(): void {
    this.onSyncStateChange({
      documentId: this.documentId,
      localVersion: this.version,
      serverVersion: this.version,
      pendingOperations: this.pendingOperations,
      isConnected: this.isConnected,
      isSyncing: this.isSyncing,
    });
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.cursorUpdateTimer) {
      clearTimeout(this.cursorUpdateTimer);
    }

    // Remove socket listeners
    this.socket.off("content_update");
    this.socket.off("cursor_update");
    this.socket.off("user_joined");
    this.socket.off("user_left");
    this.socket.off("sync_response");
  }
}
