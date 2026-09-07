import type { Plugin } from "vite";

/**
 * Test-only movement isolation.
 *
 * A plant placement must never leave only part of the active wave recalculated.
 * Coalesce repeated placement requests and recalculate the whole current wave
 * from the same latest board state in one callback.
 */
export function enemyRerouteAtomic(): Plugin {
  return {
    name: "enemy-reroute-atomic",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const anchor = `  private recalculateEnemyPaths(): void {\n    const version = ++this.pathRecalculationVersion;\n    const activeEnemies = [...this.enemies];\n    const enemiesPerFrame = 6;\n    activeEnemies.forEach((enemy, index) => {\n      const delay = 1 + Math.floor(index / enemiesPerFrame) * 16;\n      const recalculate = (): void => {\n        if (version !== this.pathRecalculationVersion || !enemy.body.active || !this.enemies.includes(enemy)) return;\n        this.recalculateEnemyPath(enemy);\n      };\n      this.time.delayedCall(delay, recalculate);\n    });\n  }`;

      const replacement = `  private recalculateEnemyPaths(): void {\n    const version = ++this.pathRecalculationVersion;\n    this.time.delayedCall(1, () => {\n      // If another plant was placed meanwhile, only the newest board state wins.\n      if (version !== this.pathRecalculationVersion) return;\n      const activeEnemies = [...this.enemies];\n      for (const enemy of activeEnemies) {\n        if (!enemy.body.active || !this.enemies.includes(enemy)) continue;\n        this.recalculateEnemyPath(enemy);\n      }\n    });\n  }`;

      if (!code.includes(anchor)) {
        throw new Error("Atomic reroute anchor not found.");
      }

      return { code: code.replace(anchor, replacement), map: null };
    },
  };
}
