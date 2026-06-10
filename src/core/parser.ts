/**
 * Fault-aware JSON parser for JSON Beautifier.
 *
 * This module implements a hand-written tokenizer + recursive descent parser
 * that turns input text into the internal {@link JsonValue} model.
 *
 * Standard JSON support (task 3.1):
 * - objects, arrays, strings (with escapes), numbers, true / false / null
 *
 * Lenient JS-object-literal extensions (task 3.2). On top of standard JSON the
 * parser additionally accepts and normalizes:
 * - unquoted object keys (identifier-like), e.g. `{name: 1}`
 * - single-quoted strings, e.g. `{'a': 'b'}`
 * - trailing commas in objects and arrays, e.g. `[1, 2,]` / `{"a": 1,}`
 * - line comments `// ...` and block comments `/* ... *\/` (treated as
 *   whitespace, may appear anywhere between tokens)
 *
 * All lenient inputs normalize to a valid {@link JsonValue}; standard JSON
 * continues to parse unchanged.
 *
 * Guarantees:
 * - `parse` NEVER throws — it always returns a {@link ParseResult}.
 * - The tokenizer tracks `line` (1-based), `column` (1-based) and `offset`
 *   (0-based). Errors carry the position where the problem was detected.
 * - Empty or whitespace-only input is treated as a successful parse producing
 *   `{ ok: true, value: null }`.
 * - Numbers preserve the original source text in the `raw` field while also
 *   exposing the parsed numeric `value`.
 *
 * Requirements: 1.1, 1.3, 1.4, 5.2
 */

import type { JsonValue, ParseError, ParseResult } from "./model";

/** Token kinds produced by the tokenizer. */
type TokenType =
  | "{"
  | "}"
  | "["
  | "]"
  | ":"
  | ","
  | "string"
  | "number"
  | "true"
  | "false"
  | "null"
  | "identifier"
  | "eof";

/** A position in the source text. */
interface Position {
  line: number;
  column: number;
  offset: number;
}

/** A lexical token with its source position. */
interface Token extends Position {
  type: TokenType;
  /** For `string`: the decoded string value. */
  stringValue?: string;
  /** For `identifier`: the raw identifier text (used as an unquoted key). */
  identifierName?: string;
  /** For `number`: the parsed numeric value. */
  numberValue?: number;
  /** For `number`: the original source text. */
  raw?: string;
}

/**
 * Internal error used to unwind the recursive descent. It is caught inside
 * {@link parse} and converted into a `{ ok: false, error }` result, so it never
 * escapes the module.
 */
class ParseFailure extends Error {
  readonly parseError: ParseError;
  constructor(parseError: ParseError) {
    super(parseError.message);
    this.name = "ParseFailure";
    this.parseError = parseError;
  }
}

/** Returns true for the four JSON insignificant-whitespace characters. */
function isWhitespace(ch: string): boolean {
  return ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
}

/** Returns true for ASCII digits 0-9. */
function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}

/** Returns true for characters allowed to start an unquoted identifier key. */
function isIdentifierStart(ch: string): boolean {
  return (
    (ch >= "a" && ch <= "z") ||
    (ch >= "A" && ch <= "Z") ||
    ch === "_" ||
    ch === "$"
  );
}

/** Returns true for characters allowed inside an unquoted identifier key. */
function isIdentifierPart(ch: string): boolean {
  return isIdentifierStart(ch) || isDigit(ch);
}

/**
 * The tokenizer. Walks the input one character at a time tracking position, and
 * produces tokens on demand via {@link next}.
 */
class Tokenizer {
  private readonly input: string;
  private offset = 0;
  private line = 1;
  private column = 1;

  constructor(input: string) {
    this.input = input;
  }

  /** Return the character at the current offset, or "" if past end. */
  private char(): string {
    return this.input[this.offset] ?? "";
  }

  /** Return the character at a given index, or "" if out of bounds. */
  private charAt(i: number): string {
    return this.input[i] ?? "";
  }

  /** Current scanning position (used to build error reports). */
  position(): Position {
    return { line: this.line, column: this.column, offset: this.offset };
  }

  private fail(message: string, pos: Position = this.position()): never {
    throw new ParseFailure({
      message: `${message} at line ${pos.line}, column ${pos.column}`,
      line: pos.line,
      column: pos.column,
      offset: pos.offset,
    });
  }

