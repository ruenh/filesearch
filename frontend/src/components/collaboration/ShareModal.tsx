/**
 * ShareModal component
 * Modal for creating and managing document share links
 * Requirements: 51.1, 51.2, 65.1
 */
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createShareLink,
  listDocumentShareLinks,
  deleteShareLink,
  type ShareLink,
} from "@/api/share";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
}

export function ShareModal({
  isOpen,
  onClose,
  documentId,
  documentName,
}: ShareModalProps) {
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [useExpiration, setUseExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setUsePassword(false);
      setUseExpiration(false);
      setExpirationDate("");
      setError(null);
      setCopiedId(null);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Fetch existing share links
  const { data: shareLinks = [], isLoading: isLoadingLinks } = useQuery({
    queryKey: ["shareLinks", documentId],
    queryFn: () => listDocumentShareLinks(documentId),
    enabled: isOpen,
  });

  // Create share link mutation
  const createMutation = useMutation({
    mutationFn: () =>
      createShareLink({
        document_id: documentId,
        password: usePassword ? password : undefined,
        expires_at: useExpiration
          ? new Date(expirationDate).toISOString()
          : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shareLinks", documentId] });
      setPassword("");
      setUsePassword(false);
      setUseExpiration(false);
      setExpirationDate("");
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message || "Не удалось создать ссылку");
    },
  });

  // Delete share link mutation
  const deleteMutation = useMutation({
    mutationFn: (shareId: string) => deleteShareLink(shareId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shareLinks", documentId] });
    },
  });

  // Handle form submission
  const handleCreateLink = (e: React.FormEvent) => {
    e.preventDefault();

    if (usePassword && !password.trim()) {
      setError("Введите пароль или отключите защиту паролем");
      return;
    }

    if (useExpiration && !expirationDate) {
      setError("Выберите дату истечения или отключите ограничение по времени");
      return;
    }

    if (useExpiration && new Date(expirationDate) <= new Date()) {
      setError("Дата истечения должна быть в будущем");
      return;
    }

    setError(null);
    createMutation.mutate();
  };

  // Copy link to clipboard
  const copyToClipboard = async (link: ShareLink) => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError("Не удалось скопировать ссылку");
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Бессрочно";
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get minimum date for expiration (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Поделиться документом
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
              {documentName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Закрыть"
          >
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Create new link form */}
          <form onSubmit={handleCreateLink} className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Создать новую ссылку
            </h3>

            {/* Password protection */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={usePassword}
                  onChange={(e) => setUsePassword(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Защитить паролем
                </span>
              </label>
              {usePassword && (
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введите пароль..."
                  className="input w-full"
                />
              )}
            </div>

            {/* Expiration date */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useExpiration}
                  onChange={(e) => setUseExpiration(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Установить срок действия
                </span>
              </label>
              {useExpiration && (
                <input
                  type="datetime-local"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  min={getMinDate()}
                  className="input w-full"
                />
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              className="btn btn-primary w-full flex items-center justify-center gap-2"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
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
                  Создание...
                </>
              ) : (
                <>
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
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  Создать ссылку
                </>
              )}
            </button>
          </form>

          {/* Existing links */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Активные ссылки ({shareLinks.length})
            </h3>

            {isLoadingLinks ? (
              <div className="flex justify-center py-4">
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
            ) : shareLinks.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                Нет активных ссылок
              </p>
            ) : (
              <div className="space-y-2">
                {shareLinks.map((link) => (
                  <ShareLinkItem
                    key={link.id}
                    link={link}
                    onCopy={() => copyToClipboard(link)}
                    onDelete={() => deleteMutation.mutate(link.id)}
                    isCopied={copiedId === link.id}
                    isDeleting={deleteMutation.isPending}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ShareLinkItem component for displaying individual share links
interface ShareLinkItemProps {
  link: ShareLink;
  onCopy: () => void;
  onDelete: () => void;
  isCopied: boolean;
  isDeleting: boolean;
  formatDate: (date: string | null) => string;
}

function ShareLinkItem({
  link,
  onCopy,
  onDelete,
  isCopied,
  isDeleting,
  formatDate,
}: ShareLinkItemProps) {
  return (
    <div
      className={`p-3 rounded-lg border ${
        link.is_expired
          ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
          : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700/50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Link URL */}
          <div className="flex items-center gap-2">
            <code className="text-xs text-gray-600 dark:text-gray-400 truncate block max-w-[200px]">
              {link.url}
            </code>
            {link.has_password && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                <svg
                  className="w-3 h-3 mr-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                Пароль
              </span>
            )}
            {link.is_expired && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                Истекла
              </span>
            )}
          </div>

          {/* Link metadata */}
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span>Просмотров: {link.access_count}</span>
            <span>•</span>
            <span>Истекает: {formatDate(link.expires_at)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onCopy}
            className={`p-1.5 rounded-lg transition-colors ${
              isCopied
                ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                : "hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500"
            }`}
            title={isCopied ? "Скопировано!" : "Копировать ссылку"}
          >
            {isCopied ? (
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
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
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            )}
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
            title="Удалить ссылку"
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
      </div>
    </div>
  );
}
