/**
 * Internal data model and core types for JSON Beautifier.
 *
 * Covers:
 * - `JsonValue` discriminated union (the parsed JSON tree)
 * - `JsonPath` stable node identifier (sequence of keys / indices from root)
 * - `ParseError` / `ParseResult` parser output types
 * - path serialization / deserialization helpers
 * - `isAncestor` and `countNodes` utilities
 *
 * Requirements: 1.1, 2.1, 2.5
 */

/**
 * A path from the root to a node. Object keys are strings, array indices are
 * numbers. Used as the stable identity of every Tree_Node (expand/collapse
 * state, search location, virtual-scroll key).
 */
export type JsonPath = (string | number)[];

/**
 * The internal representation of any JSON value. A discriminated union keyed by
 * `kind`.
 *
 * - `object` keeps an ordered array of entries (rather than a Record) to
 *   preserve key order and allow predictable handling of duplicate keys.
 * - `number` keeps both the parsed `value` and the original `raw` text so that
 *   big integers / high-precision decimals survive a round trip.
 */
export type JsonValue =
  | { kind: "object"; entries: { key: string; value: JsonValue }[] }
  | { kind: "array"; items: JsonValue[] }
  | { kind: "string"; value: string }
  | { kind: "number"; value: number; raw: string }
  | { kind: "boolean"; value: boolean }
  | { kind: "null" };

/** Describes a parse failure, including a human-readable message and position. */
export type ParseError = {
  /** Descriptive error message. */
  message: string;
  /** 1-based line number. */
  line: number;
  /** 1-based column number. */
  column: number;
  /** 0-based character offset. */
  offset: number;
};

/** Result of parsing input text into a `JsonValue`. */
export type ParseResult =
  | { ok: true; value: JsonValue }
  | { ok: false; error: ParseError };

/**
 * Serialize a `JsonPath` into a stable, unambiguous string.
 *
 * The encoding is the JSON representation of the path array. Because JSON
 * distinguishes the string `"1"` from the number `1`, this round-trips cleanly
 * and never confuses a numeric array index with a string key that happens to
 * look numeric.
 *
 * @example
 * serializePath(["a", 0, "b"]) // '["a",0,"b"]'
 * serializePath(["1"])         // '["1"]'  (string key)
 * serializePath([1])           // '[1]'    (numeric index)
 */
export function serializePath(path: JsonPath): string {
  return JSON.stringify(path);
}

/**
 * Inverse of {@link serializePath}. Parses a serialized path back into a
 * `JsonPath`, preserving the string-vs-number distinction of each segment.
 *
 * @throws if the input is not a valid serialized path.
 */
export function deserializePath(serialized: string): JsonPath {
  const parsed: unknown = JSON.parse(serialized);
  if (!Array.isArray(parsed)) {
    throw new Error(`Invalid serialized path: ${serialized}`);
  }
  for (const segment of parsed) {
    if (typeof segment !== "string" && typeof segment !== "number") {
      throw new Error(`Invalid path segment in: ${serialized}`);
    }
  }
  return parsed as JsonPath;
}

/**
 * Returns true if `ancestor` is a strict ancestor of `descendant`, i.e. the
 * ancestor path is a proper prefix of the descendant path (matching each
 * segment by both value and type).
 *
 * A path is never its own ancestor.
 */
export function isAncestor(ancestor: JsonPath, descendant: JsonPath): boolean {
  if (ancestor.length >= descendant.length) {
    return false;
  }
  for (let i = 0; i < ancestor.length; i++) {
    if (ancestor[i] !== descendant[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Counts every `JsonValue` node in the tree, including the root and all nested
 * values. For containers, each child value contributes one node (object entry
 * values and array items are themselves `JsonValue`s).
 */
export function countNodes(value: JsonValue): number {
  switch (value.kind) {
    case "object": {
      let total = 1;
      for (const entry of value.entries) {
        total += countNodes(entry.value);
      }
      return total;
    }
    case "array": {
      let total = 1;
      for (const item of value.items) {
        total += countNodes(item);
      }
      return total;
    }
    default:
      return 1;
  }
}