  /** Advance one character, maintaining line/column bookkeeping. */
  private advance(): string {
    const ch = this.input[this.offset]!;
    this.offset++;
    if (ch === "\n") {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return ch;
  }

  /**
   * Skip insignificant trivia between tokens: whitespace, line comments
   * (`// ...` to end of line) and block comments (`/* ... *\/`). Comments are
   * a lenient extension (task 3.2) and are treated exactly like whitespace.
   */
  private skipTrivia(): void {
    while (this.offset < this.input.length) {
      const ch = this.char();

      if (isWhitespace(ch)) {
        this.advance();
        continue;
      }

      // Line comment: // ... up to (but not including) the newline.
      if (ch === "/" && this.charAt(this.offset + 1) === "/") {
        this.advance();
        this.advance();
        while (this.offset < this.input.length && this.char() !== "\n") {
          this.advance();
        }
        continue;
      }

      // Block comment: /* ... */ (may span multiple lines).
      if (ch === "/" && this.charAt(this.offset + 1) === "*") {
        const start = this.position();
        this.advance();
        this.advance();
        let closed = false;
        while (this.offset < this.input.length) {
          if (this.char() === "*" && this.charAt(this.offset + 1) === "/") {
            this.advance();
            this.advance();
            closed = true;
            break;
          }
          this.advance();
        }
        if (!closed) {
          this.fail("Unterminated comment", start);
        }
        continue;
      }

      break;
    }
  }

  /** Produce the next token. Returns an `eof` token at end of input. */
  next(): Token {
    this.skipTrivia();

    const start = this.position();
    if (this.offset >= this.input.length) {
      return { type: "eof", ...start };
    }

    const ch = this.char();

    switch (ch) {
      case "{":
      case "}":
      case "[":
      case "]":
      case ":":
      case ",":
        this.advance();
        return { type: ch, ...start };
      case '"':
      case "'":
        // Single-quoted strings are a lenient extension (task 3.2).
        return this.readString(start);
      default:
        break;
    }

    if (ch === "-" || isDigit(ch)) {
      return this.readNumber(start);
    }

    // Identifiers cover both the JSON literals (true / false / null) and
    // lenient unquoted object keys (task 3.2).
    if (isIdentifierStart(ch)) {
      return this.readIdentifierOrKeyword(start);
    }

    return this.fail(`Unexpected character ${JSON.stringify(ch)}`, start);
  }

  /**
   * Read an identifier run. If it exactly matches a JSON literal keyword it is
   * returned as that keyword token; otherwise it is an `identifier` token whose
   * text may be used as an unquoted object key.
   */
  private readIdentifierOrKeyword(start: Position): Token {
    let name = "";
    while (this.offset < this.input.length && isIdentifierPart(this.char())) {
      name += this.advance();
    }
    if (name === "true") {
      return { type: "true", ...start };
    }
    if (name === "false") {
      return { type: "false", ...start };
    }
    if (name === "null") {
      return { type: "null", ...start };
    }
    return { type: "identifier", identifierName: name, ...start };
  }

  /** Read a double- or single-quoted string with standard JSON escapes. */
  private readString(start: Position): Token {
    // consume opening quote (either " or '); remember which so we know where
    // the string ends.
    const quote = this.advance();
    let value = "";

    for (;;) {
      if (this.offset >= this.input.length) {
        return this.fail("Unterminated string", start);
      }
      const ch = this.advance();

      if (ch === quote) {
        return { type: "string", stringValue: value, ...start };
      }

      if (ch === "\\") {
        value += this.readEscape();
        continue;
      }

      // Control characters must be escaped in JSON.
      if (ch < "\u0020") {
        return this.fail(
          `Invalid control character ${JSON.stringify(ch)} in string`,
          start,
        );
      }

      value += ch;
    }
  }

  /** Read the character(s) following a backslash inside a string. */
  private readEscape(): string {
    if (this.offset >= this.input.length) {
      this.fail("Unterminated escape sequence");
    }
    const escapeStart: Position = {
      line: this.line,
      column: this.column - 1,
      offset: this.offset - 1,
    };
    const ch = this.advance();
    switch (ch) {
      case '"':
        return '"';
      case "'":
        // Lenient: allow escaping single quotes (valid inside '...' strings).
        return "'";
      case "\\":
        return "\\";
      case "/":
        return "/";
      case "b":
        return "\b";
      case "f":
        return "\f";
      case "n":
        return "\n";
      case "r":
        return "\r";
      case "t":
        return "\t";
      case "u":
        return this.readUnicodeEscape(escapeStart);
      default:
        return this.fail(`Invalid escape sequence \\${ch}`, escapeStart);
    }
  }

  /** Read the four hex digits of a `\uXXXX` escape and return the char. */
  private readUnicodeEscape(escapeStart: Position): string {
    let hex = "";
    for (let i = 0; i < 4; i++) {
      if (this.offset >= this.input.length) {
        return this.fail("Invalid unicode escape sequence", escapeStart);
      }
      const ch = this.advance();
      const isHex =
        (ch >= "0" && ch <= "9") ||
        (ch >= "a" && ch <= "f") ||
        (ch >= "A" && ch <= "F");
      if (!isHex) {
        return this.fail(
          `Invalid unicode escape sequence \\u${hex}${ch}`,
          escapeStart,
        );
      }
      hex += ch;
    }
    return String.fromCharCode(parseInt(hex, 16));
  }

  /** Read a JSON number, preserving its original text. */
  private readNumber(start: Position): Token {
    const begin = this.offset;

    // optional leading minus
    if (this.char() === "-") {
      this.advance();
    }

    // integer part: either a single 0 or a non-zero digit followed by digits
    if (this.char() === "0") {
      this.advance();
    } else if (isDigit(this.char())) {
      while (isDigit(this.char())) {
        this.advance();
      }
    } else {
      return this.fail("Invalid number: expected a digit", start);
    }

    // fractional part
    if (this.char() === ".") {
      this.advance();
      if (!isDigit(this.char())) {
        return this.fail(
          "Invalid number: expected a digit after decimal point",
          start,
        );
      }
      while (isDigit(this.char())) {
        this.advance();
      }
    }

    // exponent part
    if (this.char() === "e" || this.char() === "E") {
      this.advance();
      if (this.char() === "+" || this.char() === "-") {
        this.advance();
      }
      if (!isDigit(this.char())) {
        return this.fail("Invalid number: expected a digit in exponent", start);
      }
      while (isDigit(this.char())) {
        this.advance();
      }
    }

    const raw = this.input.slice(begin, this.offset);
    return { type: "number", raw, numberValue: Number(raw), ...start };
  }
}

/** The recursive descent parser, driven by tokens from {@link Tokenizer}. */
class Parser {
  private readonly tokenizer: Tokenizer;
  private current: Token;

