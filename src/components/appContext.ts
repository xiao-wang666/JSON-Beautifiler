/**
 * Application React context.
 *
 * Kept in its own module (separate from App.tsx) so that App.tsx only exports
 * components — this satisfies the `react-refresh/only-export-components` lint
 * rule and keeps Fast Refresh working reliably.
 *
 * Exposes the reducer `state` and `dispatch` to descendant components via
 * {@link useAppContext}.
 */

import { createContext, useContext, type Dispatch } from "react";
import type { Action, AppState } from "../state/appReducer";

/** The value exposed to descendants via {@link AppContext}. */
export type AppContextValue = {
  state: AppState;
  dispatch: Dispatch<Action>;
};

/**
 * Application context carrying the reducer state and dispatch.
 *
 * Defaults to `null` so {@link useAppContext} can detect usage outside a
 * provider and fail loudly rather than silently handing back a stale value.
 */
export const AppContext = createContext<AppContextValue | null>(null);

/**
 * Access the app-level `{ state, dispatch }`.
 *
 * @throws if called outside of an `<App>` (provider) subtree.
 */
export function useAppContext(): AppContextValue {
  const value = useContext(AppContext);
  if (value === null) {
    throw new Error("useAppContext must be used within an <App> provider");
  }
  return value;
}
