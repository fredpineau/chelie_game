import type { Plugin } from "vite";

export function restoreStablePlacement16h(): Plugin {
  return {
    name: "restore-stable-placement-16h",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      let transformed = code;

      // Restore the exact path recalculation behavior used in the stable build
      // around 16:00. Do not alter snapping, collision, greenhouse or drops.
      transformed = transformed.replace(
        "    this.recalculateEnemyPaths(towerX, towerY);",
        "    this.recalculateEnemyPaths();",
      );

      const recalcStartAnchor = "  private recalculateEnemyPaths(urgentX?: number, urgentY?: number): void {";
      const recalcEndAnchor = "  private hasGridPath(";
      const recalcStart = transformed.indexOf(recalcStartAnchor);
      const recalcEnd = transformed.indexOf(recalcEndAnchor, recalcStart);

      if (recalcStart >= 0 && recalcEnd >= 0) {
        const stableRecalc = `  private recalculateEnemyPaths(): void {\n    const version = ++this.pathRecalculationVersion;\n    const activeEnemies = [...this.enemies];\n    const enemiesPerFrame = 6;\n    activeEnemies.forEach((enemy, index) => {\n      const delay = 1 + Math.floor(index / enemiesPerFrame) * 16;\n      const recalculate = (): void => {\n        if (version !== this.pathRecalculationVersion || !enemy.body.active || !this.enemies.includes(enemy)) return;\n        this.recalculateEnemyPath(enemy);\n      };\n      this.time.delayedCall(delay, recalculate);\n    });\n  }\n\n`;
        transformed = transformed.slice(0, recalcStart) + stableRecalc + transformed.slice(recalcEnd);
      }

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
