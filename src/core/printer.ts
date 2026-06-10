/**
 * Pretty-printer (serializer) and value-equality for the JSON Beautifier core.
 *
 * This module turns the internal {@link JsonValue} model back into formatted
 * JSON text and provides a value-level equivalence check used by tests.
 *
 * Design references (design.md):
 * - `prettyPrint(value, indent = 2)` — recursive, indented serialization.
 *   Objects/arrays are indented per nesting level; strings are escaped per JSON
 *   rules; numbers are emitted using their original `raw` text so that big
 *   integers / high-precision decimals survive a round trip; booleans and null
 *   are emitted as literals.
 * - Round-trip consistency (Property 1, Requirement 1.5): for any `JsonValue v`,
 *   `parse(prettyPrint(v))` is `ok` and its value is `equalJson`-equivalent to
 *   `v`.
 *
 * Requirements: 1.2, 1.5, 4.3
 */

import type { JsonValue } from "./model";

/**
 * Escape a raw string into a JSON string literal (including surrounding double
 * quotes).
 *
 * Escaping rules follow the JSON specification:
 * - `"` and `\` are backslash-escaped.
 * - The short escapes `\b \f \n \r \t` are used for those control characters.
 * - Any other control character (code point < 0x20) is emitted as a `\uXXXX`
 *   escape.
 * - All remaining characters (including non-ASCII / multi-byte characters and
 *   surrogate code units) are emitted verbatim, which the parser reads back
 *   unchanged.
 */
function escapeString(s: string): string {
  let out = '"';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    switch (ch) {
      case '"':
        out += '\\"';
        break;
      case "\\":
        out += "\\\\";
        break;
      case "\b":
        out += "\\b";
        break;
      case "\f":
        out += "\\f";
        break;
      case "\n":
        out += "\\n";
        break;
      case "\r":
        out += "\\r";
        break;
      case "\t":
        out += "\\t";
        break;
      default: {
        const code = s.charCodeAt(i);
        if (code < 0x20) {
          out += "\\u" + code.toString(16).padStart(4, "0");
        } else {
          out += ch;
        }
      }
    }
  }
  return out + '"';
}

/**
 * Recursive worker for {@link prettyPrint}.
 *
 * @param value the node to serialize
 * @param indent number of spaces per nesting level
 * @param depth  current nesting depth (0 at the root)
 */
function printValue(value: JsonValue, indent: number, depth: number): string {
  switch (value.kind) {
    case "string":
      return escapeString(value.value);
    case "number":
      // Emit the original source text to preserve precision (big integers,
      // high-precision decimals, original exponent notation).
      return value.raw;
    case "boolean":
      return value.value ? "true" : "false";
    case "null":
      return "null";
    case "array": {
      if (value.items.length === 0) {
        return "[]";
      }
      const childPad = " ".repeat(indent * (depth + 1));
      const closePad = " ".repeat(indent * depth);
      const lines = value.items.map(
        (item) => childPad + printValue(item, indent, depth + 1),
      );
      return "[\n" + lines.join(",\n") + "\n" + closePad + "]";
    }
    case "object": {
      if (value.entries.length === 0) {
        return "{}";
      }
      const childPad = " ".repeat(indent * (depth + 1));
      const closePad = " ".repeat(indent * depth);
      const lines = value.entries.map(
        (entry) =>
          childPad +
          escapeString(entry.key) +
          ": " +
          printValue(entry.value, indent, depth + 1),
      );
      return "{\n" + lines.join(",\n") + "\n" + closePad + "}";
    }
  }
}

/**
 * Serialize a {@link JsonValue} into formatted, indented JSON text.
 *
 * @param value the model to serialize. As a convenience for the "empty parse"
 *   case (where the parser yields `null`), passing `null` returns an empty
 *   string rather than the literal `"null"`.
 * @param indent number of spaces per nesting level (default `2`). A value of
 *   `0` still produces multi-line output, just without indentation.
 *
 * @example
 * prettyPrint({ kind: "array", items: [{ kind: "number", value: 1, raw: "1" }] })
 * // "[\n  1\n]"
 */
export function prettyPrint(value: JsonValue | null, indent = 2): string {
  if (value === null) {
    return "";
  }
  return printValue(value, indent, 0);
}

/**
 * Value-level equivalence of two {@link JsonValue} trees.
 *
 * Semantics:
 * - Two values are equal only if they share the same `kind`.
 * - `string`, `boolean` and `null` compare by their obvious values.
 * - `number` compares by numeric `value` (so `1e3` equals `1000`). The original
 *   `raw` text is intentionally ignored here — different source spellings of the
 *   same number are considered equal.
 * - `array` compares element-by-element in order.
 * - `object` compares entries in order (key and value pairwise). Order is
 *   significant because the parser and {@link prettyPrint} both preserve key
 *   order (including duplicate keys), which keeps the round-trip exact.
 */
export function equalJson(a: JsonValue, b: JsonValue): boolean {
  if (a.kind !== b.kind) {
    return false;
  }
  switch (a.kind) {
    case "string":
      return a.value === (b as Extract<JsonValue, { kind: "string" }>).value;
    case "number":
      return a.value === (b as Extract<JsonValue, { kind: "number" }>).value;
    case "boolean":
      return a.value === (b as Extract<JsonValue, { kind: "boolean" }>).value;
    case "null":
      return true;
    case "array": {
      const bb = b as Extract<JsonValue, { kind: "array" }>;
      if (a.items.length !== bb.items.length) {
        return false;
      }
      for (let i = 0; i < a.items.length; i++) {
        if (!equalJson(a.items[i]!, bb.items[i]!)) {
          return false;
        }
      }
      return true;
    }
    case "object": {
      const bb = b as Extract<JsonValue, { kind: "object" }>;
      if (a.entries.length !== bb.entries.length) {
        return false;
      }
      for (let i = 0; i < a.entries.length; i++) {
        if (a.entries[i]!.key !== bb.entries[i]!.key) {
          return false;
        }
        if (!equalJson(a.entries[i]!.value, bb.entries[i]!.value)) {
          return false;
        }
      }
      return true;
    }
  }
}
