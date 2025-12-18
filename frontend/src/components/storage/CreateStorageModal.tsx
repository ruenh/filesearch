/**
 * CreateStorageModal component
 * Modal form for creating a new storage with validation
 * Requirements: 2.1
 */
import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createStorage } from "@/api/storage";

interface CreateStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateStorageModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateStorageModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setName("");
      setError(null);
      // Small delay to ensure modal is rendered
      setTimeout(() => inputRef.current?.focus(), 100);
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

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (storageName: string) => createStorage(storageName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storages"] });
      onClose();
      onSuccess?.();
    },
    onError: (err: Error) => {
      setError(err.message || "Не удалось создать хранилище");
    },
  });

  // Validate name
  const validateName = (value: string): string | null => {
    const trimmed = value.trim();

    if (!trimmed) {
      return "Название хранилища обязательно";
    }

    if (trimmed.length > 255) {
      return "Название не должно превышать 255 символов";
    }

    return null;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateName(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    createMutation.mutate(name.trim());
  };

  // Handle input change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (error) {
      setError(null);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Создать хранилище
          </h2>
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

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-4">
            <label
              htmlFor="storage-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Название хранилища
            </label>
            <input
              ref={inputRef}
              id="storage-name"
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="Введите название..."
              className={`
                input
                ${error ? "border-red-500 focus:ring-red-500" : ""}
              `}
              disabled={createMutation.isPending}
              maxLength={255}
            />

            {/* Character count */}
            <div className="flex justify-between mt-1">
              <div>
                {error && <p className="text-sm text-red-500">{error}</p>}
              </div>
              <span className="text-xs text-gray-400">{name.length}/255</span>
            </div>

            {/* Help text */}
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Хранилище позволяет группировать документы для удобного поиска и
              организации.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={createMutation.isPending}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn btn-primary flex items-center gap-2"
              disabled={createMutation.isPending || !name.trim()}
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Создать
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
