import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store";
import { ChatInterface } from "@/components/ai";

export function Chat() {
  const navigate = useNavigate();
  const { currentStorageId, storages } = useAppStore();

  const handleSourceClick = (documentId: string) => {
    navigate(`/documents/${documentId}`);
  };

  if (!currentStorageId) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <svg
          className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
          />
        </svg>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Выберите хранилище
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
          Для начала работы с AI-чатом выберите хранилище документов в боковой
          панели
        </p>
      </div>
    );
  }

  const currentStorage = storages.find((s) => s.id === currentStorageId);

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {currentStorage && (
        <div className="mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Хранилище:{" "}
            <span className="font-medium text-gray-900 dark:text-white">
              {currentStorage.name}
            </span>
          </p>
        </div>
      )}
      <div className="flex-1 min-h-0">
        <ChatInterface
          storageId={currentStorageId}
          onSourceClick={handleSourceClick}
        />
      </div>
    </div>
  );
}
