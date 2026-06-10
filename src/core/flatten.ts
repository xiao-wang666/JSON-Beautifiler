/**
 * Flattener: turns a {@link JsonValue} tree plus an expand/collapse state into a
 * linear array of visible rows ({@link FlatRow}) suitable for (virtualized)
 * tree rendering.
 *
 * Design references (design.md):
 * - `flatten(model, collapsedPaths): FlatRow[]` — depth-first traversal that
 *   emits one row per *visible* node. When a container's serialized path is in
 *   `collapsedPaths`, the container row is still emitted (with
 *   `isCollapsed = true`) but its subtree is NOT descended into. This is the
 *   basis for correctly updating the visible set under virtual scrolling
 *   (Requirement 8.3).
 * - `keyLabel`: object entry key, array element index as a string, root `null`
 *   (Requirement 2.5).
 * - `childCount`: number of direct children, used for the collapse summary
 *   (Requirement 2.4).
 *
 * Correctness properties (verified in flatten.pbt.test.ts):
 * - Property 4: collapsed descendants are never visible.
 * - Property 5: full expand (empty collapse set) yields exactly `countNodes(v)`
 *   rows.
 * - Property 8: every container row's `childCount` equals its direct child
 *   count.
 *
 * Requirements: 2.1, 2.4, 2.5, 4.5, 8.3
 */

import type { JsonPath, JsonValue } from "./model";
import { serializePath } from "./model";

/**
 * A single visible row produced by {@link flatten}. The `path` is the stable
 * identity used for expand/collapse state, search location and virtual-scroll
 * keys.
 */
export type FlatRow = {
  /** Stable identity: the path from the root to this node. */
  path: JsonPath;
  /** Indentation level. Equal to `path.length` (root is `0`). */
  depth: number;
  /**
   * Display label for this node:
   * - object entry: the entry key
   * - array element: the index as a string (e.g. `"0"`)
   * - root: `null`
   */
  keyLabel: string | null;
  /** The node's kind, mirrored from {@link JsonValue}. */
  kind: JsonValue["kind"];
  /** True for containers (`object` / `array`). */
  isCollapsible: boolean;
  /** True when this container is collapsed (its subtree is hidden). */
  isCollapsed: boolean;
  /** Number of direct children (`0` for primitives). */
  childCount: number;
  /** Short rendering of a primitive value (absent for containers). */
  primitivePreview?: string;
};

/**
 * Number of direct children of a node: object entries / array items, `0` for
 * primitives.
 */
function directChildCount(value: JsonValue): number {
  switch (value.kind) {
    case "object":
      return value.entries.length;
    case "array":
      return value.items.length;
    default:
      return 0;
  }
}

/**
 * Render a short, single-token preview for a primitive value:
 * - string: JSON-quoted text
 * - number: original `raw` source text
 * - boolean: `true` / `false`
 * - null: `null`
 *
 * Returns `undefined` for containers (they have no primitive preview).
 */
function primitivePreviewOf(value: JsonValue): string | undefined {
  switch (value.kind) {
    case "string":
      return JSON.stringify(value.value);
    case "number":
      return value.raw;
    case "boolean":
      return value.value ? "true" : "false";
    case "null":
      return "null";
    default:
      return undefined;
  }
}

/**
 * Flatten a {@link JsonValue} tree into the ordered list of currently visible
 * rows, honoring the collapse state in `collapsedPaths`.
 *
 * @param model the parsed JSON tree. Passing `null` (the "empty parse" case)
 *   yields an empty array.
 * @param collapsedPaths set of *serialized* paths (see
 *   {@link serializePath}) for containers that are collapsed. Default: empty
 *   (everything expanded).
 */
export function flatten(
  model: JsonValue | null,
  collapsedPaths: Set<string> = new Set(),
): FlatRow[] {
  const rows: FlatRow[] = [];
  if (model === null) {
    return rows;
  }

  const visit = (
    value: JsonValue,
    path: JsonPath,
    keyLabel: string | null,
  ): void => {
    const isCollapsible = value.kind === "object" || value.kind === "array";
    const isCollapsed =
      isCollapsible && collapsedPaths.has(serializePath(path));

    const row: FlatRow = {
      path,
      depth: path.length,
      keyLabel,
      kind: value.kind,
      isCollapsible,
      isCollapsed,
      childCount: directChildCount(value),
    };
    const preview = primitivePreviewOf(value);
    if (preview !== undefined) {
      row.primitivePreview = preview;
    }
    rows.push(row);

    // Do not descend into a collapsed container's subtree.
    if (isCollapsed) {
      return;
    }

    if (value.kind === "object") {
      for (const entry of value.entries) {
        visit(entry.value, [...path, entry.key], entry.key);
      }
    } else if (value.kind === "array") {
      for (let i = 0; i < value.items.length; i++) {
        visit(value.items[i]!, [...path, i], String(i));
      }
    }
  };

  visit(model, [], null);
  return rows;
}
