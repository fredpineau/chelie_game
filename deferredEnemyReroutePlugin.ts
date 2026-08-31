import type { Plugin } from "vite";

/**
 * Keeps the original enemy movement and pathfinder intact.
 * After a plant placement/removal, enemies recalculate immediately from their
 * current position. The only extra guard prevents a movement step from
 * crossing a plant rectangle (the edge-to-edge/mobile tunnelling case).
 */
export function deferredEnemyReroute(): Plugin {
  return {
    name: "deferred-enemy-reroute",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const followPathAnchor = `  private followPath(enemy: Enemy, delta: number, speed: number): void {\n    const target = enemy.path[enemy.pathIndex];\n    if (!target) {\n      this.recalculateEnemyPath(enemy);\n      return;\n    }\n\n    const distance = Phaser.Math.Distance.Between(enemy.body.x, enemy.body.y, target.x, target.y);\n    const step = speed * (delta / 1000);\n    if (distance <= step) {\n      enemy.body.setPosition(target.x, target.y);\n      enemy.pathIndex += 1;\n      return;\n    }\n    enemy.body.x += ((target.x - enemy.body.x) / distance) * step;\n    enemy.body.y += ((target.y - enemy.body.y) / distance) * step;\n  }`;

      const followPathReplacement = `  private followPath(enemy: Enemy, delta: number, speed: number): void {\n    const target = enemy.path[enemy.pathIndex];\n    if (!target) {\n      this.recalculateEnemyPath(enemy);\n      return;\n    }\n\n    const distance = Phaser.Math.Distance.Between(enemy.body.x, enemy.body.y, target.x, target.y);\n    if (distance <= 0.001) {\n      enemy.body.setPosition(target.x, target.y);\n      enemy.pathIndex += 1;\n      return;\n    }\n\n    const step = Math.min(distance, speed * (delta / 1000));\n    const nextX = enemy.body.x + ((target.x - enemy.body.x) / distance) * step;\n    const nextY = enemy.body.y + ((target.y - enemy.body.y) / distance) * step;\n    const halfPlant = PLANT_FRAME_SIZE / 2 - 1;\n    const movement = new Phaser.Geom.Line(enemy.body.x, enemy.body.y, nextX, nextY);\n    const movementBlocked = this.towers.some((tower) => {\n      const rect = new Phaser.Geom.Rectangle(\n        tower.body.x - halfPlant,\n        tower.body.y - halfPlant,\n        halfPlant * 2,\n        halfPlant * 2,\n      );\n      const currentInside = Math.abs(enemy.body.x - tower.body.x) < halfPlant\n        && Math.abs(enemy.body.y - tower.body.y) < halfPlant;\n      if (currentInside) return false;\n      return Phaser.Geom.Intersects.LineToRectangle(movement, rect);\n    });\n\n    if (movementBlocked) {\n      // The route changed under this enemy. Recalculate immediately from its\n      // real position: no waiting, no rewind and no teleport to an old node.\n      this.recalculateEnemyPath(enemy);\n      return;\n    }\n\n    enemy.body.setPosition(nextX, nextY);\n    if (step >= distance - 0.001) {\n      enemy.body.setPosition(target.x, target.y);\n      enemy.pathIndex += 1;\n    }\n  }`;

      if (!code.includes(followPathAnchor)) {
        throw new Error("Deferred reroute followPath anchor not found.");
      }

      return { code: code.replace(followPathAnchor, followPathReplacement), map: null };
    },
  };
}
