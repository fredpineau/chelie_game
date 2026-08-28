import type { Plugin } from "vite";

export function preserveAccessibleInfiniteMode(): Plugin {
  return {
    name: "preserve-accessible-infinite-mode",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;
      const oldInfinite = '{ name: "Floraison éternelle", code: "MODE INFINI", waves: null, healthMultiplier: 8.60, speedMultiplier: 1.86, swarmBonus: 30 }';
      const balancedInfinite = '{ name: "Floraison éternelle", code: "MODE INFINI", waves: null, healthMultiplier: 6.40, speedMultiplier: 1.72, swarmBonus: 24 }';
      if (!code.includes(oldInfinite)) return null;
      return { code: code.replace(oldInfinite, balancedInfinite), map: null };
    },
  };
}
