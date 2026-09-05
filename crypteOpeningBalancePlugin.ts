import type { Plugin } from "vite";

/**
 * Test-only balancing for the opening of Crypte chlorophylle (BIOME 08).
 *
 * Economy, tower prices/upgrades, spawn cadence, movement and pathfinding stay
 * untouched. Only enemy HP is eased during the first seven waves, then returns
 * to the existing biome multiplier from wave 8 onward.
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

      const replacement = `    const crypteOpeningHealthMultiplier = this.levelIndex === 7\n      ? Phaser.Math.Linear(3.2, level.healthMultiplier, Phaser.Math.Clamp((this.wave - 1) / 7, 0, 1))\n      : level.healthMultiplier;\n    const hp = Math.round((56 + this.wave * 16 + this.levelIndex * 10) * crypteOpeningHealthMultiplier * (isBoss ? 10 : 1) * traitHealthMultiplier);`;

      return { code: code.replace(hpAnchor, replacement), map: null };
    },
  };
}
