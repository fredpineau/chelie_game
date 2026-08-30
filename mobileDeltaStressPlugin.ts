import type { Plugin } from "vite";

/**
 * Test-only plugin: while a plant is selected, group battle updates at roughly
 * 8 FPS instead of 20 FPS so desktop testing reproduces large mobile deltas.
 */
export function mobileDeltaStress(): Plugin {
  return {
    name: "mobile-delta-stress",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const anchor = "      if (this.placementBattleDelta < 50) return;";
      const replacement = "      if (this.placementBattleDelta < 125) return;";
      if (!code.includes(anchor)) {
        throw new Error("Mobile delta stress anchor not found.");
      }

      return { code: code.replace(anchor, replacement), map: null };
    },
  };
}
