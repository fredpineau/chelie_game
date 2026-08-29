import { defineConfig } from "vite";
import baseConfig from "./vite.config";
import { clearMasteryDisplay } from "./masteryDisplayPlugin";

export default defineConfig({
  ...baseConfig,
  plugins: [
    ...(baseConfig.plugins ?? []),
    clearMasteryDisplay(),
  ],
});
