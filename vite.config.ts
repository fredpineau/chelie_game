import { defineConfig, type UserConfig } from "vite";
import baseConfig from "./vite.base.config";
import { endgameProgression } from "./endgameProgressionPlugin";
import { endgameDropProgress } from "./endgameDropProgressPlugin";
import { preserveAccessibleInfiniteMode } from "./infiniteDifficultyPlugin";

const config = baseConfig as UserConfig;

export default defineConfig({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    endgameProgression(),
    endgameDropProgress(),
    preserveAccessibleInfiniteMode(),
  ],
});
