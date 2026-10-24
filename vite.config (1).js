import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset paths, so the built page works from any folder (GitHub Pages project sites live in /repo-name/)
  base: "./",
  server: {
    // lets a tunnel (cloudflared / ngrok) reach the dev server while you test inside Discord
    allowedHosts: true,
  },
});
