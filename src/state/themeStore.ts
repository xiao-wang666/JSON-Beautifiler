/**
 * ThemeStore — persistence for the user's color theme preference.
 *
 * Backed by localStorage. Reads/writes never throw (storage may be
 * unavailable, full, or disabled in private mode), so callers can rely on a
 * best-effort contract:
 *   - `load()` returns the persisted theme, or `null` when nothing valid is
 *     stored. `null` signals the caller to default to `light`
 *     (Requirement 6.5).
 *   - `save(theme)` persists the preference (Requirement 6.3).
 *
 * Validates: Requirements 6.3, 6.4, 6.5
 */

export type Theme = "light" | "dark";

/** Stable localStorage key under which the theme preference is persisted. */
export const THEME_STORAGE_KEY = "json-beautifier-theme";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Read the persisted theme.
 *
 * @returns the stored {@link Theme} when a valid value is present, otherwise
 *   `null` (absent, invalid, or storage unavailable). A `null` result means
 *   the caller should fall back to the default `light` theme.
 */
export function load(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : null;
  } catch {
    return null;
  }
}

/**
 * Persist the given theme. Best-effort: any storage error is swallowed.
 */
export function save(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage unavailable (private mode / quota); persistence is best-effort.
  }
}
