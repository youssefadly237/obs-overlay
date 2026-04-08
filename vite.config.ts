import { defineConfig } from "vite";
import apiPlugin from "./src/server/api-plugin";

export default defineConfig({
  plugins: [apiPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        overlay: "overlay/index.html",
        controls: "controls/index.html",
        api: "api/index.html",
      },
    },
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    port: 50858,
  },
});
