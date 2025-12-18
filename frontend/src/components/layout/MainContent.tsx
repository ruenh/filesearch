import type { ReactNode } from "react";
import { useAppStore } from "@/store";
import {
  useLayoutStore,
  getContentMaxWidthClass,
} from "@/store/useLayoutStore";

interface MainContentProps {
  children: ReactNode;
  /** Use full width without padding */
  fullWidth?: boolean;
  /** Show loading spinner */
  loading?: boolean;
  /** Custom loading message */
  loadingMessage?: string;
}

export function MainContent({
  children,
  fullWidth = false,
  loading,
  loadingMessage = "Загрузка...",
}: MainContentProps) {
  const { isLoading: globalLoading } = useAppStore();
  const { compactMode, contentMaxWidth, panels } = useLayoutStore();
  const showLoading = loading ?? globalLoading;

  // Check if header is visible for layout adjustments
  const headerVisible = panels.header?.visible ?? true;

  // Get padding classes based on compact mode
  const paddingClass = compactMode ? "p-2 md:p-3 lg:p-4" : "p-4 md:p-6 lg:p-8";

  // Get max width class from layout preferences
  const maxWidthClass = fullWidth
    ? "w-full"
    : getContentMaxWidthClass(contentMaxWidth);

  return (
    <main
      className={`flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 ${
        !headerVisible ? "pt-0" : ""
      }`}
    >
      {showLoading ? (
        <LoadingState message={loadingMessage} />
      ) : (
        <div
          className={`
            min-h-full
            ${fullWidth ? "" : paddingClass}
          `}
        >
          {/* Responsive container with configurable max width */}
          <div
            className={`
              mx-auto
              ${maxWidthClass}
            `}
          >
            {children}
          </div>
        </div>
      )}
    </main>
  );
}

/** Loading state component */
function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="relative">
        {/* Outer ring */}
        <div className="w-16 h-16 rounded-full border-4 border-gray-200 dark:border-gray-700" />
        {/* Spinning ring */}
        <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-transparent border-t-sky-500 animate-spin" />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
        {message}
      </p>
    </div>
  );
}

/** Grid layout helper for document/card lists */
export function ContentGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {children}
    </div>
  );
}

/** List layout helper for document/card lists */
export function ContentList({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>;
}

/** Page header with title and actions */
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Empty state component */
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
