/**
 * TreeRow: renders a single row in the JSON tree view with syntax highlighting,
 * collapse/expand toggling, URL detection, and search match highlighting.
 *
 * Requirements: 2.2, 2.3, 2.4, 3.1, 3.2, 3.3
 */

import type { FlatRow } from "../core/flatten";
import type { JsonPath } from "../core/model";
import { isUrl } from "../core/url";

export interface TreeRowProps {
  row: FlatRow;
  isMatch: boolean;
  isCurrentMatch: boolean;
  onToggle(path: JsonPath): void;
}

/** Indentation per depth level in pixels. */
const INDENT_PX = 18;

/**
 * Returns the CSS class for a token kind.
 */
function tokenClass(kind: FlatRow["kind"]): string {
  switch (kind) {
    case "string":
      return "jb-token-string";
    case "number":
      return "jb-token-number";
    case "boolean":
      return "jb-token-boolean";
    case "null":
      return "jb-token-null";
    default:
      return "";
  }
}

/**
 * Renders the primitive value portion of a row, with URL detection for strings.
 */
function PrimitiveValue({ row }: { row: FlatRow }) {
  const preview = row.primitivePreview ?? "";
  const cls = tokenClass(row.kind);

  // For strings, check if the content (without quotes) is a URL.
  if (row.kind === "string" && preview.length >= 2) {
    // Remove surrounding quotes to get the raw string value.
    const inner = preview.slice(1, -1);
    if (isUrl(inner)) {
      return (
        <a
          className="jb-link"
          href={inner}
          target="_blank"
          rel="noopener noreferrer"
        >
          {preview}
        </a>
      );
    }
  }

  return <span className={cls}>{preview}</span>;
}

/**
 * Renders the collapse summary for a container node, e.g. "{3 items}" or "[5 items]".
 */
function CollapseSummary({ row }: { row: FlatRow }) {
  const bracket = row.kind === "object" ? ["{", "}"] : ["[", "]"];
  return (
    <span className="jb-token-punctuation jb-collapse-summary">
      {bracket[0]}
      {row.childCount} {row.childCount === 1 ? "item" : "items"}
      {bracket[1]}
    </span>
  );
}

export function TreeRow({
  row,
  isMatch,
  isCurrentMatch,
  onToggle,
}: TreeRowProps) {
  const paddingLeft = row.depth * INDENT_PX;

  const rowClasses = [
    "jb-tree-row",
    isMatch ? "jb-match" : "",
    isCurrentMatch ? "jb-match-current" : "",
    row.isCollapsible ? "jb-tree-row-collapsible" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleClick = () => {
    if (row.isCollapsible) {
      onToggle(row.path);
    }
  };

  // Synthetic closing-bracket row: just the matching `}` / `]` at the
  // container's indentation. Not interactive, not part of the tree semantics.
  if (row.closing) {
    return (
      <div className="jb-tree-row" style={{ paddingLeft }} aria-hidden="true">
        <span className="jb-token-punctuation">{row.closing}</span>
      </div>
    );
  }

  return (
    <div
      className={rowClasses}
      style={{ paddingLeft }}
      onClick={handleClick}
      role="treeitem"
      aria-expanded={row.isCollapsible ? !row.isCollapsed : undefined}
    >
      {/* Toggle indicator for collapsible nodes */}
      {row.isCollapsible && (
        <span className="jb-toggle-indicator" aria-hidden="true">
          {row.isCollapsed ? "▶" : "▼"}
        </span>
      )}

      {/* Key label */}
      {row.keyLabel !== null && (
        <>
          <span className="jb-token-key">{row.keyLabel}</span>
          <span className="jb-token-punctuation">{": "}</span>
        </>
      )}

      {/* Value: collapsed summary, empty-container inline, open bracket, or primitive */}
      {row.isCollapsible ? (
        row.isCollapsed ? (
          <CollapseSummary row={row} />
        ) : row.childCount === 0 ? (
          <span className="jb-token-punctuation">
            {row.kind === "object" ? "{}" : "[]"}
          </span>
        ) : (
          <span className="jb-token-punctuation">
            {row.kind === "object" ? "{" : "["}
          </span>
        )
      ) : (
        <PrimitiveValue row={row} />
      )}
    </div>
  );
}
