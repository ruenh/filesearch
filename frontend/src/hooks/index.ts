/**
 * Custom hooks exports.
 */
export { useWebSocket } from "./useWebSocket";
export type {
  UseWebSocketReturn,
  DocumentUser,
  CursorPosition,
  CursorUpdate,
  ContentUpdate,
} from "./useWebSocket";
export { useNotifications } from "./useNotifications";
export { useVoiceSearch } from "./useVoiceSearch";
export type {
  UseVoiceSearchOptions,
  UseVoiceSearchReturn,
} from "./useVoiceSearch";
export { useCollaborativeEditing } from "./useCollaborativeEditing";
export { useTextSelection } from "./useTextSelection";
export { usePWA } from "./usePWA";
export { useKeyboardShortcuts } from "./useKeyboardShortcuts";
export type { ShortcutHandlers } from "./useKeyboardShortcuts";
