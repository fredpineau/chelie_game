import type { Plugin } from "vite";

/**
 * Test-only convenience: expose worlds 1-4 on the preview branch without
 * changing the player's persisted progression.
 */
export function testUnlockWorld4(): Plugin {
  return {
    name: "test-unlock-world-4",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const anchor = `  private getUnlockedLevel(): number {\n    try {\n      return Phaser.Math.Clamp(Number(localStorage.getItem("chelie-unlocked-level") ?? 0), 0, LEVELS.length - 1);\n    } catch {\n      return 0;\n    }\n  }`;

      const replacement = `  private getUnlockedLevel(): number {\n    try {\n      const savedLevel = Phaser.Math.Clamp(Number(localStorage.getItem("chelie-unlocked-level") ?? 0), 0, LEVELS.length - 1);\n      // Branche de test uniquement : BIOME 04 reste accessible sans modifier\n      // la progression persistée du joueur.\n      return Math.max(savedLevel, 3);\n    } catch {\n      return 3;\n    }\n  }`;

      if (!code.includes(anchor)) {
        throw new Error("Test world unlock anchor not found.");
      }

      return { code: code.replace(anchor, replacement), map: null };
    },
  };
}
