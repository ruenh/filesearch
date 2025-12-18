/**
 * Documents page
 * Displays documents for the selected storage with folder navigation, tags, and upload functionality
 * Requirements: 3.1, 3.2, 8.3, 22.2, 22.3, 23.1, 23.2, 23.3
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store";
import {
  DocumentList,
  FileUploader,
  FolderTree,
  Breadcrumb,
  TagManager,
} from "@/components/documents";
import type { Document } from "@/types";

export function Documents() {
  const navigate = useNavigate();
  const { currentStorageId, storages } = useAppStore();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isFolderPanelOpen, setIsFolderPanelOpen] = useState(true);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );

  const currentStorage = storages.find((s) => s.id === currentStorageId);

  if (!currentStorageId) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Хранилище не выбрано
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Выберите хранилище на панели слева для просмотра документов
        </p>
      </div>
    );
  }

  const handleDocumentSelect = (document: Document) => {
    navigate(`/documents/${document.id}`);
  };

  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolderId(folderId);
  };

  return (
    <div className="flex h-full gap-4">
      {/* Folder & Tags Panel */}
      <div
        className={`
          ${isFolderPanelOpen ? "w-64" : "w-0"} 
          flex-shrink-0 transition-all duration-300 overflow-hidden
        `}
      >
        <div className="w-64 h-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
          {/* Folders Section */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-white text-sm">
              Папки
            </h3>
          </div>
          <div className="p-2 overflow-y-auto flex-shrink-0 max-h-[40vh]">
            <FolderTree
              storageId={currentStorageId}
              selectedFolderId={selectedFolderId}
              onFolderSelect={handleFolderSelect}
              showBreadcrumb={false}
            />
          </div>

          {/* Tags Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 flex-1 overflow-y-auto">
            <TagManager
              storageId={currentStorageId}
              selectedDocument={selectedDocument}
              onTagFilter={setActiveTagFilter}
              activeTagFilter={activeTagFilter}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Toggle folder panel button */}
            <button
              onClick={() => setIsFolderPanelOpen(!isFolderPanelOpen)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={isFolderPanelOpen ? "Скрыть папки" : "Показать папки"}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isFolderPanelOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 5l7 7-7 7M5 5l7 7-7 7"
                  />
                )}
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentStorage?.name || "Документы"}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Управляйте документами в этом хранилище
              </p>
            </div>
          </div>
        </div>

        {/* Breadcrumb for selected folder */}
        {selectedFolderId && (
          <Breadcrumb
            folderId={selectedFolderId}
            onNavigate={handleFolderSelect}
          />
        )}

        {/* Document List */}
        <DocumentList
          storageId={currentStorageId}
          folderId={selectedFolderId || undefined}
          tagFilter={activeTagFilter}
          onDocumentSelect={handleDocumentSelect}
          onDocumentTagEdit={setSelectedDocument}
          onUploadClick={() => setIsUploadModalOpen(true)}
        />
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Загрузка файлов
                </h2>
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <svg
                    className="w-6 h-6"
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

              <FileUploader
                storageId={currentStorageId}
                folderId={selectedFolderId || undefined}
                onUploadComplete={() => {
                  // Keep modal open to show results
                }}
                onClose={() => setIsUploadModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
