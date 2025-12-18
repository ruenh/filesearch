/**
 * Notifications hook for managing notifications with API and WebSocket.
 * Requirements: 55.1, 55.2, 55.3
 */
import { useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useWebSocket } from "./useWebSocket";
import { useUserStore } from "@/store/useUserStore";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
} from "@/api/notifications";
import type { Notification } from "@/types";

export function useNotifications() {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useWebSocket();
  const user = useUserStore((state) => state.user);

  const {
    notifications,
    unreadCount,
    isOpen,
    setNotifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    setUnreadCount,
    setIsOpen,
    toggleOpen,
  } = useNotificationStore();

  // Fetch notifications
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications({ limit: 50 }),
    enabled: !!user,
    staleTime: 30000, // 30 seconds
  });

  // Update store when data changes
  useEffect(() => {
    if (data) {
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    }
  }, [data, setNotifications, setUnreadCount]);

  // Register for WebSocket notifications
  useEffect(() => {
    if (socket && isConnected && user) {
      // Register user for notifications
      socket.emit("register_user", { user_id: user.id });

      // Listen for new notifications
      const handleNewNotification = (data: {
        type: string;
        notification: Notification;
      }) => {
        if (data.type === "new_notification" && data.notification) {
          addNotification(data.notification);
          // Invalidate query to keep in sync
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      };

      socket.on("notification", handleNewNotification);

      return () => {
        socket.off("notification", handleNewNotification);
        socket.emit("unregister_user", { user_id: user.id });
      };
    }
  }, [socket, isConnected, user, addNotification, queryClient]);

  // Mark notification as read mutation
  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: (data, notificationId) => {
      markAsRead(notificationId);
      setUnreadCount(data.unread_count);
    },
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      markAllAsRead();
    },
  });

  // Delete notification mutation
  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: (data, notificationId) => {
      removeNotification(notificationId);
      setUnreadCount(data.unread_count);
    },
  });

  // Clear all notifications mutation
  const clearAllMutation = useMutation({
    mutationFn: clearAllNotifications,
    onSuccess: () => {
      clearAll();
    },
  });

  // Action handlers
  const handleMarkAsRead = useCallback(
    (notificationId: string) => {
      markReadMutation.mutate(notificationId);
    },
    [markReadMutation]
  );

  const handleMarkAllAsRead = useCallback(() => {
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  const handleDelete = useCallback(
    (notificationId: string) => {
      deleteMutation.mutate(notificationId);
    },
    [deleteMutation]
  );

  const handleClearAll = useCallback(() => {
    clearAllMutation.mutate();
  }, [clearAllMutation]);

  return {
    notifications,
    unreadCount,
    isLoading,
    isOpen,
    setIsOpen,
    toggleOpen,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    deleteNotification: handleDelete,
    clearAll: handleClearAll,
    refetch,
  };
}

export default useNotifications;