  constructor(input: string) {
    this.tokenizer = new Tokenizer(input);
    this.current = this.tokenizer.next();
  }

  /** Advance to the next token, returning the token that was current. */
  private consume(): Token {
    const token = this.current;
    this.current = this.tokenizer.next();
    return token;
  }

  private fail(message: string, token: Token = this.current): never {
    throw new ParseFailure({
      message: `${message} at line ${token.line}, column ${token.column}`,
      line: token.line,
      column: token.column,
      offset: token.offset,
    });
  }

  /** Parse a complete document: a single value followed by EOF. */
  parseDocument(): JsonValue {
    const value = this.parseValue();
    if (this.current.type !== "eof") {
      this.fail(`Unexpected token '${this.describe(this.current)}'`);
    }
    return value;
  }

  /** A human-readable description of a token for error messages. */
  private describe(token: Token): string {
    switch (token.type) {
      case "string":
        return JSON.stringify(token.stringValue);
      case "number":
        return token.raw ?? "number";
      case "eof":
        return "end of input";
      default:
        return token.type;
    }
  }

  /** Parse any JSON value based on the current token. */
  private parseValue(): JsonValue {
    switch (this.current.type) {
      case "{":
        return this.parseObject();
      case "[":
        return this.parseArray();
      case "string": {
        const token = this.consume();
        return { kind: "string", value: token.stringValue as string };
      }
      case "number": {
        const token = this.consume();
        return {
          kind: "number",
          value: token.numberValue as number,
          raw: token.raw as string,
        };
      }
      case "true":
        this.consume();
        return { kind: "boolean", value: true };
      case "false":
        this.consume();
        return { kind: "boolean", value: false };
      case "null":
        this.consume();
        return { kind: "null" };
      case "eof":
        return this.fail("Unexpected end of input");
      default:
        return this.fail(`Unexpected token '${this.describe(this.current)}'`);
    }
  }

