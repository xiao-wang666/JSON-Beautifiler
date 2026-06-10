import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false, // We already have public/manifest.webmanifest
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico,webmanifest}"],
      },
    }),
  ],
});
