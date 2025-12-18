/**
 * Hook for handling text selection in document viewer
 * Requirements: 38.1 - Show annotation option when text is selected
 */

import { useState, useEffect, useCallback, type RefObject } from "react";

interface TextSelection {
  text: string;
  startOffset: number;
  endOffset: number;
  rect: DOMRect | null;
}

interface UseTextSelectionOptions {
  containerRef: RefObject<HTMLElement>;
  enabled?: boolean;
}

export function useTextSelection({
  containerRef,
  enabled = true,
}: UseTextSelectionOptions) {
  const [selection, setSelection] = useState<TextSelection | null>(null);

  const handleSelectionChange = useCallback(() => {
    if (!enabled || !containerRef.current) {
      setSelection(null);
      return;
    }

    const windowSelection = window.getSelection();
    if (!windowSelection || windowSelection.isCollapsed) {
      setSelection(null);
      return;
    }

    const selectedText = windowSelection.toString().trim();
    if (!selectedText) {
      setSelection(null);
      return;
    }

    // Check if selection is within our container
    const range = windowSelection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      setSelection(null);
      return;
    }

    // Calculate offsets relative to container
    const preSelectionRange = document.createRange();
    preSelectionRange.selectNodeContents(containerRef.current);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preSelectionRange.toString().length;
    const endOffset = startOffset + selectedText.length;

    // Get bounding rect for positioning popover
    const rect = range.getBoundingClientRect();

    setSelection({
      text: selectedText,
      startOffset,
      endOffset,
      rect,
    });
  }, [containerRef, enabled]);

  const clearSelection = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [handleSelectionChange]);

  // Clear selection when clicking outside
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (
        selection &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        // Don't clear if clicking on annotation panel
        const target = e.target as HTMLElement;
        if (target.closest("[data-annotation-panel]")) return;
        clearSelection();
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [selection, containerRef, clearSelection]);

  return {
    selection,
    clearSelection,
    hasSelection: !!selection,
  };
}

export default useTextSelection;
