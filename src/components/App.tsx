/**
 * App 容器组件。
 *
 * 职责：
 * - 接入 `appReducer`（useReducer），并通过 React Context 向子组件暴露
 *   `{ state, dispatch }`（Requirement 6.1 等后续交互的状态来源）。
 *   Context 本身定义在 `./appContext`，以保证本文件只导出组件。
 * - 启动时从 `themeStore` 读取主题，有则应用，无则默认 `light`
 *   （Requirements 6.4、6.5）。
 * - 将主题以 `data-theme` 属性挂在根元素上，配合 `theme.css` 的 CSS 变量驱动
 *   配色同步切换；主题变化时通过 `themeStore.save` 持久化（Requirement 6.3）。
 * - 渲染最小但结构化的布局骨架，为输入区、工具栏、搜索、树视图预留占位插槽，
 *   供后续任务填充。
 *
 * Requirements: 6.1, 6.4, 6.5
 */

import { useEffect, useReducer } from "react";
import { ConfigProvider, theme as antdTheme } from "antd";
import {
  appReducer,
  createInitialState,
  type AppState,
} from "../state/appReducer";
import * as themeStore from "../state/themeStore";
import { openNewAppWindow } from "../core/newWindow";
import { AppContext } from "./appContext";
import { ErrorBanner } from "./ErrorBanner";
import { InputPanel } from "./InputPanel";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { SearchBar } from "./SearchBar";
import { Toolbar } from "./Toolbar";
import { TreeView } from "./TreeView";
import "./theme.css";

/**
 * Build the initial reducer state, reading the persisted theme on startup and
 * falling back to `light` when nothing valid is stored (Requirements 6.4, 6.5).
 */
function initApp(): AppState {
  return createInitialState(themeStore.load() ?? "light");
}

export function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, initApp);

  // Persist the theme whenever it changes (Requirement 6.3). Runs on mount too,
  // which harmlessly re-saves the startup theme.
  useEffect(() => {
    themeStore.save(state.theme);
  }, [state.theme]);

  // 快捷键新建窗口：Cmd+N（原生 App 由菜单处理）/ Ctrl+N。
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        openNewAppWindow();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const algorithm =
    state.theme === "dark"
      ? antdTheme.darkAlgorithm
      : antdTheme.defaultAlgorithm;

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <ConfigProvider
        theme={{
          algorithm,
          token: { colorPrimary: "#0969da", borderRadius: 6 },
        }}
      >
        {/* Theme applied as a data-attribute; theme.css maps it to CSS vars. */}
        <div className="jb-app" data-theme={state.theme}>
          <header className="jb-header">
            <Logo />
            <span className="jb-logo-text">JSON Beautifier</span>
            {/* Toolbar: copy / expand-all / collapse-all (Requirements 4.3, 4.4, 4.5). */}
            <Toolbar />
            {/* Search bar: query input + match navigation (Requirements 7.1–7.6). */}
            <SearchBar />
            {/* ThemeToggle (Requirements 6.1, 6.2, 6.3). */}
            <span style={{ marginLeft: "auto" }}>
              <ThemeToggle />
            </span>
          </header>

          <main className="jb-main">
            <div className="jb-panels">
              {/* Input panel: textarea. */}
              <section className="jb-input-slot" aria-label="输入区">
                <InputPanel />
              </section>

              {/* Tree slot: tree view + error overlay. */}
              <section className="jb-tree-slot" aria-label="展示区">
                <TreeView />
                <ErrorBanner />
              </section>
            </div>
          </main>
        </div>
      </ConfigProvider>
    </AppContext.Provider>
  );
}
