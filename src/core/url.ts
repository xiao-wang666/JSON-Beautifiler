/**
 * URL detection for the JSON Beautifier syntax highlighter.
 *
 * The tree view (TreeRow) renders string values that are valid URLs as
 * clickable links (`<a target="_blank" rel="noopener noreferrer">`). To keep
 * that rendering safe, only `http:` and `https:` URLs are treated as linkable.
 * Other schemes such as `javascript:`, `mailto:`, `ftp:` and `data:` are
 * intentionally rejected so they are never turned into clickable anchors.
 *
 * Requirements: 3.3
 */

/**
 * Return `true` if `s` is a valid, linkable URL.
 *
 * A string is considered linkable only when:
 * - it parses via the browser's `URL` constructor, and
 * - its protocol is exactly `http:` or `https:`.
 *
 * Leading/trailing whitespace is ignored. Empty (or whitespace-only) strings
 * return `false`. This function never throws.
 *
 * @example
 * isUrl("https://example.com")        // true
 * isUrl("http://example.com/a?b=1")   // true
 * isUrl("mailto:user@example.com")    // false
 * isUrl("javascript:alert(1)")        // false
 * isUrl("not a url")                  // false
 */
export function isUrl(s: string): boolean {
  if (typeof s !== "string") {
    return false;
  }
  const trimmed = s.trim();
  if (trimmed === "") {
    return false;
  }
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
