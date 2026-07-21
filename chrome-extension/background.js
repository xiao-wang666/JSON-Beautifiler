/**
 * JSON Beautifier — 扩展后台 Service Worker（MV3）
 *
 * 行为：点击工具栏图标时，以弹出窗口（popup 窗口）打开扩展内置的打包版
 * app/index.html。
 *
 * 不再探测任何本地端口 —— 无论 3000 上是否有别的项目在跑，点图标永远打开
 * 本扩展自带的 JSON Beautifier，绝不会串到其它项目。
 */

const PACKAGED_URL = chrome.runtime.getURL("app/index.html");

const POPUP = { type: "popup", width: 1200, height: 800 };

async function openBeautifier() {
  try {
    await chrome.windows.create({ url: PACKAGED_URL, ...POPUP });
  } catch (err) {
    // 兜底：极少数环境下 windows.create 失败时退化为新标签页
    console.error("[JSON Beautifier] open failed, falling back to tab:", err);
    await chrome.tabs.create({ url: PACKAGED_URL });
  }
}

chrome.action.onClicked.addListener(() => {
  void openBeautifier();
});
