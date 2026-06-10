import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./components/App";

// Register Service Worker for offline App Shell (Requirement 9.4, 9.5, 9.6)
// Silent degradation: if registration fails (e.g., browser doesn't support SW),
// the app continues working as a normal web page.
try {
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch(() => {
      // Silent degradation — SW not supported or registration failed
    });
} catch {
  // Silent degradation — import not available
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
