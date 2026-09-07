import type { Plugin } from "vite";

/**
 * Test-only movement isolation.
 *
 * Recalculate the complete active wave from the latest board state, but spread
 * the work across a few frames so flower placement does not freeze rendering.
 * A newer placement cancels the old queue and starts a fresh one.
 */
export function enemyRerouteAtomic(): Plugin {
  return {
    name: "enemy-reroute-atomic",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const anchor = `  private recalculateEnemyPaths(): void {\n    const version = ++this.pathRecalculationVersion;\n    const activeEnemies = [...this.enemies];\n    const enemiesPerFrame = 6;\n    activeEnemies.forEach((enemy, index) => {\n      const delay = 1 + Math.floor(index / enemiesPerFrame) * 16;\n      const recalculate = (): void => {\n        if (version !== this.pathRecalculationVersion || !enemy.body.active || !this.enemies.includes(enemy)) return;\n        this.recalculateEnemyPath(enemy);\n      };\n      this.time.delayedCall(delay, recalculate);\n    });\n  }`;

      const replacement = `  private recalculateEnemyPaths(): void {\n    const version = ++this.pathRecalculationVersion;\n    const activeEnemies = [...this.enemies];\n    const enemiesPerFrame = 4;\n\n    const processBatch = (startIndex: number): void => {\n      if (version !== this.pathRecalculationVersion) return;\n      const endIndex = Math.min(startIndex + enemiesPerFrame, activeEnemies.length);\n      for (let index = startIndex; index < endIndex; index += 1) {\n        const enemy = activeEnemies[index];\n        if (!enemy.body.active || !this.enemies.includes(enemy)) continue;\n        this.recalculateEnemyPath(enemy);\n      }\n      if (endIndex < activeEnemies.length) {\n        this.time.delayedCall(1, () => processBatch(endIndex));\n      }\n    };\n\n    this.time.delayedCall(1, () => processBatch(0));\n  }`;

      if (!code.includes(anchor)) {
        throw new Error("Atomic reroute anchor not found.");
      }

      return { code: code.replace(anchor, replacement), map: null };
    },
  };
}
