import { defineConfig } from "vite";
import baseConfig from "./vite.config";
import { clearMasteryDisplay } from "./masteryDisplayPlugin";
import { endgameDropProgress } from "./endgameDropProgressPlugin";

export default defineConfig({
  ...baseConfig,
  plugins: [
    ...(baseConfig.plugins ?? []),
    endgameDropProgress(),
    clearMasteryDisplay(),
  ],
});
