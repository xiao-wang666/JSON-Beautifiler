/**
 * SearchMatcher: locate nodes in a {@link JsonValue} tree that match a textual
 * query, and compute the ancestor paths needed to reveal a match.
 *
 * Design references (design.md, Requirement 7):
 * - `findMatches(model, query): JsonPath[]` — traverse the whole tree and
 *   collect the path of every node that matches `query` (case-insensitive).
 * - `ancestorsOf(path): JsonPath[]` — every proper ancestor path (including the
 *   empty root path), so the view layer can expand all ancestors of a match and
 *   guarantee it becomes visible (Requirement 7.3).
 *
 * Matching rules (Requirement 7.2):
 * - A node matches if EITHER
 *     (a) its KEY name (the object key it sits under) contains `query`, OR
 *     (b) its STRINGIFIED VALUE contains `query`,
 *   compared case-insensitively.
 * - Stringification of a value, for matching purposes, is:
 *     - string  -> the raw string content
 *     - number  -> its original `raw` source text
 *     - boolean -> "true" / "false"
 *     - null    -> "null"
 *   Containers (`object` / `array`) are NOT stringified as a whole — they match
 *   only via their key name. (Stringifying an entire subtree would make a parent
 *   match for anything any descendant contains, which is surprising and noisy.)
 * - The path returned for a match is the path of the matching VALUE node. For a
 *   key match this is the path of the value associated with that key (keys do
 *   not have their own path; they identify the value they point to).
 *
 * Empty handling:
 * - An empty or whitespace-only `query` returns `[]` (no highlight; matches are
 *   cleared — Requirement 7.6). A non-empty query is used verbatim (only the
 *   case is normalized); it is NOT trimmed, so a query like `" a"` matches a
 *   literal space followed by `a`.
 * - A `null` model (the "empty parse" case) returns `[]`.
 *
 * Correctness properties (verified in search.pbt.test.ts):
 * - Property 6 (visibility closure): for each match `m`, expanding every path in
 *   `ancestorsOf(m)` makes `m` visible in `flatten`; every returned ancestor is
 *   a strict ancestor of `m` and the chain covers every prefix.
 * - Property 7 (soundness & completeness): `findMatches` returns exactly the
 *   nodes whose key or stringified value contains the query.
 *
 * Requirements: 7.2, 7.3
 */

import type { JsonPath, JsonValue } from "./model";

/**
 * Stringify a value for matching purposes, or return `null` for containers
 * (which are not matched by their content, only by their key name).
 *
 * - string  -> the string content
 * - number  -> the original `raw` source text (precision-preserving)
 * - boolean -> "true" / "false"
 * - null    -> "null"
 * - object / array -> `null` (no whole-subtree stringification)
 */
function stringifyValueForMatch(value: JsonValue): string | null {
  switch (value.kind) {
    case "string":
      return value.value;
    case "number":
      return value.raw;
    case "boolean":
      return value.value ? "true" : "false";
    case "null":
      return "null";
    default:
      return null;
  }
}

/**
 * Find the paths of all nodes that match `query` (case-insensitive), where a
 * node matches when its key name or its stringified value contains the query.
 *
 * The traversal is pre-order depth-first (parent before children, object
 * entries / array items in declaration order), the same order used by the
 * flattener, so results are stable and predictable. Each matching node
 * contributes its path exactly once even if both its key and value match.
 *
 * @param model the parsed tree, or `null` for the empty-parse case.
 * @param query the search text. Empty/whitespace-only yields `[]`.
 * @returns the paths of matching value nodes, in DFS order.
 */
export function findMatches(
  model: JsonValue | null,
  query: string,
): JsonPath[] {
  const matches: JsonPath[] = [];
  if (model === null) {
    return matches;
  }
  // Empty / whitespace-only queries match nothing (clears highlight).
  if (query.trim() === "") {
    return matches;
  }

  const needle = query.toLowerCase();

  const visit = (
    value: JsonValue,
    path: JsonPath,
    key: string | null,
  ): void => {
    const keyMatch = key !== null && key.toLowerCase().includes(needle);
    const stringified = stringifyValueForMatch(value);
    const valueMatch =
      stringified !== null && stringified.toLowerCase().includes(needle);

    if (keyMatch || valueMatch) {
      matches.push(path);
    }

    if (value.kind === "object") {
      for (const entry of value.entries) {
        visit(entry.value, [...path, entry.key], entry.key);
      }
    } else if (value.kind === "array") {
      for (let i = 0; i < value.items.length; i++) {
        visit(value.items[i]!, [...path, i], null);
      }
    }
  };

  visit(model, [], null);
  return matches;
}

/**
 * Return every proper ancestor path of `path`, from the root down to the
 * immediate parent, including the empty root path `[]`.
 *
 * These are exactly the prefixes of `path` of length `0 .. path.length - 1`.
 * Expanding all of them guarantees the node at `path` becomes visible.
 *
 * @example
 * ancestorsOf(["a", 0, "b"]) // [[], ["a"], ["a", 0]]
 * ancestorsOf([])            // []  (root has no ancestors)
 */
export function ancestorsOf(path: JsonPath): JsonPath[] {
  const result: JsonPath[] = [];
  for (let i = 0; i < path.length; i++) {
    result.push(path.slice(0, i));
  }
  return result;
}
