/**
 * WebSocket hook for real-time collaboration.
 * Provides connection management and event handling for Socket.IO.
 */
import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useUserStore } from "../store/useUserStore";

// WebSocket server URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

// Types for presence tracking
export interface DocumentUser {
  user_id: string;
  session_id: string;
  user_name?: string;
  user_email?: string;
  joined_at?: string;
}

export interface CursorPosition {
  line: number;
  column: number;
}

export interface CursorUpdate {
  document_id: string;
  session_id: string;
  position: CursorPosition;
  selection?: {
    start: CursorPosition;
    end: CursorPosition;
  };
}

export interface ContentUpdate {
  document_id: string;
  session_id: string;
  operation: {
    type: "insert" | "delete" | "replace";
    position: number;
    text?: string;
    length?: number;
  };
  version: number;
}

// Hook return type
export interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  sessionId: string | null;
  documentUsers: DocumentUser[];
  joinDocument: (documentId: string) => void;
  leaveDocument: (documentId: string) => void;
  sendCursorMove: (
    documentId: string,
    position: CursorPosition,
    selection?: CursorUpdate["selection"]
  ) => void;
  sendContentEdit: (
    documentId: string,
    operation: ContentUpdate["operation"],
    version: number
  ) => void;
  onUserJoined: (
    callback: (data: {
      document_id: string;
      user_id: string;
      user_name?: string;
      session_id: string;
    }) => void
  ) => void;
  onUserLeft: (
    callback: (data: {
      document_id: string;
      user_id: string;
      user_name?: string;
      session_id: string;
    }) => void
  ) => void;
  onCursorUpdate: (callback: (data: CursorUpdate) => void) => void;
  onContentUpdate: (callback: (data: ContentUpdate) => void) => void;
}

/**
 * Custom hook for WebSocket connection and real-time collaboration.
 */
export function useWebSocket(): UseWebSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [documentUsers, setDocumentUsers] = useState<DocumentUser[]>([]);
  const currentDocumentRef = useRef<string | null>(null);

  // Event callback refs
  const userJoinedCallbackRef = useRef<((data: any) => void) | null>(null);
  const userLeftCallbackRef = useRef<((data: any) => void) | null>(null);
  const cursorUpdateCallbackRef = useRef<((data: CursorUpdate) => void) | null>(
    null
  );
  const contentUpdateCallbackRef = useRef<
    ((data: ContentUpdate) => void) | null
  >(null);

  // Get user info from store
  const user = useUserStore((state) => state.user);

  // Initialize socket connection
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on("connect", () => {
      console.log("WebSocket connected");
      setIsConnected(true);
    });

    socket.on("connected", (data: { session_id: string }) => {
      setSessionId(data.session_id);
    });

    socket.on("disconnect", () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
      setSessionId(null);
      setDocumentUsers([]);
    });

    socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
    });

    // Document events
    socket.on(
      "document_joined",
      (data: { document_id: string; users: DocumentUser[] }) => {
        setDocumentUsers(data.users);
      }
    );

    socket.on("document_left", () => {
      setDocumentUsers([]);
      currentDocumentRef.current = null;
    });

    socket.on("user_joined", (data) => {
      setDocumentUsers((prev) => {
        // Avoid duplicates
        if (prev.some((u) => u.session_id === data.session_id)) {
          return prev;
        }
        return [
          ...prev,
          {
            user_id: data.user_id,
            session_id: data.session_id,
            user_name: data.user_name,
            user_email: data.user_email,
          },
        ];
      });
      userJoinedCallbackRef.current?.(data);
    });

    socket.on("user_left", (data) => {
      setDocumentUsers((prev) =>
        prev.filter((u) => u.session_id !== data.session_id)
      );
      userLeftCallbackRef.current?.(data);
    });

    socket.on("cursor_update", (data: CursorUpdate) => {
      cursorUpdateCallbackRef.current?.(data);
    });

    socket.on("content_update", (data: ContentUpdate) => {
      contentUpdateCallbackRef.current?.(data);
    });

    socket.on(
      "document_users",
      (data: { document_id: string; users: DocumentUser[] }) => {
        if (data.document_id === currentDocumentRef.current) {
          setDocumentUsers(data.users);
        }
      }
    );

    socket.on("error", (data: { message: string }) => {
      console.error("WebSocket error:", data.message);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Join a document room
  const joinDocument = useCallback(
    (documentId: string) => {
      if (!socketRef.current || !isConnected) {
        console.warn("Cannot join document: socket not connected");
        return;
      }

      // Leave current document if any
      if (
        currentDocumentRef.current &&
        currentDocumentRef.current !== documentId
      ) {
        socketRef.current.emit("leave_document", {
          document_id: currentDocumentRef.current,
        });
      }

      currentDocumentRef.current = documentId;
      socketRef.current.emit("join_document", {
        document_id: documentId,
        user_id: user?.id || "anonymous",
        user_name: user?.name,
        user_email: user?.email,
      });
    },
    [isConnected, user]
  );

  // Leave a document room
  const leaveDocument = useCallback(
    (documentId: string) => {
      if (!socketRef.current || !isConnected) {
        return;
      }

      socketRef.current.emit("leave_document", { document_id: documentId });
      currentDocumentRef.current = null;
      setDocumentUsers([]);
    },
    [isConnected]
  );

  // Send cursor position update
  const sendCursorMove = useCallback(
    (
      documentId: string,
      position: CursorPosition,
      selection?: CursorUpdate["selection"]
    ) => {
      if (!socketRef.current || !isConnected) {
        return;
      }

      socketRef.current.emit("cursor_move", {
        document_id: documentId,
        position,
        selection,
      });
    },
    [isConnected]
  );

  // Send content edit operation
  const sendContentEdit = useCallback(
    (
      documentId: string,
      operation: ContentUpdate["operation"],
      version: number
    ) => {
      if (!socketRef.current || !isConnected) {
        return;
      }

      socketRef.current.emit("edit_content", {
        document_id: documentId,
        operation,
        version,
      });
    },
    [isConnected]
  );

  // Register event callbacks
  const onUserJoined = useCallback((callback: (data: any) => void) => {
    userJoinedCallbackRef.current = callback;
  }, []);

  const onUserLeft = useCallback((callback: (data: any) => void) => {
    userLeftCallbackRef.current = callback;
  }, []);

  const onCursorUpdate = useCallback(
    (callback: (data: CursorUpdate) => void) => {
      cursorUpdateCallbackRef.current = callback;
    },
    []
  );

  const onContentUpdate = useCallback(
    (callback: (data: ContentUpdate) => void) => {
      contentUpdateCallbackRef.current = callback;
    },
    []
  );

  return {
    socket: socketRef.current,
    isConnected,
    sessionId,
    documentUsers,
    joinDocument,
    leaveDocument,
    sendCursorMove,
    sendContentEdit,
    onUserJoined,
    onUserLeft,
    onCursorUpdate,
    onContentUpdate,
  };
}

export default useWebSocket;
