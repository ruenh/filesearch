/**
 * Hook for collaborative editing functionality.
 * Integrates WebSocket communication with OT-based sync.
 * Requirements: 54.2
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useWebSocket, type DocumentUser } from "./useWebSocket";
import {
  SyncManager,
  type RemoteCursor,
  type SyncState,
  type CursorPosition,
  type SelectionRange,
  createInsertOp,
  createDeleteOp,
} from "../lib/collaborative";

export interface UseCollaborativeEditingOptions {
  documentId: string;
  initialContent: string;
  initialVersion?: number;
  enabled?: boolean;
}

export interface UseCollaborativeEditingReturn {
  // Content state
  content: string;
  version: number;

  // Connection state
  isConnected: boolean;
  isSyncing: boolean;

  // Users
  activeUsers: DocumentUser[];
  remoteCursors: RemoteCursor[];

  // Operations
  applyInsert: (position: number, text: string) => void;
  applyDelete: (position: number, length: number) => void;
  updateCursor: (position: CursorPosition, selection?: SelectionRange) => void;

  // Sync
  requestSync: () => void;

  // Lifecycle
  joinDocument: () => void;
  leaveDocument: () => void;
}

export function useCollaborativeEditing(
  options: UseCollaborativeEditingOptions
): UseCollaborativeEditingReturn {
  const {
    documentId,
    initialContent,
    initialVersion = 0,
    enabled = true,
  } = options;

  // WebSocket connection
  const {
    socket,
    isConnected,
    sessionId,
    documentUsers,
    joinDocument: wsJoinDocument,
    leaveDocument: wsLeaveDocument,
  } = useWebSocket();

  // Local state
  const [content, setContent] = useState(initialContent);
  const [version, setVersion] = useState(initialVersion);
  const [isSyncing, setIsSyncing] = useState(false);
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);

  // Sync manager ref
  const syncManagerRef = useRef<SyncManager | null>(null);
  const isJoinedRef = useRef(false);

  // Handle content changes from sync manager
  const handleContentChange = useCallback(
    (newContent: string, newVersion: number) => {
      setContent(newContent);
      setVersion(newVersion);
    },
    []
  );

  // Handle remote cursor updates
  const handleRemoteCursorUpdate = useCallback(
    (cursors: Map<string, RemoteCursor>) => {
      setRemoteCursors(Array.from(cursors.values()));
    },
    []
  );

  // Handle sync state changes
  const handleSyncStateChange = useCallback((state: SyncState) => {
    setIsSyncing(state.isSyncing);
  }, []);

  // Initialize sync manager when connected
  useEffect(() => {
    if (!enabled || !socket || !isConnected || !sessionId) {
      return;
    }

    // Create sync manager
    syncManagerRef.current = new SyncManager({
      documentId,
      initialContent,
      initialVersion,
      socket,
      userId: sessionId, // Use session ID as user ID for now
      sessionId,
      onContentChange: handleContentChange,
      onRemoteCursorUpdate: handleRemoteCursorUpdate,
      onSyncStateChange: handleSyncStateChange,
    });

    return () => {
      if (syncManagerRef.current) {
        syncManagerRef.current.destroy();
        syncManagerRef.current = null;
      }
    };
  }, [
    enabled,
    socket,
    isConnected,
    sessionId,
    documentId,
    initialContent,
    initialVersion,
    handleContentChange,
    handleRemoteCursorUpdate,
    handleSyncStateChange,
  ]);

  // Join document
  const joinDocument = useCallback(() => {
    if (!enabled || isJoinedRef.current) return;

    wsJoinDocument(documentId);
    isJoinedRef.current = true;
  }, [enabled, documentId, wsJoinDocument]);

  // Leave document
  const leaveDocument = useCallback(() => {
    if (!isJoinedRef.current) return;

    wsLeaveDocument(documentId);
    isJoinedRef.current = false;
    setRemoteCursors([]);
  }, [documentId, wsLeaveDocument]);

  // Auto-join when enabled and connected
  useEffect(() => {
    if (enabled && isConnected && !isJoinedRef.current) {
      joinDocument();
    }

    return () => {
      if (isJoinedRef.current) {
        leaveDocument();
      }
    };
  }, [enabled, isConnected, joinDocument, leaveDocument]);

  // Apply insert operation
  const applyInsert = useCallback((position: number, text: string) => {
    if (!syncManagerRef.current) {
      // Fallback to local-only edit
      setContent(
        (prev) => prev.slice(0, position) + text + prev.slice(position)
      );
      return;
    }

    const op = createInsertOp(position, text);
    syncManagerRef.current.applyLocalOperation(op);
  }, []);

  // Apply delete operation
  const applyDelete = useCallback((position: number, length: number) => {
    if (!syncManagerRef.current) {
      // Fallback to local-only edit
      setContent(
        (prev) => prev.slice(0, position) + prev.slice(position + length)
      );
      return;
    }

    const op = createDeleteOp(position, length);
    syncManagerRef.current.applyLocalOperation(op);
  }, []);

  // Update cursor position
  const updateCursor = useCallback(
    (position: CursorPosition, selection?: SelectionRange) => {
      if (syncManagerRef.current) {
        syncManagerRef.current.updateCursorPosition(position, selection);
      }
    },
    []
  );

  // Request sync
  const requestSync = useCallback(() => {
    if (syncManagerRef.current) {
      syncManagerRef.current.requestSync();
    }
  }, []);

  return {
    content,
    version,
    isConnected,
    isSyncing,
    activeUsers: documentUsers,
    remoteCursors,
    applyInsert,
    applyDelete,
    updateCursor,
    requestSync,
    joinDocument,
    leaveDocument,
  };
}

export default useCollaborativeEditing;
