import { useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  useShortcutsStore,
  defaultShortcuts,
  getShortcutKey,
} from "../store/useShortcutsStore";
import { useThemeStore } from "../store/useThemeStore";
import { useHelpStore } from "../store/useHelpStore";

interface ShortcutHandlers {
  onNewDocument?: () => void;
  onDeleteDocument?: () => void;
  onFavoriteDocument?: () => void;
  onFocusSearch?: () => void;
}

/**
 * Hook for handling keyboard shortcuts
 * Requirements: 79.1 - Execute corresponding action when shortcut key is pressed
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers = {}) {
  const navigate = useNavigate();
  const { customShortcuts, toggleHelpModal } = useShortcutsStore();
  const { toggleTheme } = useThemeStore();
  const { openHelpModal: openContextualHelp } = useHelpStore();

  // Track key sequence for multi-key shortcuts (e.g., "g h")
  const keySequence = useRef<string[]>([]);
  const sequenceTimeout = useRef<NodeJS.Timeout | null>(null);

  const getEffectiveKey = useCallback(
    (actionId: string) => getShortcutKey(actionId, customShortcuts),
    [customShortcuts]
  );

  const clearSequence = useCallback(() => {
    keySequence.current = [];
    if (sequenceTimeout.current) {
      clearTimeout(sequenceTimeout.current);
      sequenceTimeout.current = null;
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      const isInputField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Allow Escape to work even in input fields
      if (event.key === "Escape") {
        const escapeKey = getEffectiveKey("escape");
        if (escapeKey === "Escape") {
          toggleHelpModal();
          clearSequence();
          return;
        }
      }

      // Don't process other shortcuts in input fields
      if (isInputField && event.key !== "Escape") {
        clearSequence();
        return;
      }

      // Build the current key representation
      let currentKey = event.key;
      if (event.key === " ") currentKey = "Space";

      // Add to sequence
      keySequence.current.push(currentKey);

      // Clear sequence after 1 second of inactivity
      if (sequenceTimeout.current) {
        clearTimeout(sequenceTimeout.current);
      }
      sequenceTimeout.current = setTimeout(clearSequence, 1000);

      // Check current sequence against all shortcuts
      const currentSequence = keySequence.current.join(" ");

      // Find matching shortcut
      for (const shortcut of defaultShortcuts) {
        const effectiveKey = getEffectiveKey(shortcut.id);

        if (effectiveKey === currentSequence) {
          event.preventDefault();
          clearSequence();

          // Execute the action - Requirements 79.1
          switch (shortcut.id) {
            case "go-home":
              navigate("/");
              break;
            case "go-documents":
              navigate("/documents");
              break;
            case "go-favorites":
              navigate("/favorites");
              break;
            case "go-archive":
              navigate("/archive");
              break;
            case "go-settings":
              navigate("/settings");
              break;
            case "go-search":
              navigate("/search");
              break;
            case "focus-search":
              handlers.onFocusSearch?.();
              // Fallback: try to focus search input
              const searchInput = document.querySelector<HTMLInputElement>(
                'input[type="search"], input[placeholder*="Поиск"], input[placeholder*="поиск"]'
              );
              searchInput?.focus();
              break;
            case "new-document":
              handlers.onNewDocument?.();
              break;
            case "delete-document":
              handlers.onDeleteDocument?.();
              break;
            case "favorite-document":
              handlers.onFavoriteDocument?.();
              break;
            case "show-shortcuts":
              toggleHelpModal();
              break;
            case "toggle-theme":
              toggleTheme();
              break;
            case "show-help":
              openContextualHelp();
              break;
          }
          return;
        }

        // Check if current sequence is a prefix of any shortcut
        if (effectiveKey.startsWith(currentSequence + " ")) {
          // Waiting for more keys
          return;
        }
      }

      // If no match and not a prefix, clear sequence (unless it's a single key that might start a sequence)
      if (keySequence.current.length > 1) {
        clearSequence();
      }
    },
    [
      navigate,
      toggleHelpModal,
      toggleTheme,
      handlers,
      getEffectiveKey,
      clearSequence,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (sequenceTimeout.current) {
        clearTimeout(sequenceTimeout.current);
      }
    };
  }, [handleKeyDown]);

  return {
    toggleHelpModal,
  };
}

export type { ShortcutHandlers };
