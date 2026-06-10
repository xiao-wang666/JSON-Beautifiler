/**
 * ErrorBanner — overlay on the tree panel showing parse error info.
 *
 * Shows the error message along with line and column numbers when
 * `state.error` is not null. Renders nothing otherwise.
 *
 * Requirements: 5.1, 5.3
 */

import { ExclamationCircleOutlined } from "@ant-design/icons";
import { useAppContext } from "./appContext";

export function ErrorBanner() {
  const { state } = useAppContext();

  if (state.error === null) {
    return null;
  }

  return (
    <div className="jb-error-banner" role="alert">
      <ExclamationCircleOutlined style={{ fontSize: 32, opacity: 0.8 }} />
      <span className="jb-error-message">{state.error.message}</span>
      <span className="jb-error-position">
        第 {state.error.line} 行，第 {state.error.column} 列
      </span>
    </div>
  );
}
