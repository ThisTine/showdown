import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forwarded to the Go backend once it exists.
      "/ws": {
        target: "ws://localhost:8080",
        ws: true,
      },
    },
  },
});
