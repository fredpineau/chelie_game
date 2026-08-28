import { defineConfig, type UserConfig } from "vite";
import baseConfig from "./vite.base.config";
import { endgameProgression } from "./endgameProgressionPlugin";

const config = baseConfig as UserConfig;

export default defineConfig({
  ...config,
  plugins: [...(config.plugins ?? []), endgameProgression()],
});
