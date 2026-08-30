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

      const followPathReplacement = `  private followPath(enemy: Enemy, delta: number, speed: number): void {\n    const target = enemy.path[enemy.pathIndex];\n    if (!target) {\n      this.pendingEnemyReroutes.delete(enemy);\n      this.recalculateEnemyPath(enemy);\n      return;\n    }\n\n    if (this.pendingEnemyReroutes.has(enemy)) {\n      const halfPlant = PLANT_FRAME_SIZE / 2 - 1;\n      const currentSegment = new Phaser.Geom.Line(enemy.body.x, enemy.body.y, target.x, target.y);\n      const segmentBlocked = this.towers.some((tower) => Phaser.Geom.Intersects.LineToRectangle(\n        currentSegment,\n        new Phaser.Geom.Rectangle(\n          tower.body.x - halfPlant,\n          tower.body.y - halfPlant,\n          halfPlant * 2,\n          halfPlant * 2,\n        ),\n      ));\n\n      if (segmentBlocked) {\n        // Cas ciblé : si l'Alpha est le dernier ennemi actif, ne passe pas par\n        // le recalcul générique depuis une position intermédiaire. On remonte\n        // ses vrais waypoints et on choisit le premier qui possède réellement\n        // un trajet vers l'une des deux sorties. Le nouveau chemin est affecté\n        // directement : impossible de finir avec enemy.path = [].\n        if (enemy.isBoss && this.enemies.length === 1) {\n          const rightExit = {\n            id: "right" as ExitId,\n            col: TOP_EXIT_COL,\n            row: TOP_EXIT_ROW,\n            x: this.gridToWorldX(TOP_EXIT_COL, TOP_EXIT_ROW),\n            y: this.gridToWorldY(TOP_EXIT_ROW),\n          };\n          const bottomExit = {\n            id: "bottom" as ExitId,\n            col: BOTTOM_EXIT_COL,\n            row: BOTTOM_EXIT_ROW,\n            x: this.gridToWorldX(BOTTOM_EXIT_COL, BOTTOM_EXIT_ROW),\n            y: this.gridToWorldY(BOTTOM_EXIT_ROW),\n          };\n          const exits = enemy.exitId === "right" ? [rightExit, bottomExit] : [bottomExit, rightExit];\n\n          for (let safeIndex = enemy.pathIndex - 1; safeIndex >= 0; safeIndex -= 1) {\n            const waypoint = enemy.path[safeIndex];\n            const row = Phaser.Math.Clamp(Math.round((waypoint.y - GRID_Y) / CELL), 0, GRID_ROWS - 1);\n            const col = Phaser.Math.Clamp(Math.round((waypoint.x - GRID_X) / CELL), 0, GRID_COLS - 1);\n            const gridX = this.gridToWorldX(col, row);\n            const gridY = this.gridToWorldY(row);\n            if (Phaser.Math.Distance.Squared(waypoint.x, waypoint.y, gridX, gridY) > 4) continue;\n\n            const waypointBlocked = this.towers.some((tower) =>\n              Math.abs(gridX - tower.body.x) < halfPlant\n              && Math.abs(gridY - tower.body.y) < halfPlant,\n            );\n            if (waypointBlocked) continue;\n\n            for (const exit of exits) {\n              const route = this.calculatePath({ col, row }, { col: exit.col, row: exit.row });\n              if (!route) continue;\n\n              enemy.body.setPosition(gridX, gridY);\n              enemy.exitId = exit.id;\n              enemy.exitCol = exit.col;\n              enemy.exitRow = exit.row;\n              enemy.exitX = exit.x;\n              enemy.exitY = exit.y;\n              enemy.path = [\n                new Phaser.Math.Vector2(gridX, gridY),\n                ...route,\n                new Phaser.Math.Vector2(exit.x, exit.y),\n              ];\n              enemy.pathIndex = 1;\n              this.pendingEnemyReroutes.delete(enemy);\n              return;\n            }\n          }\n        }\n\n        this.pendingEnemyReroutes.delete(enemy);\n        this.recalculateEnemyPath(enemy);\n        return;\n      }\n    }\n\n    const distance = Phaser.Math.Distance.Between(enemy.body.x, enemy.body.y, target.x, target.y);\n    const step = speed * (delta / 1000);\n    if (distance <= step) {\n      enemy.body.setPosition(target.x, target.y);\n      enemy.pathIndex += 1;\n\n      // Placement/removal only requests a reroute. The actual calculation is\n      // performed here, once the enemy has completed its current segment and\n      // is exactly on a waypoint instead of between two path nodes.\n      if (this.pendingEnemyReroutes.has(enemy)) {\n        this.pendingEnemyReroutes.delete(enemy);\n        this.recalculateEnemyPath(enemy);\n      }\n      return;\n    }\n    enemy.body.x += ((target.x - enemy.body.x) / distance) * step;\n    enemy.body.y += ((target.y - enemy.body.y) / distance) * step;\n  }`;
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
