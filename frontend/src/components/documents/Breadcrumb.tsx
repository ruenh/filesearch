/**
 * Breadcrumb component
 * Shows navigation path for folder hierarchy
 * Requirements: 22.3
 */
import { useQuery } from "@tanstack/react-query";
import { getFolderBreadcrumb } from "@/api/folders";

interface BreadcrumbProps {
  folderId: string;
  onNavigate: (folderId: string | null) => void;
}

export function Breadcrumb({ folderId, onNavigate }: BreadcrumbProps) {
  const { data: breadcrumb = [], isLoading } = useQuery({
    queryKey: ["folder-breadcrumb", folderId],
    queryFn: () => getFolderBreadcrumb(folderId),
    enabled: !!folderId,
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2">
      <nav className="flex items-center gap-1 text-sm overflow-x-auto">
        <button
          onClick={() => onNavigate(null)}
          className="text-gray-500 hover:text-sky-600 dark:text-gray-400 dark:hover:text-sky-400 whitespace-nowrap"
        >
          Все документы
        </button>
        {breadcrumb.map((item, index) => (
          <span key={item.id} className="flex items-center gap-1">
            <svg
              className="w-4 h-4 text-gray-400"
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
            <button
              onClick={() => onNavigate(item.id)}
              className={`whitespace-nowrap ${
                index === breadcrumb.length - 1
                  ? "font-medium text-gray-900 dark:text-white"
                  : "text-gray-500 hover:text-sky-600 dark:text-gray-400 dark:hover:text-sky-400"
              }`}
            >
              {item.name}
            </button>
          </span>
        ))}
      </nav>
    </div>
  );
}
