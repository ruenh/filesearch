/**
 * Comments component
 * Displays document comments with threaded replies
 * Requirements: 52.1, 52.2, 52.3
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createComment,
  getDocumentComments,
  updateComment,
  deleteComment,
  type Comment,
} from "@/api/comments";

interface CommentsProps {
  documentId: string;
  currentUserId: string;
  currentUserName?: string;
}

export function Comments({
  documentId,
  currentUserId,
  currentUserName = "User",
}: CommentsProps) {
  const [newComment, setNewComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch comments
  const {
    data: comments = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["comments", documentId],
    queryFn: () => getDocumentComments(documentId, true),
    enabled: !!documentId,
  });

  // Create comment mutation
  const createMutation = useMutation({
    mutationFn: (data: { content: string; parentId?: string }) =>
      createComment({
        document_id: documentId,
        user_id: currentUserId,
        content: data.content,
        parent_id: data.parentId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", documentId] });
      setNewComment("");
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message || "Не удалось добавить комментарий");
    },
  });

  // Handle new comment submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const content = newComment.trim();
    if (!content) {
      setError("Введите текст комментария");
      return;
    }
    createMutation.mutate({ content });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <svg
          className="animate-spin h-6 w-6 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8 text-red-500">
        Не удалось загрузить комментарии
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Комментарии ({comments.length})
        </h3>
      </div>

      {/* New comment form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Написать комментарий..."
          className="input w-full min-h-[80px] resize-none"
          rows={3}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={createMutation.isPending || !newComment.trim()}
          >
            {createMutation.isPending ? "Отправка..." : "Отправить"}
          </button>
        </div>
      </form>

      {/* Comments list */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-4">
            Пока нет комментариев. Будьте первым!
          </p>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              documentId={documentId}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              depth={0}
            />
          ))
        )}
      </div>
    </div>
  );
}

// CommentItem component for displaying individual comments with replies
interface CommentItemProps {
  comment: Comment;
  documentId: string;
  currentUserId: string;
  currentUserName: string;
  depth: number;
}

function CommentItem({
  comment,
  documentId,
  currentUserId,
  currentUserName,
  depth,
}: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [editContent, setEditContent] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(true);
  const queryClient = useQueryClient();

  const isOwner = comment.user_id === currentUserId;
  const hasReplies = comment.replies && comment.replies.length > 0;
  const maxDepth = 3; // Maximum nesting depth

  // Create reply mutation
  const replyMutation = useMutation({
    mutationFn: (content: string) =>
      createComment({
        document_id: documentId,
        user_id: currentUserId,
        content,
        parent_id: comment.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", documentId] });
      setReplyContent("");
      setIsReplying(false);
    },
  });

  // Update comment mutation
  const updateMutation = useMutation({
    mutationFn: (content: string) => updateComment(comment.id, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", documentId] });
      setIsEditing(false);
    },
  });

  // Delete comment mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteComment(comment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", documentId] });
    },
  });

  // Handle reply submission
  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    const content = replyContent.trim();
    if (content) {
      replyMutation.mutate(content);
    }
  };

  // Handle edit submission
  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const content = editContent.trim();
    if (content) {
      updateMutation.mutate(content);
    }
  };

  // Handle delete
  const handleDelete = () => {
    if (window.confirm("Удалить комментарий?")) {
      deleteMutation.mutate();
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "только что";
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays < 7) return `${diffDays} дн. назад`;

    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <div
      className={`${
        depth > 0
          ? "ml-6 pl-4 border-l-2 border-gray-200 dark:border-gray-700"
          : ""
      }`}
    >
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
        {/* Comment header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
              {(comment.user?.name || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="font-medium text-gray-900 dark:text-white text-sm">
                {comment.user?.name || "Пользователь"}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                {formatDate(comment.created_at)}
              </span>
              {comment.updated_at !== comment.created_at && (
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                  (изменено)
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          {isOwner && !isEditing && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                title="Редактировать"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
                title="Удалить"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Comment content */}
        {isEditing ? (
          <form onSubmit={handleEdit} className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="input w-full min-h-[60px] resize-none text-sm"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(comment.content);
                }}
                className="btn btn-secondary text-sm py-1 px-3"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="btn btn-primary text-sm py-1 px-3"
                disabled={updateMutation.isPending || !editContent.trim()}
              >
                {updateMutation.isPending ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
            {comment.content}
          </p>
        )}

        {/* Reply button */}
        {!isEditing && depth < maxDepth && (
          <div className="mt-2">
            <button
              onClick={() => setIsReplying(!isReplying)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {isReplying ? "Отмена" : "Ответить"}
            </button>
          </div>
        )}

        {/* Reply form */}
        {isReplying && (
          <form onSubmit={handleReply} className="mt-3 space-y-2">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Написать ответ..."
              className="input w-full min-h-[60px] resize-none text-sm"
              rows={2}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsReplying(false);
                  setReplyContent("");
                }}
                className="btn btn-secondary text-sm py-1 px-3"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="btn btn-primary text-sm py-1 px-3"
                disabled={replyMutation.isPending || !replyContent.trim()}
              >
                {replyMutation.isPending ? "Отправка..." : "Ответить"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Replies */}
      {hasReplies && (
        <div className="mt-2">
          {comment.replies!.length > 0 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-2 flex items-center gap-1"
            >
              <svg
                className={`w-4 h-4 transition-transform ${
                  showReplies ? "rotate-90" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              {showReplies ? "Скрыть" : "Показать"} ответы (
              {comment.replies!.length})
            </button>
          )}
          {showReplies && (
            <div className="space-y-2">
              {comment.replies!.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  documentId={documentId}
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
