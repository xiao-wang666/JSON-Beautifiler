/**
 * appReducer — the pure application state machine for JSON Beautifier.
 *
 * This module owns the single source of truth for UI state and the transitions
 * between states. It is intentionally a **pure** reducer: it performs no side
 * effects. Debouncing of input and persistence to `localStorage` happen in the
 * component layer; the reducer only computes the next {@link AppState} from the
 * current state and an {@link Action}.
 *
 * Design decision (design.md lists `setInput`, `parseSuccess`, `parseError`):
 * we collapse those into a single `setInput` action that runs the (pure,
 * non-throwing) {@link parse} internally and produces the resulting state. This
 * keeps the reducer total and the component layer trivial (it just dispatches
 * the raw text after debouncing). The success/failure branches implement the
 * "parseSuccess" / "parseError" semantics described in the design:
 *   - success: replace `model`, clear `error`, RESET expansion (Requirement 4.2)
 *   - failure: keep the previous `model` and expansion, record `error`
 *     (Requirements 5.1, 5.3)
 *
 * Requirements: 4.2, 4.4, 4.5, 5.1, 5.3, 6.2
 */

import type { JsonPath, JsonValue, ParseError } from "../core/model";
import { serializePath } from "../core/model";
import { parse } from "../core/parser";
import { ancestorsOf, findMatches } from "../core/search";
import type { Theme } from "./themeStore";

/** Search sub-state: the query, all match paths, and the current selection. */
export type SearchState = {
  /** The current search query (verbatim; not trimmed). */
  query: string;
  /** Paths of all matching nodes, in DFS order. */
  matches: JsonPath[];
  /** Index into `matches` of the current selection; `-1` when there are none. */
  currentIndex: number;
};

/** The complete application state. */
export type AppState = {
  /** The current text in the input area. */
  inputText: string;
  /** The most recent *successful* parse result (kept across later failures). */
  model: JsonValue | null;
  /** The current parse error, or `null`. A failure does NOT clear `model`. */
  error: ParseError | null;
  /** Serialized paths of collapsed containers (default: empty = all expanded). */
  collapsedPaths: Set<string>;
  /** The active color theme. */
  theme: Theme;
  /** Search query, matches and current selection. */
  search: SearchState;
};

/** Actions the reducer understands. A discriminated union keyed by `type`. */
export type Action =
  /** Replace the input text and re-parse it (success resets expansion). */
  | { type: "setInput"; text: string }
  /** Toggle the collapsed state of a single container path. */
  | { type: "toggle"; path: JsonPath }
  /** Expand every node (clear all collapsed paths). */
  | { type: "expandAll" }
  /** Collapse every container in the current model. */
  | { type: "collapseAll" }
  /** Set the search query and recompute matches. */
  | { type: "setQuery"; query: string }
  /** Move the current match forward (wraps around). */
  | { type: "nextMatch" }
  /** Move the current match backward (wraps around). */
  | { type: "prevMatch" }
  /** Set the active theme. */
  | { type: "setTheme"; theme: Theme };

/** An empty search sub-state (no query, no matches). */
function emptySearch(): SearchState {
  return { query: "", matches: [], currentIndex: -1 };
}

/**
 * Build the initial application state for a given starting theme. The theme is
 * supplied by the component layer (which reads it from {@link themeStore} and
 * falls back to `light`). The model starts empty (as if the input were blank).
 */
export function createInitialState(theme: Theme = "light"): AppState {
  return {
    inputText: "",
    model: null,
    error: null,
    collapsedPaths: new Set<string>(),
    theme,
    search: emptySearch(),
  };
}

/** Convenience default initial state (light theme, empty input). */
export const initialState: AppState = createInitialState("light");

/**
 * Collect the serialized paths of every container (`object` / `array`) node in
 * the tree. Used by `collapseAll` to collapse all containers (Requirement 4.4).
 */
