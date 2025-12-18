import { useState } from "react";
import { useAppStore } from "@/store";
import { useUserStore } from "@/store/useUserStore";
import { useLayoutStore } from "@/store/useLayoutStore";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CreateStorageModal } from "@/components/storage";
import { Tooltip, HelpIcon } from "@/components/help";
import { LogOut } from "lucide-react";
import { logout } from "@/api/auth";

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    path: "/",
    label: "Главная",
    icon: (
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
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    path: "/documents",
    label: "Документы",
    icon: (
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
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    path: "/favorites",
    label: "Избранное",
    icon: (
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
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
        />
      </svg>
    ),
  },
  {
    path: "/archive",
    label: "Архив",
    icon: (
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
          d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
        />
      </svg>
    ),
  },
  {
    path: "/search",
    label: "Поиск",
    icon: (
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
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    ),
  },
  {
    path: "/chat",
    label: "AI Чат",
    icon: (
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
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
  },
  {
    path: "/settings",
    label: "Настройки",
    icon: (
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
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
];

// Admin-only nav item
const adminNavItem: NavItem = {
  path: "/users",
  label: "Пользователи",
  icon: (
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
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  ),
};

export function Sidebar() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const {
    sidebarOpen,
    storages,
    currentStorageId,
    setCurrentStorageId,
    setSidebarOpen,
  } = useAppStore();
  const { user, logout: logoutStore } = useUserStore();
  const { panels, compactMode } = useLayoutStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    logoutStore();
    navigate("/login");
  };

  // Check if sidebar should be visible based on layout preferences
  const sidebarVisible = panels.sidebar?.visible ?? true;
  const sidebarWidth = panels.sidebar?.width ?? 256;

  // If sidebar is hidden in layout preferences, don't render
  if (!sidebarVisible) {
    return null;
  }

  // Build nav items based on user role
  const allNavItems =
    user?.role === "admin" ? [...navItems, adminNavItem] : navItems;

  // Close sidebar on mobile when clicking outside
  const handleOverlayClick = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={handleOverlayClick}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        data-onboarding="sidebar"
        style={{ width: sidebarOpen ? sidebarWidth : undefined }}
        className={`
          fixed md:relative z-30 h-full
          bg-white dark:bg-gray-800 border-r
          flex flex-col
          transform transition-all duration-300 ease-in-out
          ${compactMode ? "text-sm" : ""}
          ${
            sidebarOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden"
          }
        `}
      >
        {/* Logo/Brand */}
        <div className="p-4 border-b flex items-center gap-3">
          <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
              />
            </svg>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">
            File Search
          </span>
        </div>

        {/* Navigation Menu */}
        <nav className="p-2">
          <ul className="space-y-1">
            {allNavItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={() =>
                    window.innerWidth < 768 && setSidebarOpen(false)
                  }
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                    ${
                      location.pathname === item.path
                        ? "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }
                  `}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Divider */}
        <div className="px-4 py-2">
          <div className="border-t" />
        </div>

        {/* Storage List */}
        <div className="flex-1 overflow-y-auto" data-onboarding="storage">
          <div className="px-4 py-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Хранилища
            </h3>
            <HelpIcon topicId="storage-create" size="sm" />
          </div>
          <ul className="px-2 space-y-1">
            {storages.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                Нет хранилищ
              </li>
            ) : (
              storages.map((storage) => (
                <li key={storage.id}>
                  <button
                    onClick={() => {
                      setCurrentStorageId(storage.id);
                      if (window.innerWidth < 768) setSidebarOpen(false);
                    }}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg transition-colors
                      ${
                        currentStorageId === storage.id
                          ? "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                        />
                      </svg>
                      <span className="font-medium truncate">
                        {storage.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                      {storage.documentCount} документов
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Create Storage Button */}
        <div className="p-4 border-t" data-onboarding="create-storage">
          <Tooltip
            content="Создайте новое хранилище для документов"
            position="right"
          >
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Создать хранилище
            </button>
          </Tooltip>
        </div>

        {/* User info and logout */}
        {user && (
          <div className="p-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                title="Выйти"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Create Storage Modal */}
      <CreateStorageModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  );
}
