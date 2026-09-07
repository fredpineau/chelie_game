import { defineConfig } from "vite";
import baseConfig from "./vite.config";
import { alphaDropBonus } from "./alphaDropBonusPlugin";
import { betaVersionDisplay } from "./betaVersionPlugin";
import { bottomExitPlacementClearance } from "./bottomExitPlacementClearancePlugin";
import { clearMasteryDisplay } from "./masteryDisplayPlugin";
import { combatVisualPolish } from "./combatVisualPolishPlugin";
import { crypteOpeningBalance } from "./crypteOpeningBalancePlugin";
import { deferredEnemyReroute } from "./deferredEnemyReroutePlugin";
import { endgameDropProgress } from "./endgameDropProgressPlugin";
import { endgameLevelsFallback } from "./endgameLevelsFallbackPlugin";
import { endgameProgression } from "./endgameProgressionPlugin";
import { greenhouseMapButton } from "./greenhouseMapButtonPlugin";
import { pathfindingStability } from "./pathfindingStabilityPlugin";
import { wateringGuideMastery } from "./wateringGuideMasteryPlugin";
import { waveSpeedControl } from "./waveSpeedControlPlugin";
import { worldSelectionSpacing } from "./worldSelectionSpacingPlugin";
import { worldVisualIdentity } from "./worldVisualIdentityPlugin";
import { waveCounterDisplay } from "./waveCounterDisplayPlugin";
import { world2CanopyVisual } from "./world2CanopyVisualPlugin";

export default defineConfig({
  ...baseConfig,
  plugins: [
    ...(baseConfig.plugins ?? []),
    betaVersionDisplay(),
    endgameProgression(),
    endgameLevelsFallback(),
    endgameDropProgress(),
    clearMasteryDisplay(),
    greenhouseMapButton(),
    wateringGuideMastery(),
    worldSelectionSpacing(),
    worldVisualIdentity(),
    waveCounterDisplay(),
    world2CanopyVisual(),
    combatVisualPolish(),
    deferredEnemyReroute(),
    pathfindingStability(),
    alphaDropBonus(),
    waveSpeedControl(),
    bottomExitPlacementClearance(),
    crypteOpeningBalance(),
  ],
});