function allContainerPaths(model: JsonValue | null): Set<string> {
  const paths = new Set<string>();
  if (model === null) {
    return paths;
  }

  const visit = (value: JsonValue, path: JsonPath): void => {
    if (value.kind === "object") {
      paths.add(serializePath(path));
      for (const entry of value.entries) {
        visit(entry.value, [...path, entry.key]);
      }
    } else if (value.kind === "array") {
      paths.add(serializePath(path));
      for (let i = 0; i < value.items.length; i++) {
        visit(value.items[i]!, [...path, i]);
      }
    }
  };

  visit(model, []);
  return paths;
}

/**
 * Recompute the search sub-state for a model + query, and return the new search
 * state alongside a collapse set that has every match's ancestors expanded
 * (removed). This implements both match recomputation (Requirement 7.2) and the
 * visibility closure that keeps matches visible (Requirement 7.3).
 */
function computeSearch(
  model: JsonValue | null,
  query: string,
  collapsedPaths: Set<string>,
): { search: SearchState; collapsedPaths: Set<string> } {
  const matches = findMatches(model, query);
  const search: SearchState = {
    query,
    matches,
    currentIndex: matches.length > 0 ? 0 : -1,
  };

  // Expand (remove from the collapsed set) every ancestor of every match so the
  // matches are guaranteed visible.
  let nextCollapsed = collapsedPaths;
  if (matches.length > 0 && collapsedPaths.size > 0) {
    nextCollapsed = new Set(collapsedPaths);
    for (const match of matches) {
      for (const ancestor of ancestorsOf(match)) {
        nextCollapsed.delete(serializePath(ancestor));
      }
    }
  }

  return { search, collapsedPaths: nextCollapsed };
}

/**
 * The pure application reducer. Computes the next {@link AppState} from the
 * current state and an {@link Action}. No side effects.
 */
export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "setInput": {
      const result = parse(action.text);

      if (!result.ok) {
        // Parse failure: keep the previous model and expansion, record the
        // error, but adopt the new (invalid) input text (Requirements 5.1, 5.3).
        return {
          ...state,
          inputText: action.text,
          error: result.error,
        };
      }

      // Parse success: replace the model, clear the error, and RESET expansion
      // so the new tree starts fully expanded (Requirement 4.2).
      const model = result.value;
      const { search, collapsedPaths } = computeSearch(
        model,
        state.search.query,
        new Set<string>(),
      );
      return {
        ...state,
        inputText: action.text,
        model,
        error: null,
        collapsedPaths,
        search,
      };
    }

    case "toggle": {
      const key = serializePath(action.path);
      const collapsedPaths = new Set(state.collapsedPaths);
      if (collapsedPaths.has(key)) {
        collapsedPaths.delete(key);
      } else {
        collapsedPaths.add(key);
      }
      return { ...state, collapsedPaths };
    }

    case "expandAll": {
      // Everything expanded == empty collapsed set (Requirement 4.5).
      if (state.collapsedPaths.size === 0) {
        return state;
      }
      return { ...state, collapsedPaths: new Set<string>() };
    }

    case "collapseAll": {
      // Collapse every container in the current model (Requirement 4.4).
      return { ...state, collapsedPaths: allContainerPaths(state.model) };
    }

    case "setQuery": {
      const { search, collapsedPaths } = computeSearch(
        state.model,
        action.query,
        state.collapsedPaths,
      );
      return { ...state, search, collapsedPaths };
    }

    case "nextMatch": {
      const { matches, currentIndex } = state.search;
      if (matches.length === 0) {
        return state;
      }
      const nextIndex = (currentIndex + 1) % matches.length;
      return {
        ...state,
        search: { ...state.search, currentIndex: nextIndex },
      };
    }

    case "prevMatch": {
      const { matches, currentIndex } = state.search;
      if (matches.length === 0) {
        return state;
      }
      // `+ matches.length` keeps the modulo non-negative when wrapping past 0.
      const prevIndex = (currentIndex - 1 + matches.length) % matches.length;
      return {
        ...state,
        search: { ...state.search, currentIndex: prevIndex },
      };
    }

    case "setTheme": {
      // Set the active theme (Requirement 6.2). Persistence happens in the
      // component layer via themeStore.save.
      if (state.theme === action.theme) {
        return state;
      }
      return { ...state, theme: action.theme };
    }

    default: {
      // Exhaustiveness guard: if a new action type is added without a handler,
      // TypeScript flags this assignment.
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
