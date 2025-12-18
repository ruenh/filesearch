/**
 * FileUploader component
 * Drag & drop zone with progress indicator and multiple file support
 * Requirements: 3.1, 3.2, 32.1, 32.2, 32.3
 */
import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { uploadDocument } from "@/api/documents";
import { CloudImportModal } from "@/components/cloud";
import { Tooltip, HelpIcon } from "@/components/help";

interface FileUploaderProps {
  storageId: string;
  folderId?: string;
  onUploadComplete?: () => void;
  onClose?: () => void;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

const ALLOWED_EXTENSIONS = [
  "txt",
  "pdf",
  "docx",
  "md",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function FileUploader({
  storageId,
  folderId,
  onUploadComplete,
  onClose,
}: FileUploaderProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [showCloudImport, setShowCloudImport] = useState(false);

  const isValidFile = (file: File): { valid: boolean; error?: string } => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return { valid: false, error: `Тип файла .${ext} не поддерживается` };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: "Файл слишком большой (макс. 100 МБ)" };
    }
    return { valid: true };
  };

  const uploadFile = async (uploadingFile: UploadingFile) => {
    const { id, file } = uploadingFile;

    // Update status to uploading
    setUploadingFiles((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, status: "uploading" as const } : f
      )
    );

    try {
      await uploadDocument(file, storageId, folderId, (progress) => {
        setUploadingFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, progress } : f))
        );
      });

      // Update status to success
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, status: "success" as const, progress: 100 } : f
        )
      );

      // Invalidate documents query
      queryClient.invalidateQueries({ queryKey: ["documents", storageId] });
    } catch (error) {
      // Update status to error
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: "error" as const,
                error:
                  error instanceof Error ? error.message : "Ошибка загрузки",
              }
            : f
        )
      );
    }
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const newUploadingFiles: UploadingFile[] = [];

      for (const file of fileArray) {
        const validation = isValidFile(file);
        const uploadingFile: UploadingFile = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          progress: 0,
          status: validation.valid ? "pending" : "error",
          error: validation.error,
        };
        newUploadingFiles.push(uploadingFile);
      }

      setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);

      // Start uploading valid files
      for (const uploadingFile of newUploadingFiles) {
        if (uploadingFile.status === "pending") {
          await uploadFile(uploadingFile);
        }
      }

      // Notify completion
      const allSuccess = newUploadingFiles.every(
        (f) => f.status === "success" || f.status === "error"
      );
      if (allSuccess) {
        onUploadComplete?.();
      }
    },
    [storageId, folderId, onUploadComplete]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      // Reset input
      e.target.value = "";
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (id: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearCompleted = () => {
    setUploadingFiles((prev) =>
      prev.filter((f) => f.status !== "success" && f.status !== "error")
    );
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Б";
    const k = 1024;
    const sizes = ["Б", "КБ", "МБ", "ГБ"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const hasActiveUploads = uploadingFiles.some(
    (f) => f.status === "pending" || f.status === "uploading"
  );
  const hasCompletedUploads = uploadingFiles.some(
    (f) => f.status === "success" || f.status === "error"
  );

  const handleCloudImportComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["documents", storageId] });
    onUploadComplete?.();
  };

  return (
    <div className="space-y-4">
      {/* Cloud Import Button - Requirements: 32.1 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Загрузка файлов
          </span>
          <HelpIcon topicId="document-upload" size="sm" />
        </div>
        <Tooltip
          content="Импортировать файлы из облачных сервисов"
          position="left"
        >
          <button
            onClick={() => setShowCloudImport(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
              />
            </svg>
            Import from Cloud
          </button>
        </Tooltip>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${
            isDragging
              ? "border-sky-500 bg-sky-50 dark:bg-sky-900/20"
              : "border-gray-300 dark:border-gray-600 hover:border-sky-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(",")}
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
          {isDragging ? "Отпустите файлы здесь" : "Перетащите файлы сюда"}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          или нажмите для выбора файлов
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Поддерживаемые форматы: {ALLOWED_EXTENSIONS.join(", ")} (макс. 100 МБ)
        </p>
      </div>

      {/* Upload progress list */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Загрузка файлов ({uploadingFiles.length})
            </h4>
            {hasCompletedUploads && !hasActiveUploads && (
              <button
                onClick={clearCompleted}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Очистить
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {uploadingFiles.map((uploadingFile) => (
              <div
                key={uploadingFile.id}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                {/* Status icon */}
                <div className="flex-shrink-0">
                  {uploadingFile.status === "uploading" && (
                    <svg
                      className="animate-spin h-5 w-5 text-sky-500"
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
                  )}
                  {uploadingFile.status === "success" && (
                    <svg
                      className="h-5 w-5 text-green-500"
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
                  )}
                  {uploadingFile.status === "error" && (
                    <svg
                      className="h-5 w-5 text-red-500"
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
                  )}
                  {uploadingFile.status === "pending" && (
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {uploadingFile.file.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatSize(uploadingFile.file.size)}
                    </span>
                    {uploadingFile.status === "uploading" && (
                      <span className="text-xs text-sky-600 dark:text-sky-400">
                        {uploadingFile.progress}%
                      </span>
                    )}
                    {uploadingFile.status === "error" && (
                      <span className="text-xs text-red-500">
                        {uploadingFile.error}
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  {uploadingFile.status === "uploading" && (
                    <div className="mt-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-500 transition-all duration-300"
                        style={{ width: `${uploadingFile.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Remove button */}
                {(uploadingFile.status === "success" ||
                  uploadingFile.status === "error") && (
                  <button
                    onClick={() => removeFile(uploadingFile.id)}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <svg
                      className="h-4 w-4"
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
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {onClose && (
        <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={hasActiveUploads}
            className="btn btn-secondary"
          >
            {hasActiveUploads ? "Загрузка..." : "Закрыть"}
          </button>
        </div>
      )}

      {/* Cloud Import Modal - Requirements: 32.1, 32.2, 32.3 */}
      <CloudImportModal
        isOpen={showCloudImport}
        onClose={() => setShowCloudImport(false)}
        storageId={storageId}
        folderId={folderId}
        onImportComplete={handleCloudImportComplete}
      />
    </div>
  );
}
