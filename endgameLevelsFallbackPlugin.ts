import type { Plugin } from "vite";

export function endgameLevelsFallback(): Plugin {
  return {
    name: "endgame-levels-fallback",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;
      if (code.includes('code: "BIOME 15"')) return null;

      const infiniteLine = '  { name: "Floraison éternelle", code: "MODE INFINI", waves: null, healthMultiplier: 6.40, speedMultiplier: 1.72, swarmBonus: 24 },';
      if (!code.includes(infiniteLine)) return null;

      const replacement = [
        '  { name: "Marais fracturé", code: "BIOME 12", waves: 48, healthMultiplier: 6.15, speedMultiplier: 1.69, swarmBonus: 24 },',
        '  { name: "Essaim chimérique", code: "BIOME 13", waves: 50, healthMultiplier: 6.75, speedMultiplier: 1.73, swarmBonus: 25 },',
        '  { name: "Ruche des alphas", code: "BIOME 14", waves: 55, healthMultiplier: 7.40, speedMultiplier: 1.77, swarmBonus: 27 },',
        '  { name: "Nexus carnivore", code: "BIOME 15", waves: 60, healthMultiplier: 8.10, speedMultiplier: 1.82, swarmBonus: 29 },',
        '  { name: "Floraison éternelle", code: "MODE INFINI", waves: null, healthMultiplier: 8.60, speedMultiplier: 1.86, swarmBonus: 30 },',
      ].join("\n");

      return { code: code.replace(infiniteLine, replacement), map: null };
    },
  };
}
