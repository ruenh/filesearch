/**
 * UserPresence component for displaying active users in a document.
 * Shows avatars/indicators for users currently viewing/editing the document.
 * Requirements: 54.3
 */
import React from "react";
import type { DocumentUser } from "../../hooks/useWebSocket";
import type { RemoteCursor } from "../../lib/collaborative";

interface UserPresenceProps {
  users: DocumentUser[];
  maxVisible?: number;
  showNames?: boolean;
  className?: string;
}

interface RemoteCursorOverlayProps {
  cursors: RemoteCursor[];
  containerRef: React.RefObject<HTMLElement>;
  lineHeight?: number;
  charWidth?: number;
}

// Generate a consistent color based on user ID
function getUserColor(userId: string): string {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-yellow-500",
    "bg-red-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

// Get initials from name or email
function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  if (email) {
    return email.substring(0, 2).toUpperCase();
  }

  return "??";
}

export const UserPresence: React.FC<UserPresenceProps> = ({
  users,
  maxVisible = 5,
  showNames = false,
  className = "",
}) => {
  if (users.length === 0) {
    return null;
  }

  const visibleUsers = users.slice(0, maxVisible);
  const remainingCount = users.length - maxVisible;

  return (
    <div className={`flex items-center ${className}`}>
      {/* User avatars */}
      <div className="flex -space-x-2">
        {visibleUsers.map((user) => (
          <div
            key={user.session_id}
            className={`relative inline-flex items-center justify-center w-8 h-8 rounded-full ${getUserColor(
              user.user_id
            )} text-white text-xs font-medium ring-2 ring-white dark:ring-gray-800`}
            title={user.user_name || user.user_email || user.user_id}
          >
            {getInitials(user.user_name, user.user_email)}

            {/* Online indicator */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white dark:border-gray-800 rounded-full"></span>
          </div>
        ))}

        {/* Overflow indicator */}
        {remainingCount > 0 && (
          <div className="relative inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-medium ring-2 ring-white dark:ring-gray-800">
            +{remainingCount}
          </div>
        )}
      </div>

      {/* User names (optional) */}
      {showNames && visibleUsers.length > 0 && (
        <div className="ml-3 text-sm text-gray-600 dark:text-gray-400">
          {visibleUsers.length === 1 ? (
            <span>{visibleUsers[0].user_name || "Anonymous"} is viewing</span>
          ) : (
            <span>
              {visibleUsers.length}{" "}
              {remainingCount > 0 ? `+ ${remainingCount} ` : ""}
              users viewing
            </span>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Compact version for tight spaces
 */
export const UserPresenceCompact: React.FC<{
  users: DocumentUser[];
  className?: string;
}> = ({ users, className = "" }) => {
  if (users.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {users.length} {users.length === 1 ? "user" : "users"} online
      </span>
    </div>
  );
};

/**
 * User list for sidebar or panel
 */
export const UserPresenceList: React.FC<{
  users: DocumentUser[];
  className?: string;
}> = ({ users, className = "" }) => {
  if (users.length === 0) {
    return (
      <div className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}>
        No other users viewing this document
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Active Users ({users.length})
      </h4>
      <ul className="space-y-1">
        {users.map((user) => (
          <li
            key={user.session_id}
            className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
          >
            <div
              className={`w-6 h-6 rounded-full ${getUserColor(
                user.user_id
              )} text-white text-xs font-medium flex items-center justify-center`}
            >
              {getInitials(user.user_name, user.user_email)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user.user_name || "Anonymous"}
              </p>
              {user.user_email && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.user_email}
                </p>
              )}
            </div>
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * Remote cursor overlay for collaborative editing.
 * Displays other users' cursor positions and selections.
 * Requirements: 54.3
 */
export const RemoteCursorOverlay: React.FC<RemoteCursorOverlayProps> = ({
  cursors,
  containerRef,
  lineHeight = 20,
  charWidth = 8,
}) => {
  if (cursors.length === 0 || !containerRef.current) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {cursors.map((cursor) => {
        const top = (cursor.position.line - 1) * lineHeight;
        const left = (cursor.position.column - 1) * charWidth;

        return (
          <div key={cursor.sessionId}>
            {/* Cursor line */}
            <div
              className="absolute w-0.5 animate-pulse"
              style={{
                top: `${top}px`,
                left: `${left}px`,
                height: `${lineHeight}px`,
                backgroundColor: cursor.userColor,
              }}
            />

            {/* User name label */}
            <div
              className="absolute text-xs px-1.5 py-0.5 rounded-t whitespace-nowrap"
              style={{
                top: `${top - 18}px`,
                left: `${left}px`,
                backgroundColor: cursor.userColor,
                color: "white",
              }}
            >
              {cursor.userName || "Anonymous"}
            </div>

            {/* Selection highlight */}
            {cursor.selection && (
              <SelectionHighlight
                selection={cursor.selection}
                color={cursor.userColor}
                lineHeight={lineHeight}
                charWidth={charWidth}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Selection highlight component for remote user selections
 */
const SelectionHighlight: React.FC<{
  selection: RemoteCursor["selection"];
  color: string;
  lineHeight: number;
  charWidth: number;
}> = ({ selection, color, lineHeight, charWidth }) => {
  if (!selection) return null;

  const { start, end } = selection;

  // Single line selection
  if (start.line === end.line) {
    const top = (start.line - 1) * lineHeight;
    const left = (start.column - 1) * charWidth;
    const width = (end.column - start.column) * charWidth;

    return (
      <div
        className="absolute opacity-30"
        style={{
          top: `${top}px`,
          left: `${left}px`,
          width: `${width}px`,
          height: `${lineHeight}px`,
          backgroundColor: color,
        }}
      />
    );
  }

  // Multi-line selection - simplified rendering
  const startTop = (start.line - 1) * lineHeight;
  const endTop = (end.line - 1) * lineHeight;
  const height = endTop - startTop + lineHeight;

  return (
    <div
      className="absolute opacity-20"
      style={{
        top: `${startTop}px`,
        left: 0,
        right: 0,
        height: `${height}px`,
        backgroundColor: color,
      }}
    />
  );
};

/**
 * Cursor indicator for showing where a remote user is typing
 */
export const CursorIndicator: React.FC<{
  cursor: RemoteCursor;
  className?: string;
}> = ({ cursor, className = "" }) => {
  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <span
        className="w-2 h-2 rounded-full animate-pulse"
        style={{ backgroundColor: cursor.userColor }}
      />
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {cursor.userName || "Anonymous"} is typing...
      </span>
    </div>
  );
};

/**
 * Typing indicators for multiple users
 */
export const TypingIndicators: React.FC<{
  cursors: RemoteCursor[];
  className?: string;
}> = ({ cursors, className = "" }) => {
  // Filter to cursors that were updated recently (within 3 seconds)
  const recentCursors = cursors.filter((cursor) => {
    const timeSinceUpdate = Date.now() - cursor.lastUpdate.getTime();
    return timeSinceUpdate < 3000;
  });

  if (recentCursors.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {recentCursors.map((cursor) => (
        <CursorIndicator key={cursor.sessionId} cursor={cursor} />
      ))}
    </div>
  );
};

export default UserPresence;
