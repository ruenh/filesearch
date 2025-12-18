/**
 * Operational Transformation (OT) implementation for collaborative editing.
 * Provides conflict resolution when multiple users edit simultaneously.
 * Requirements: 54.2
 */

import type { Operation } from "./types";

/**
 * Generate a unique operation ID
 */
export function generateOperationId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create an insert operation
 */
export function createInsertOp(position: number, text: string): Operation {
  return { type: "insert", position, text };
}

/**
 * Create a delete operation
 */
export function createDeleteOp(position: number, length: number): Operation {
  return { type: "delete", position, length };
}

/**
 * Create a retain operation (no-op, used for composition)
 */
export function createRetainOp(position: number, length: number): Operation {
  return { type: "retain", position, length };
}

/**
 * Apply an operation to a document string
 */
export function applyOperation(content: string, op: Operation): string {
  switch (op.type) {
    case "insert":
      if (op.text === undefined) return content;
      const insertPos = Math.min(op.position, content.length);
      return content.slice(0, insertPos) + op.text + content.slice(insertPos);

    case "delete":
      if (op.length === undefined) return content;
      const deletePos = Math.min(op.position, content.length);
      const deleteEnd = Math.min(deletePos + op.length, content.length);
      return content.slice(0, deletePos) + content.slice(deleteEnd);

    case "retain":
      // Retain doesn't change content
      return content;

    default:
      return content;
  }
}

/**
 * Apply multiple operations to a document string
 */
export function applyOperations(content: string, ops: Operation[]): string {
  return ops.reduce((doc, op) => applyOperation(doc, op), content);
}

/**
 * Transform operation A against operation B.
 * Returns the transformed operation A' that can be applied after B.
 * This is the core of OT - ensuring convergence when operations are concurrent.
 */
export function transformOperation(opA: Operation, opB: Operation): Operation {
  // If either operation is retain, no transformation needed
  if (opA.type === "retain" || opB.type === "retain") {
    return { ...opA };
  }

  // Insert vs Insert
  if (opA.type === "insert" && opB.type === "insert") {
    // If A's position is after B's insert, shift A's position
    if (
      opA.position > opB.position ||
      (opA.position === opB.position && opA.text! > opB.text!)
    ) {
      return {
        ...opA,
        position: opA.position + (opB.text?.length || 0),
      };
    }
    return { ...opA };
  }

  // Insert vs Delete
  if (opA.type === "insert" && opB.type === "delete") {
    const deleteEnd = opB.position + (opB.length || 0);

    if (opA.position <= opB.position) {
      // Insert is before delete, no change needed
      return { ...opA };
    } else if (opA.position >= deleteEnd) {
      // Insert is after delete, shift position back
      return {
        ...opA,
        position: opA.position - (opB.length || 0),
      };
    } else {
      // Insert is within deleted range, move to delete position
      return {
        ...opA,
        position: opB.position,
      };
    }
  }

  // Delete vs Insert
  if (opA.type === "delete" && opB.type === "insert") {
    if (opA.position >= opB.position) {
      // Delete is after insert, shift position forward
      return {
        ...opA,
        position: opA.position + (opB.text?.length || 0),
      };
    }
    return { ...opA };
  }

  // Delete vs Delete
  if (opA.type === "delete" && opB.type === "delete") {
    const aEnd = opA.position + (opA.length || 0);
    const bEnd = opB.position + (opB.length || 0);

    // No overlap - A is before B
    if (aEnd <= opB.position) {
      return { ...opA };
    }

    // No overlap - A is after B
    if (opA.position >= bEnd) {
      return {
        ...opA,
        position: opA.position - (opB.length || 0),
      };
    }

    // Overlap cases
    if (opA.position >= opB.position && aEnd <= bEnd) {
      // A is completely within B - A becomes no-op
      return { type: "retain", position: opA.position, length: 0 };
    }

    if (opA.position <= opB.position && aEnd >= bEnd) {
      // B is completely within A - reduce A's length
      return {
        ...opA,
        length: (opA.length || 0) - (opB.length || 0),
      };
    }

    if (opA.position < opB.position) {
      // A starts before B, overlaps
      return {
        ...opA,
        length: opB.position - opA.position,
      };
    }

    // A starts within B
    return {
      ...opA,
      position: opB.position,
      length: aEnd - bEnd,
    };
  }

  return { ...opA };
}

/**
 * Transform a cursor position based on an operation
 */
export function transformCursorPosition(
  cursorOffset: number,
  op: Operation
): number {
  switch (op.type) {
    case "insert":
      if (cursorOffset > op.position) {
        return cursorOffset + (op.text?.length || 0);
      }
      return cursorOffset;

    case "delete":
      const deleteEnd = op.position + (op.length || 0);
      if (cursorOffset > deleteEnd) {
        return cursorOffset - (op.length || 0);
      } else if (cursorOffset > op.position) {
        return op.position;
      }
      return cursorOffset;

    default:
      return cursorOffset;
  }
}

/**
 * Compose two operations into a single operation (when possible)
 * Returns null if operations cannot be composed
 */
export function composeOperations(
  opA: Operation,
  opB: Operation
): Operation | null {
  // Can only compose same-type operations at adjacent positions
  if (opA.type !== opB.type) return null;

  if (opA.type === "insert" && opB.type === "insert") {
    // Compose adjacent inserts
    const aEnd = opA.position + (opA.text?.length || 0);
    if (aEnd === opB.position) {
      return {
        type: "insert",
        position: opA.position,
        text: (opA.text || "") + (opB.text || ""),
      };
    }
  }

  if (opA.type === "delete" && opB.type === "delete") {
    // Compose adjacent deletes
    if (opA.position === opB.position) {
      return {
        type: "delete",
        position: opA.position,
        length: (opA.length || 0) + (opB.length || 0),
      };
    }
    // Backspace composition
    if (opB.position + (opB.length || 0) === opA.position) {
      return {
        type: "delete",
        position: opB.position,
        length: (opA.length || 0) + (opB.length || 0),
      };
    }
  }

  return null;
}

/**
 * Invert an operation (for undo functionality)
 */
export function invertOperation(
  op: Operation,
  originalContent: string
): Operation {
  switch (op.type) {
    case "insert":
      return {
        type: "delete",
        position: op.position,
        length: op.text?.length || 0,
      };

    case "delete":
      const deletedText = originalContent.slice(
        op.position,
        op.position + (op.length || 0)
      );
      return {
        type: "insert",
        position: op.position,
        text: deletedText,
      };

    default:
      return { ...op };
  }
}
