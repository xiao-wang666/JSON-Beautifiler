// JSON Beautifier —— 原生 macOS 壳（WKWebView）
//
// 一个真正的原生窗口，用 WebKit 加载 .app 里内嵌的自包含 HTML。
// 不依赖 Chrome、不起任何服务器、没有浏览器地址栏/标签栏。
//
// 支持「新建窗口」：网页里点击“新建窗口”会通过 JS 消息通知原生层，原生层再开一个
// 同样的原生窗口（多开对比）。网页里的外部链接（target=_blank）则用系统默认浏览器打开。
import Cocoa
import WebKit

final class AppController: NSObject, NSApplicationDelegate, WKNavigationDelegate,
    WKUIDelegate, WKScriptMessageHandler, NSWindowDelegate
{
    var windows: [NSWindow] = []
    var resURL: URL!
    var htmlURL: URL!
    private var debugDone = false

    private func debugLog(_ s: String) {
        if ProcessInfo.processInfo.environment["JB_DEBUG"] == "1" {
            FileHandle.standardError.write((s + "\n").data(using: .utf8)!)
        }
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        resURL =
            Bundle.main.resourceURL
            ?? URL(fileURLWithPath: CommandLine.arguments[0])
                .deletingLastPathComponent()
                .deletingLastPathComponent()
                .appendingPathComponent("Resources")
        htmlURL = resURL.appendingPathComponent("JSON-Beautifier.html")

        setupMenu()
        openNewWindow()
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
    }

    // 菜单栏：提供 Cmd+N「新建窗口」、Cmd+Q 退出、以及标准编辑快捷键
    // （Cmd+C/V/X/A/Z），否则 WKWebView 里连复制粘贴都用不了。
    func setupMenu() {
        let mainMenu = NSMenu()

        // 应用菜单
        let appItem = NSMenuItem()
        mainMenu.addItem(appItem)
        let appMenu = NSMenu()
        appItem.submenu = appMenu
        appMenu.addItem(
            withTitle: "隐藏 JSON Beautifier",
            action: Selector(("hide:")), keyEquivalent: "h")
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(
            withTitle: "退出 JSON Beautifier",
            action: Selector(("terminate:")), keyEquivalent: "q")

        // 文件菜单：新建窗口(Cmd+N) / 关闭窗口(Cmd+W)
        let fileItem = NSMenuItem()
        mainMenu.addItem(fileItem)
        let fileMenu = NSMenu(title: "文件")
        fileItem.submenu = fileMenu
        let newItem = NSMenuItem(
            title: "新建窗口", action: #selector(newWindowAction(_:)), keyEquivalent: "n")
        newItem.keyEquivalentModifierMask = [.command]
        newItem.target = self
        fileMenu.addItem(newItem)
        fileMenu.addItem(
            withTitle: "关闭窗口",
            action: Selector(("performClose:")), keyEquivalent: "w")

        // 编辑菜单：标准编辑动作（走响应链，WKWebView 会响应）
        let editItem = NSMenuItem()
        mainMenu.addItem(editItem)
        let editMenu = NSMenu(title: "编辑")
        editItem.submenu = editMenu
        editMenu.addItem(withTitle: "撤销", action: Selector(("undo:")), keyEquivalent: "z")
        let redo = editMenu.addItem(
            withTitle: "重做", action: Selector(("redo:")), keyEquivalent: "z")
        redo.keyEquivalentModifierMask = [.command, .shift]
        editMenu.addItem(NSMenuItem.separator())
        editMenu.addItem(withTitle: "剪切", action: Selector(("cut:")), keyEquivalent: "x")
        editMenu.addItem(withTitle: "拷贝", action: Selector(("copy:")), keyEquivalent: "c")
        editMenu.addItem(withTitle: "粘贴", action: Selector(("paste:")), keyEquivalent: "v")
        editMenu.addItem(withTitle: "全选", action: Selector(("selectAll:")), keyEquivalent: "a")

        NSApp.mainMenu = mainMenu
    }

    @objc func newWindowAction(_ sender: Any?) {
        openNewWindow()
    }

    @discardableResult
    func openNewWindow() -> WKWebView {
        let frame = NSRect(x: 0, y: 0, width: 1200, height: 800)
        let window = NSWindow(
            contentRect: frame,
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "JSON Beautifier"
        window.isReleasedWhenClosed = false
        window.delegate = self
        // 多窗口时错开位置，避免完全重叠
        if let last = windows.last {
            let o = last.frame.origin
            window.setFrameOrigin(NSPoint(x: o.x + 28, y: o.y - 28))
        } else {
            window.center()
        }

        let config = WKWebViewConfiguration()
        config.preferences.javaScriptCanOpenWindowsAutomatically = true
        let ucc = WKUserContentController()
        ucc.add(self, name: "jbNewWindow")
        config.userContentController = ucc

        let webView = WKWebView(frame: frame, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.autoresizingMask = [.width, .height]
        window.contentView = webView
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        windows.append(window)

        webView.loadFileURL(htmlURL, allowingReadAccessTo: resURL)
        return webView
    }

    // 网页“新建窗口”按钮 -> 原生开新窗口
    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        if message.name == "jbNewWindow" {
            debugLog("GOT_MESSAGE jbNewWindow")
            openNewWindow()
        }
    }

    // 外部链接（target=_blank / window.open 到 http(s)）交给系统默认浏览器
    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url,
            url.scheme == "http" || url.scheme == "https"
        {
            NSWorkspace.shared.open(url)
        }
        return nil
    }

    func windowWillClose(_ notification: Notification) {
        if let w = notification.object as? NSWindow {
            windows.removeAll { $0 == w }
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }

    // ---- 调试：JB_DEBUG=1 时，加载完成后点一下“新建窗口”并检查窗口数 ----
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard ProcessInfo.processInfo.environment["JB_DEBUG"] == "1", !debugDone else { return }
        debugDone = true
        // 检查菜单里是否存在 Cmd+N「新建窗口」项
        var hasNewMenu = false
        if let items = NSApp.mainMenu?.items {
            for it in items {
                if let sub = it.submenu {
                    for m in sub.items where m.keyEquivalent == "n"
                        && m.keyEquivalentModifierMask == [.command]
                    {
                        hasNewMenu = true
                    }
                }
            }
        }
        debugLog("MENU_CMD_N=\(hasNewMenu)")
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            // 模拟 Ctrl+N：应触发网页里的 keydown 监听 -> postMessage -> 原生开新窗口
            webView.evaluateJavaScript(
                "window.dispatchEvent(new KeyboardEvent('keydown',{key:'n',ctrlKey:true,bubbles:true}));'DISPATCHED'"
            ) { r, e in
                self.debugLog("CTRL_N_DISPATCH=\(r ?? "nil") err=\(String(describing: e))")
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
                    self.debugLog("WINDOWS=\(self.windows.count)")
                    NSApp.terminate(nil)
                }
            }
        }
    }
}

let app = NSApplication.shared
let controller = AppController()
app.delegate = controller
app.run()