  /** Parse an object: `{ "key": value, ... }`. */
  private parseObject(): JsonValue {
    this.consume(); // '{'
    const entries: { key: string; value: JsonValue }[] = [];

    if (this.current.type === "}") {
      this.consume();
      return { kind: "object", entries };
    }

    for (;;) {
      // key — standard JSON requires a quoted string; lenient mode (task 3.2)
      // additionally accepts unquoted identifier keys and single-quoted
      // strings (the latter are already produced as `string` tokens).
      let key: string;
      if (this.current.type === "string") {
        key = this.consume().stringValue as string;
      } else if (this.current.type === "identifier") {
        key = this.consume().identifierName as string;
      } else {
        return this.fail(
          `Expected string key but found '${this.describe(this.current)}'`,
        );
      }

      if ((this.current as Token).type !== ":") {
        this.fail(`Expected ':' but found '${this.describe(this.current)}'`);
      }
      this.consume(); // ':'

      const value = this.parseValue();
      entries.push({ key, value });

      if ((this.current as Token).type === ",") {
        this.consume();
        // Lenient (task 3.2): allow a trailing comma before the closing brace.
        if ((this.current as Token).type === "}") {
          this.consume();
          return { kind: "object", entries };
        }
        continue;
      }
      if ((this.current as Token).type === "}") {
        this.consume();
        return { kind: "object", entries };
      }
      this.fail(
        `Expected ',' or '}' but found '${this.describe(this.current)}'`,
      );
    }
  }

  /** Parse an array: `[ value, ... ]`. */
  private parseArray(): JsonValue {
    this.consume(); // '['
    const items: JsonValue[] = [];

    if (this.current.type === "]") {
      this.consume();
      return { kind: "array", items };
    }

    for (;;) {
      items.push(this.parseValue());

      if ((this.current as Token).type === ",") {
        this.consume();
        // Lenient (task 3.2): allow a trailing comma before the closing bracket.
        if ((this.current as Token).type === "]") {
          this.consume();
          return { kind: "array", items };
        }
        continue;
      }
      if ((this.current as Token).type === "]") {
        this.consume();
        return { kind: "array", items };
      }
      this.fail(
        `Expected ',' or ']' but found '${this.describe(this.current)}'`,
      );
    }
  }
}

/**
 * Parse input text into a {@link JsonValue}.
 *
 * Empty or whitespace-only input returns `{ ok: true, value: null }`. Any
 * syntax error returns `{ ok: false, error }` with a descriptive message and
 * position. This function never throws.
 */
export function parse(input: string): ParseResult {
  // Requirement 5.2: empty / whitespace-only input is a successful empty parse.
  if (input.trim() === "") {
    return { ok: true, value: null as unknown as JsonValue };
  }

  // Pre-processing: detect and unescape escaped JSON strings.
  // Case 1: Input is wrapped in quotes like "{ \"key\": ... }" — a JSON-encoded string.
  // Case 2: Input contains \" but isn't wrapped in quotes (bare escaped content).
  let normalized = input;
  const trimmed = input.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    // Looks like a JSON string literal wrapping escaped JSON content.
    // Try to JSON.parse it to unwrap the outer quotes and unescape.
    try {
      // Single quotes aren't valid JSON, convert to double quotes for parsing.
      const toparse = trimmed.startsWith("'")
        ? `"${trimmed.slice(1, -1)}"`
        : trimmed;
      const unescaped = JSON.parse(toparse);
      if (typeof unescaped === "string" && unescaped.trim().length > 0) {
        normalized = unescaped;
      }
    } catch {
      // Not a valid JSON string — proceed with original input
    }
  } else if (
    trimmed.includes('\\"') &&
    !trimmed.startsWith("{") &&
    !trimmed.startsWith("[")
  ) {
    // Bare escaped content without outer quotes — try wrapping and unescaping
    try {
      const unescaped = JSON.parse(`"${trimmed}"`);
      if (typeof unescaped === "string") {
        normalized = unescaped;
      }
    } catch {
      // Not parseable — proceed with original
    }
  }

  try {
    const parser = new Parser(normalized);
    const value = parser.parseDocument();
    return { ok: true, value };
  } catch (err) {
    if (err instanceof ParseFailure) {
      return { ok: false, error: err.parseError };
    }
    // Defensive: convert any unexpected error into a ParseResult rather than
    // letting it escape, so `parse` never throws.
    return {
      ok: false,
      error: {
        message: err instanceof Error ? err.message : "Unknown parse error",
        line: 1,
        column: 1,
        offset: 0,
      },
    };
  }
}
