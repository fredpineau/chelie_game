import type { Plugin } from "vite";

/**
 * Test-only balancing for the opening of Crypte chlorophylle (BIOME 08).
 *
 * Economy, tower prices/upgrades, movement and pathfinding stay untouched.
 * Enemy HP and spawn pressure are eased only during the opening waves, then
 * return to the existing biome behaviour from wave 8 onward.
 */
export function crypteOpeningBalance(): Plugin {
  return {
    name: "crypte-opening-balance",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const hpAnchor = `    const hp = Math.round((56 + this.wave * 16 + this.levelIndex * 10) * level.healthMultiplier * (isBoss ? 10 : 1) * traitHealthMultiplier);`;
      if (!code.includes(hpAnchor)) {
        throw new Error("Crypte opening HP anchor not found.");
      }

      const hpReplacement = `    const crypteOpeningHealthMultiplier = this.levelIndex === 7\n      ? Phaser.Math.Linear(3.2, level.healthMultiplier, Phaser.Math.Clamp((this.wave - 1) / 7, 0, 1))\n      : level.healthMultiplier;\n    const hp = Math.round((56 + this.wave * 16 + this.levelIndex * 10) * crypteOpeningHealthMultiplier * (isBoss ? 10 : 1) * traitHealthMultiplier);`;

      // waveSpeedControl runs before this plugin and wraps the spawn interval
      // with / this.waveSpeedMultiplier. Target that transformed form so the
      // test balance stays compatible with the validated speed control.
      const spawnAnchor = `    const profileSpeed = profile === 3 ? 0.62 : profile === 1 ? 0.82 : 1;\n    this.nextSpawnAt = time + (Math.max(260, (1050 - this.wave * 50 - this.levelIndex * 40) * profileSpeed)) / this.waveSpeedMultiplier;`;
      if (!code.includes(spawnAnchor)) {
        throw new Error("Crypte opening spawn cadence anchor not found.");
      }

      const spawnReplacement = `    const profileSpeed = profile === 3 ? 0.62 : profile === 1 ? 0.82 : 1;\n    const normalSpawnInterval = Math.max(260, (1050 - this.wave * 50 - this.levelIndex * 40) * profileSpeed);\n    const crypteOpeningSpawnFloor = this.levelIndex === 7 && this.wave <= 7\n      ? Phaser.Math.Linear(700, 370, Phaser.Math.Clamp((this.wave - 1) / 7, 0, 1))\n      : 0;\n    this.nextSpawnAt = time + Math.max(normalSpawnInterval, crypteOpeningSpawnFloor) / this.waveSpeedMultiplier;`;

      let transformed = code.replace(hpAnchor, hpReplacement);
      transformed = transformed.replace(spawnAnchor, spawnReplacement);
      return { code: transformed, map: null };
    },
  };
}
