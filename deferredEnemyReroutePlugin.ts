import type { Plugin } from "vite";

/**
 * Defers rerouting of moving enemies until they reach their current waypoint.
 * If a newly placed plant blocks the segment currently being travelled, the
 * enemy immediately recalculates from its current position without being
 * teleported backward.
 */
export function deferredEnemyReroute(): Plugin {
  return {
    name: "deferred-enemy-reroute",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const fieldAnchor = "  private pathRecalculationVersion = 0;";
      const fieldReplacement = `  private pathRecalculationVersion = 0;\n  private pendingEnemyReroutes = new WeakSet<Enemy>();`;
      if (!code.includes(fieldAnchor)) {
        throw new Error("Deferred reroute field anchor not found.");
      }

      const followPathAnchor = `  private followPath(enemy: Enemy, delta: number, speed: number): void {\n    const target = enemy.path[enemy.pathIndex];\n    if (!target) {\n      this.recalculateEnemyPath(enemy);\n      return;\n    }\n\n    const distance = Phaser.Math.Distance.Between(enemy.body.x, enemy.body.y, target.x, target.y);\n    const step = speed * (delta / 1000);\n    if (distance <= step) {\n      enemy.body.setPosition(target.x, target.y);\n      enemy.pathIndex += 1;\n      return;\n    }\n    enemy.body.x += ((target.x - enemy.body.x) / distance) * step;\n    enemy.body.y += ((target.y - enemy.body.y) / distance) * step;\n  }`;

      const followPathReplacement = `  private followPath(enemy: Enemy, delta: number, speed: number): void {\n    const target = enemy.path[enemy.pathIndex];\n    if (!target) {\n      this.pendingEnemyReroutes.delete(enemy);\n      this.recalculateEnemyPath(enemy);\n      return;\n    }\n\n    if (this.pendingEnemyReroutes.has(enemy)) {\n      const halfPlant = PLANT_FRAME_SIZE / 2 - 1;\n      const currentSegment = new Phaser.Geom.Line(enemy.body.x, enemy.body.y, target.x, target.y);\n      const segmentBlocked = this.towers.some((tower) => Phaser.Geom.Intersects.LineToRectangle(\n        currentSegment,\n        new Phaser.Geom.Rectangle(\n          tower.body.x - halfPlant,\n          tower.body.y - halfPlant,\n          halfPlant * 2,\n          halfPlant * 2,\n        ),\n      ));\n\n      if (segmentBlocked) {\n        this.pendingEnemyReroutes.delete(enemy);\n        this.recalculateEnemyPath(enemy);\n        return;\n      }\n    }\n\n    const distance = Phaser.Math.Distance.Between(enemy.body.x, enemy.body.y, target.x, target.y);\n    const step = speed * (delta / 1000);\n    if (distance <= step) {\n      enemy.body.setPosition(target.x, target.y);\n      enemy.pathIndex += 1;\n\n      // Placement/removal only requests a reroute. The actual calculation is\n      // performed here, once the enemy has completed its current segment and\n      // is exactly on a waypoint instead of between two path nodes.\n      if (this.pendingEnemyReroutes.has(enemy)) {\n        this.pendingEnemyReroutes.delete(enemy);\n        this.recalculateEnemyPath(enemy);\n      }\n      return;\n    }\n    enemy.body.x += ((target.x - enemy.body.x) / distance) * step;\n    enemy.body.y += ((target.y - enemy.body.y) / distance) * step;\n  }`;
      if (!code.includes(followPathAnchor)) {
        throw new Error("Deferred reroute followPath anchor not found.");
      }

      const recalculateAllAnchor = `  private recalculateEnemyPaths(): void {\n    const version = ++this.pathRecalculationVersion;\n    const activeEnemies = [...this.enemies];\n    const enemiesPerFrame = 6;\n    activeEnemies.forEach((enemy, index) => {\n      const delay = 1 + Math.floor(index / enemiesPerFrame) * 16;\n      const recalculate = (): void => {\n        if (version !== this.pathRecalculationVersion || !enemy.body.active || !this.enemies.includes(enemy)) return;\n        this.recalculateEnemyPath(enemy);\n      };\n      this.time.delayedCall(delay, recalculate);\n    });\n  }`;

      const recalculateAllReplacement = `  private recalculateEnemyPaths(): void {\n    // Invalidate any recalculation batch from the previous implementation,\n    // then mark active enemies for a safe reroute at their next waypoint.\n    this.pathRecalculationVersion += 1;\n    this.enemies.forEach((enemy) => {\n      if (enemy.body.active) this.pendingEnemyReroutes.add(enemy);\n    });\n  }`;
      if (!code.includes(recalculateAllAnchor)) {
        throw new Error("Deferred reroute batch anchor not found.");
      }

      let transformed = code.replace(fieldAnchor, fieldReplacement);
      transformed = transformed.replace(followPathAnchor, followPathReplacement);
      transformed = transformed.replace(recalculateAllAnchor, recalculateAllReplacement);
      return { code: transformed, map: null };
    },
  };
}
