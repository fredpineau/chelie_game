import { defineConfig } from "vite";
import baseConfig from "./vite.config";
import { clearMasteryDisplay } from "./masteryDisplayPlugin";
import { endgameDropProgress } from "./endgameDropProgressPlugin";
import { endgameLevelsFallback } from "./endgameLevelsFallbackPlugin";
import { endgameProgression } from "./endgameProgressionPlugin";
import { greenhouseMapButton } from "./greenhouseMapButtonPlugin";
import { wateringGuideMastery } from "./wateringGuideMasteryPlugin";
import { worldSelectionSpacing } from "./worldSelectionSpacingPlugin";
import { worldVisualIdentity } from "./worldVisualIdentityPlugin";
import { waveCounterDisplay } from "./waveCounterDisplayPlugin";

export default defineConfig({
  ...baseConfig,
  plugins: [
    ...(baseConfig.plugins ?? []),
    endgameProgression(),
    endgameLevelsFallback(),
    endgameDropProgress(),
    clearMasteryDisplay(),
    greenhouseMapButton(),
    wateringGuideMastery(),
    worldSelectionSpacing(),
    worldVisualIdentity(),
    waveCounterDisplay(),
  ],
});
