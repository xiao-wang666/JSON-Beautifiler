/**
 * TreeView: renders a flat list of TreeRow components representing the JSON tree.
 *
 * For small documents, this renders all visible rows directly (no virtualization).
 * Each row receives match/highlight state and a toggle callback for
 * collapsible containers.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.5
 */

import { useEffect, useRef } from "react";
import { flatten } from "../core/flatten";
import { serializePath } from "../core/model";
import type { JsonPath } from "../core/model";
import { TreeRow } from "./TreeRow";
import { useAppContext } from "./appContext";

export function TreeView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, dispatch } = useAppContext();
  const rows = flatten(state.model, state.collapsedPaths);

  const matchSet = new Set(state.search.matches.map((p) => serializePath(p)));

  const currentMatchPath =
    state.search.currentIndex >= 0 &&
    state.search.currentIndex < state.search.matches.length
      ? serializePath(state.search.matches[state.search.currentIndex]!)
      : null;

  // Scroll to current match when it changes
  useEffect(() => {
    if (!currentMatchPath) return;
    requestAnimationFrame(() => {
      const el = containerRef.current?.querySelector(".jb-match-current");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }, [currentMatchPath]);

  const handleToggle = (path: JsonPath) => {
    dispatch({ type: "toggle", path });
  };

  return (
    <div
      ref={containerRef}
      className="jb-tree-view"
      role="tree"
      style={{ height: "100%" }}
    >
      {rows.map((row) => {
        const key = serializePath(row.path);
        return (
          <TreeRow
            key={key}
            row={row}
            isMatch={matchSet.has(key)}
            isCurrentMatch={key === currentMatchPath}
            onToggle={handleToggle}
          />
        );
      })}
    </div>
  );
}
