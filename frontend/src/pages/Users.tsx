/**
 * Users page
 * Admin-only page for user management
 */

import { useUserStore } from "@/store/useUserStore";
import { UserList } from "@/components/users";

export function Users() {
  const { user } = useUserStore();

  // Check if user is admin
  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <svg
          className="w-16 h-16 text-gray-400"
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Доступ запрещен
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Эта страница доступна только администраторам
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Пользователи
        </h1>
      </div>
      <UserList />
    </div>
  );
}
