import type { Plugin } from "vite";

/**
 * Test-only helper used on the pathfinding validation branch.
 * It unlocks every biome so routing regressions can be reproduced directly
 * without changing persistent player progression or touching main.
 */
export function testWorldUnlock(): Plugin {
  return {
    name: "test-world-unlock",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const anchor = `  private getUnlockedLevel(): number {\n    try {\n      return Phaser.Math.Clamp(Number(localStorage.getItem(\"chelie-unlocked-level\") ?? 0), 0, LEVELS.length - 1);\n    } catch {\n      return 0;\n    }\n  }`;
      const replacement = `  private getUnlockedLevel(): number {\n    return LEVELS.length - 1;\n  }`;

      if (!code.includes(anchor)) {
        throw new Error("Test world unlock anchor not found.");
      }

      return { code: code.replace(anchor, replacement), map: null };
    },
  };
}
