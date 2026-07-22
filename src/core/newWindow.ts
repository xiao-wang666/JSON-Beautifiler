/**
 * 打开一个新的 JSON Beautifier 窗口（多开对比）。
 *
 * - 在原生桌面 App（WKWebView）里：window.open 不生效，改为通过 JS 消息通知
 *   原生层去开一个新的原生窗口。
 * - 在普通浏览器 / 单文件 HTML 里：走 window.open 开新浏览器窗口。
 */
export function openNewAppWindow(): void {
  const bridge = (
    window as unknown as {
      webkit?: {
        messageHandlers?: Record<string, { postMessage: (m: unknown) => void }>;
      };
    }
  ).webkit?.messageHandlers?.jbNewWindow;

  if (bridge) {
    bridge.postMessage("open");
    return;
  }

  window.open(
    window.location.href,
    "_blank",
    "noopener,noreferrer,width=1200,height=800",
  );
}
