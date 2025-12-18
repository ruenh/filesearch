/**
 * Cloud Import Modal Component
 * Requirements: 32.1, 32.2, 32.3
 */
import { useState, useEffect } from "react";
import {
  listCloudProviders,
  getGoogleAuthUrl,
  listGoogleDriveFiles,
  importFromGoogleDrive,
  formatFileSize,
  type CloudProvider,
  type CloudFile,
  type ImportResult,
} from "@/api/cloudImport";

interface CloudImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  storageId: string;
  folderId?: string;
  onImportComplete?: (results: ImportResult[]) => void;
}

type ImportStep = "providers" | "auth" | "browse" | "importing" | "complete";

interface BreadcrumbItem {
  id: string;
  name: string;
}

export function CloudImportModal({
  isOpen,
  onClose,
  storageId,
  folderId,
  onImportComplete,
}: CloudImportModalProps) {
  const [step, setStep] = useState<ImportStep>("providers");
  const [providers, setProviders] = useState<CloudProvider[]>([]);
  const [, setSelectedProvider] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [currentFolderId, setCurrentFolderId] = useState("root");
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: "root", name: "My Drive" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  // Load providers on mount
  useEffect(() => {
    if (isOpen) {
      loadProviders();
    }
  }, [isOpen]);

  // Check for OAuth callback token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const provider = params.get("provider");
    const authError = params.get("error");

    if (authError) {
      setError(`Authentication failed: ${authError}`);
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    } else if (token && provider === "google_drive") {
      setAccessToken(token);
      setSelectedProvider("google_drive");
      setStep("browse");
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Load files when folder changes
  useEffect(() => {
    if (accessToken && step === "browse") {
      loadFiles();
    }
  }, [accessToken, currentFolderId, step]);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const providerList = await listCloudProviders();
      setProviders(providerList);
    } catch (err) {
      setError("Failed to load cloud providers");
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async (pageToken?: string) => {
    if (!accessToken) return;

    try {
      setLoading(true);
      setError(null);
      const response = await listGoogleDriveFiles(
        accessToken,
        currentFolderId,
        pageToken
      );

      if (pageToken) {
        setFiles((prev) => [...prev, ...response.files]);
      } else {
        setFiles(response.files);
      }
      setNextPageToken(response.next_page_token);
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "status" in err &&
        err.status === 401
      ) {
        setError("Session expired. Please reconnect.");
        setStep("auth");
      } else {
        setError("Failed to load files");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSelect = async (providerId: string) => {
    setSelectedProvider(providerId);
    setError(null);

    if (providerId === "google_drive") {
      try {
        setLoading(true);
        const authUrl = await getGoogleAuthUrl();
        // Open OAuth in new window or redirect
        window.location.href = authUrl;
      } catch (err) {
        setError("Failed to start authentication");
        setLoading(false);
      }
    } else {
      setError("This provider is not yet supported");
    }
  };

  const handleFolderClick = (folder: CloudFile) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSelectedFiles(new Set());
  };

  const handleBreadcrumbClick = (index: number) => {
    const item = breadcrumbs[index];
    setCurrentFolderId(item.id);
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    setSelectedFiles(new Set());
  };

  const handleFileSelect = (file: CloudFile) => {
    if (file.is_folder) {
      handleFolderClick(file);
      return;
    }

    if (!file.is_supported) return;

    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(file.id)) {
        newSet.delete(file.id);
      } else {
        newSet.add(file.id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const supportedFiles = files.filter((f) => !f.is_folder && f.is_supported);
    if (selectedFiles.size === supportedFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(supportedFiles.map((f) => f.id)));
    }
  };

  const handleImport = async () => {
    if (!accessToken || selectedFiles.size === 0) return;

    try {
      setStep("importing");
      setError(null);

      const result = await importFromGoogleDrive(
        accessToken,
        Array.from(selectedFiles),
        storageId,
        folderId
      );

      setImportResults(result.results);
      setStep("complete");

      if (onImportComplete) {
        onImportComplete(result.results);
      }
    } catch (err) {
      setError("Import failed. Please try again.");
      setStep("browse");
    }
  };

  const handleClose = () => {
    setStep("providers");
    setSelectedProvider(null);
    setAccessToken(null);
    setFiles([]);
    setSelectedFiles(new Set());
    setCurrentFolderId("root");
    setBreadcrumbs([{ id: "root", name: "My Drive" }]);
    setError(null);
    setImportResults([]);
    onClose();
  };

  const loadMoreFiles = () => {
    if (nextPageToken) {
      loadFiles(nextPageToken);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Import from Cloud
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
              {error}
            </div>
          )}

          {step === "providers" && (
            <ProviderSelection
              providers={providers}
              loading={loading}
              onSelect={handleProviderSelect}
            />
          )}

          {step === "browse" && (
            <FileBrowser
              files={files}
              selectedFiles={selectedFiles}
              breadcrumbs={breadcrumbs}
              loading={loading}
              hasMore={!!nextPageToken}
              onFileSelect={handleFileSelect}
              onBreadcrumbClick={handleBreadcrumbClick}
              onSelectAll={handleSelectAll}
              onLoadMore={loadMoreFiles}
            />
          )}

          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">
                Importing {selectedFiles.size} file(s)...
              </p>
            </div>
          )}

          {step === "complete" && (
            <ImportComplete results={importResults} onClose={handleClose} />
          )}
        </div>

        {/* Footer */}
        {step === "browse" && (
          <div className="flex items-center justify-between p-4 border-t dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedFiles.size} file(s) selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={selectedFiles.size === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import Selected
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface ProviderSelectionProps {
  providers: CloudProvider[];
  loading: boolean;
  onSelect: (providerId: string) => void;
}

function ProviderSelection({
  providers,
  loading,
  onSelect,
}: ProviderSelectionProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-600 dark:text-gray-300 mb-4">
        Select a cloud service to import files from:
      </p>
      <div className="grid gap-3">
        {providers.map((provider) => (
          <button
            key={provider.id}
            onClick={() => onSelect(provider.id)}
            disabled={!provider.configured}
            className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
              provider.configured
                ? "border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                : "border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed"
            }`}
          >
            <ProviderIcon provider={provider.id} />
            <div className="flex-1 text-left">
              <div className="font-medium text-gray-900 dark:text-white">
                {provider.name}
              </div>
              {!provider.configured && (
                <div className="text-sm text-gray-500">Not configured</div>
              )}
            </div>
            {provider.configured && (
              <svg
                className="w-5 h-5 text-gray-400"
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
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

interface FileBrowserProps {
  files: CloudFile[];
  selectedFiles: Set<string>;
  breadcrumbs: BreadcrumbItem[];
  loading: boolean;
  hasMore: boolean;
  onFileSelect: (file: CloudFile) => void;
  onBreadcrumbClick: (index: number) => void;
  onSelectAll: () => void;
  onLoadMore: () => void;
}

function FileBrowser({
  files,
  selectedFiles,
  breadcrumbs,
  loading,
  hasMore,
  onFileSelect,
  onBreadcrumbClick,
  onSelectAll,
  onLoadMore,
}: FileBrowserProps) {
  const supportedFiles = files.filter((f) => !f.is_folder && f.is_supported);
  const allSelected =
    supportedFiles.length > 0 && selectedFiles.size === supportedFiles.length;

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm overflow-x-auto">
        {breadcrumbs.map((item, index) => (
          <div key={item.id} className="flex items-center">
            {index > 0 && <span className="mx-1 text-gray-400">/</span>}
            <button
              onClick={() => onBreadcrumbClick(index)}
              className={`hover:text-blue-600 ${
                index === breadcrumbs.length - 1
                  ? "text-gray-900 dark:text-white font-medium"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {item.name}
            </button>
          </div>
        ))}
      </div>

      {/* Select All */}
      {supportedFiles.length > 0 && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onSelectAll}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Select all supported files
          </span>
        </div>
      )}

      {/* File List */}
      <div className="border dark:border-gray-700 rounded-lg divide-y dark:divide-gray-700 max-h-80 overflow-y-auto">
        {loading && files.length === 0 ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : files.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No files in this folder
          </div>
        ) : (
          <>
            {files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                selected={selectedFiles.has(file.id)}
                onSelect={() => onFileSelect(file)}
              />
            ))}
            {hasMore && (
              <button
                onClick={onLoadMore}
                disabled={loading}
                className="w-full py-3 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50"
              >
                {loading ? "Loading..." : "Load more"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface FileRowProps {
  file: CloudFile;
  selected: boolean;
  onSelect: () => void;
}

function FileRow({ file, selected, onSelect }: FileRowProps) {
  const isSelectable = !file.is_folder && file.is_supported;

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
        file.is_folder
          ? "hover:bg-gray-50 dark:hover:bg-gray-700"
          : isSelectable
          ? selected
            ? "bg-blue-50 dark:bg-blue-900/30"
            : "hover:bg-gray-50 dark:hover:bg-gray-700"
          : "opacity-50 cursor-not-allowed"
      }`}
    >
      {isSelectable && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => {}}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      )}
      {file.is_folder && <div className="w-5" />}

      {file.thumbnail_url ? (
        <img
          src={file.thumbnail_url}
          alt=""
          className="w-8 h-8 rounded object-cover"
        />
      ) : (
        <FileIcon mimeType={file.mime_type} />
      )}

      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 dark:text-white truncate">
          {file.name}
        </div>
        {!file.is_folder && (
          <div className="text-sm text-gray-500">
            {formatFileSize(file.size)}
            {!file.is_supported && " • Not supported"}
          </div>
        )}
      </div>

      {file.is_folder && (
        <svg
          className="w-5 h-5 text-gray-400"
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
      )}
    </div>
  );
}

interface ImportCompleteProps {
  results: ImportResult[];
  onClose: () => void;
}

function ImportComplete({ results, onClose }: ImportCompleteProps) {
  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.filter((r) => !r.success).length;

  return (
    <div className="space-y-4">
      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
          <svg
            className="w-8 h-8 text-green-600"
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
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Import Complete
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          {successCount} file(s) imported successfully
          {failedCount > 0 && `, ${failedCount} failed`}
        </p>
      </div>

      {failedCount > 0 && (
        <div className="border dark:border-gray-700 rounded-lg divide-y dark:divide-gray-700 max-h-40 overflow-y-auto">
          {results
            .filter((r) => !r.success)
            .map((result) => (
              <div key={result.file_id} className="p-3 text-sm">
                <div className="font-medium text-red-600">
                  {result.file_name || result.file_id}
                </div>
                <div className="text-gray-500">{result.error}</div>
              </div>
            ))}
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={onClose}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Icon Components
// ============================================================================

function ProviderIcon({ provider }: { provider: string }) {
  if (provider === "google_drive") {
    return (
      <svg
        className="w-8 h-8"
        viewBox="0 0 87.3 78"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"
          fill="#0066da"
        />
        <path
          d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z"
          fill="#00ac47"
        />
        <path
          d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"
          fill="#ea4335"
        />
        <path
          d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"
          fill="#00832d"
        />
        <path
          d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
          fill="#2684fc"
        />
        <path
          d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"
          fill="#ffba00"
        />
      </svg>
    );
  }

  if (provider === "dropbox") {
    return (
      <svg
        className="w-8 h-8"
        viewBox="0 0 43 40"
        fill="#0061FF"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12.5 0L0 8.1l8.6 6.9 12.5-7.8L12.5 0zM0 21.9l12.5 8.1 8.6-7.1-12.5-7.8L0 21.9zM21.1 22.9l8.6 7.1 12.5-8.1-8.6-6.8-12.5 7.8zM42.2 8.1L29.7 0l-8.6 7.2 12.5 7.8 8.6-6.9zM21.2 24.6l-8.6 7.1-3.9-2.5v2.8l12.5 7.5 12.5-7.5v-2.8l-3.9 2.5-8.6-7.1z" />
      </svg>
    );
  }

  if (provider === "onedrive") {
    return (
      <svg
        className="w-8 h-8"
        viewBox="0 0 24 24"
        fill="#0078D4"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M10.5 18.5h8.25a3.75 3.75 0 0 0 .75-7.43 5.25 5.25 0 0 0-9.75-2.32A4.5 4.5 0 0 0 4.5 13.5a4.5 4.5 0 0 0 4.5 4.5h1.5z" />
      </svg>
    );
  }

  return (
    <svg
      className="w-8 h-8 text-gray-400"
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
  );
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === "application/vnd.google-apps.folder") {
    return (
      <svg
        className="w-8 h-8 text-yellow-500"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
      </svg>
    );
  }

  if (mimeType.startsWith("image/")) {
    return (
      <svg
        className="w-8 h-8 text-green-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    );
  }

  if (mimeType === "application/pdf") {
    return (
      <svg
        className="w-8 h-8 text-red-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    );
  }

  return (
    <svg
      className="w-8 h-8 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

export default CloudImportModal;
