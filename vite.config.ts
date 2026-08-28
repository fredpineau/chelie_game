import { defineConfig, type UserConfig } from "vite";
import baseConfig from "./vite.base.config";
import { endgameProgression } from "./endgameProgressionPlugin";
import { endgameDropProgress } from "./endgameDropProgressPlugin";
import { preserveAccessibleInfiniteMode } from "./infiniteDifficultyPlugin";
import { clearMasteryDisplay } from "./masteryDisplayPlugin";
import { simplifyHomeProgression } from "./homeSimplificationPlugin";
import { fixSimplifiedHomeLayering } from "./homeSimplificationLayerFixPlugin";
import { polishWorldSelection } from "./worldSelectPolishPlugin";
import { greenhouseFixedOutline } from "./greenhouseFixedOutlinePlugin";
import { polishGreenhouseLayout } from "./greenhouseLayoutPolishPlugin";
import { restoreStablePlacement16h } from "./placementRestore16hPlugin";

const config = baseConfig as UserConfig;

export default defineConfig({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    endgameProgression(),
    endgameDropProgress(),
    preserveAccessibleInfiniteMode(),
    simplifyHomeProgression(),
    fixSimplifiedHomeLayering(),
    clearMasteryDisplay(),
    polishWorldSelection(),
    greenhouseFixedOutline(),
    polishGreenhouseLayout(),
    restoreStablePlacement16h(),
  ],
});
