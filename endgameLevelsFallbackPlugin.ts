import type { Plugin } from "vite";

export function endgameLevelsFallback(): Plugin {
  return {
    name: "endgame-levels-fallback",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;
      if (code.includes('code: "BIOME 15"')) return null;

      // Ancre stable : on repère la ligne MODE INFINI sans dépendre de ses
      // multiplicateurs, qui peuvent évoluer avec l'équilibrage du jeu.
      const infiniteLinePattern = /^  \{ name: "Floraison éternelle", code: "MODE INFINI", waves: null,[^\n]+\},$/m;
      if (!infiniteLinePattern.test(code)) return null;

      const replacement = [
        '  { name: "Marais fracturé", code: "BIOME 12", waves: 48, healthMultiplier: 6.00, speedMultiplier: 1.64, swarmBonus: 22 },',
        '  { name: "Essaim chimérique", code: "BIOME 13", waves: 50, healthMultiplier: 6.55, speedMultiplier: 1.68, swarmBonus: 24 },',
        '  { name: "Ruche des alphas", code: "BIOME 14", waves: 55, healthMultiplier: 7.15, speedMultiplier: 1.72, swarmBonus: 26 },',
        '  { name: "Nexus carnivore", code: "BIOME 15", waves: 60, healthMultiplier: 7.80, speedMultiplier: 1.76, swarmBonus: 28 },',
        '  { name: "Floraison éternelle", code: "MODE INFINI", waves: null, healthMultiplier: 8.60, speedMultiplier: 1.86, swarmBonus: 30 },',
      ].join("\n");

      return { code: code.replace(infiniteLinePattern, replacement), map: null };
    },
  };
}
