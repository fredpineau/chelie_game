import type { Plugin } from "vite";

/**
 * Keeps the original enemy movement and pathfinder intact.
 * After a plant placement/removal, enemies recalculate immediately from their
 * current position. The only extra guard prevents a movement step from
 * crossing a plant rectangle (the edge-to-edge/mobile tunnelling case).
 *
 * Every reroute start candidate must also be directly reachable from the
 * enemy's real current position without crossing a plant. This prevents the
 * recalculation loop where a mathematically valid route starts with an
 * impossible connector segment.
 *
 * If the normal reroute still cannot find a route from its nearest free start
 * cells, a rare fallback looks slightly farther away with the same connector
 * validation.
 */
export function deferredEnemyReroute(): Plugin {
  return {
    name: "deferred-enemy-reroute",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const followPathAnchor = `  private followPath(enemy: Enemy, delta: number, speed: number): void {\n    const target = enemy.path[enemy.pathIndex];\n    if (!target) {\n      this.recalculateEnemyPath(enemy);\n      return;\n    }\n\n    const distance = Phaser.Math.Distance.Between(enemy.body.x, enemy.body.y, target.x, target.y);\n    const step = speed * (delta / 1000);\n    if (distance <= step) {\n      enemy.body.setPosition(target.x, target.y);\n      enemy.pathIndex += 1;\n      return;\n    }\n    enemy.body.x += ((target.x - enemy.body.x) / distance) * step;\n    enemy.body.y += ((target.y - enemy.body.y) / distance) * step;\n  }`;

      const followPathReplacement = `  private followPath(enemy: Enemy, delta: number, speed: number): void {\n    const target = enemy.path[enemy.pathIndex];\n    if (!target) {\n      this.recalculateEnemyPath(enemy);\n      return;\n    }\n\n    const distance = Phaser.Math.Distance.Between(enemy.body.x, enemy.body.y, target.x, target.y);\n    if (distance <= 0.001) {\n      enemy.body.setPosition(target.x, target.y);\n      enemy.pathIndex += 1;\n      return;\n    }\n\n    const step = Math.min(distance, speed * (delta / 1000));\n    const nextX = enemy.body.x + ((target.x - enemy.body.x) / distance) * step;\n    const nextY = enemy.body.y + ((target.y - enemy.body.y) / distance) * step;\n    const halfPlant = PLANT_FRAME_SIZE / 2 - 1;\n    const movement = new Phaser.Geom.Line(enemy.body.x, enemy.body.y, nextX, nextY);\n    const movementBlocked = this.towers.some((tower) => {\n      const rect = new Phaser.Geom.Rectangle(\n        tower.body.x - halfPlant,\n        tower.body.y - halfPlant,\n        halfPlant * 2,\n        halfPlant * 2,\n      );\n      const currentInside = Math.abs(enemy.body.x - tower.body.x) < halfPlant\n        && Math.abs(enemy.body.y - tower.body.y) < halfPlant;\n      if (currentInside) return false;\n      return Phaser.Geom.Intersects.LineToRectangle(movement, rect);\n    });\n\n    if (movementBlocked) {\n      this.recalculateEnemyPath(enemy);\n      return;\n    }\n\n    enemy.body.setPosition(nextX, nextY);\n    if (step >= distance - 0.001) {\n      enemy.body.setPosition(target.x, target.y);\n      enemy.pathIndex += 1;\n    }\n  }`;

      if (!code.includes(followPathAnchor)) {
        throw new Error("Deferred reroute followPath anchor not found.");
      }

      const candidateRouteAnchor = `        for (const start of candidates) {\n          const path = this.calculatePath(start, { col: exit.col, row: exit.row });`;

      const candidateRouteReplacement = `        for (const start of candidates) {\n          const startX = this.gridToWorldX(start.col, start.row);\n          const startY = this.gridToWorldY(start.row);\n          const halfPlant = PLANT_FRAME_SIZE / 2 - 1;\n          const connector = new Phaser.Geom.Line(enemy.body.x, enemy.body.y, startX, startY);\n          const connectorBlocked = this.towers.some((tower) => {\n            const currentInside = Math.abs(enemy.body.x - tower.body.x) < halfPlant\n              && Math.abs(enemy.body.y - tower.body.y) < halfPlant;\n            if (currentInside) return false;\n            return Phaser.Geom.Intersects.LineToRectangle(\n              connector,\n              new Phaser.Geom.Rectangle(\n                tower.body.x - halfPlant,\n                tower.body.y - halfPlant,\n                halfPlant * 2,\n                halfPlant * 2,\n              ),\n            );\n          });\n          if (connectorBlocked) continue;\n\n          const path = this.calculatePath(start, { col: exit.col, row: exit.row });`;

      if (!code.includes(candidateRouteAnchor)) {
        throw new Error("Deferred reroute candidate anchor not found.");
      }

      const rerouteFailureAnchor = `    enemy.path = [];\n    enemy.pathIndex = 0;\n  }\n\n  private calculatePath(`;
      const rerouteFailureReplacement = `    const fallbackHalfPlant = PLANT_FRAME_SIZE / 2 - 1;\n    const fallbackCandidates: { col: number; row: number; x: number; y: number }[] = [];\n    for (let radius = 1; radius <= 4; radius += 1) {\n      for (let rowOffset = -radius; rowOffset <= radius; rowOffset += 1) {\n        for (let colOffset = -radius; colOffset <= radius; colOffset += 1) {\n          if (Math.max(Math.abs(colOffset), Math.abs(rowOffset)) !== radius) continue;\n          const col = approximateCol + colOffset;\n          const row = approximateRow + rowOffset;\n          if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) continue;\n          if (blocked.has(\`${'${col},${row}'}\`)) continue;\n          const x = this.gridToWorldX(col, row);\n          const y = this.gridToWorldY(row);\n          const connector = new Phaser.Geom.Line(enemy.body.x, enemy.body.y, x, y);\n          const connectorBlocked = this.towers.some((tower) => {\n            const currentInside = Math.abs(enemy.body.x - tower.body.x) < fallbackHalfPlant\n              && Math.abs(enemy.body.y - tower.body.y) < fallbackHalfPlant;\n            if (currentInside) return false;\n            return Phaser.Geom.Intersects.LineToRectangle(\n              connector,\n              new Phaser.Geom.Rectangle(\n                tower.body.x - fallbackHalfPlant,\n                tower.body.y - fallbackHalfPlant,\n                fallbackHalfPlant * 2,\n                fallbackHalfPlant * 2,\n              ),\n            );\n          });\n          if (!connectorBlocked) fallbackCandidates.push({ col, row, x, y });\n        }\n      }\n      if (fallbackCandidates.length > 0) break;\n    }\n\n    fallbackCandidates.sort((a, b) =>\n      Phaser.Math.Distance.Squared(enemy.body.x, enemy.body.y, a.x, a.y)\n      - Phaser.Math.Distance.Squared(enemy.body.x, enemy.body.y, b.x, b.y),\n    );\n\n    for (const exit of exits) {\n      for (const start of fallbackCandidates) {\n        const route = this.calculatePath({ col: start.col, row: start.row }, { col: exit.col, row: exit.row });\n        if (!route) continue;\n        enemy.exitId = exit.id;\n        enemy.exitCol = exit.col;\n        enemy.exitRow = exit.row;\n        enemy.exitX = exit.x;\n        enemy.exitY = exit.y;\n        enemy.path = [\n          new Phaser.Math.Vector2(enemy.body.x, enemy.body.y),\n          new Phaser.Math.Vector2(start.x, start.y),\n          ...route,\n          new Phaser.Math.Vector2(exit.x, exit.y),\n        ];\n        enemy.pathIndex = 1;\n        return;\n      }\n    }\n\n    enemy.path = [];\n    enemy.pathIndex = 0;\n  }\n\n  private calculatePath(`;

      if (!code.includes(rerouteFailureAnchor)) {
        throw new Error("Deferred reroute failure anchor not found.");
      }

      let transformed = code.replace(followPathAnchor, followPathReplacement);
      transformed = transformed.replace(candidateRouteAnchor, candidateRouteReplacement);
      transformed = transformed.replace(rerouteFailureAnchor, rerouteFailureReplacement);
      return { code: transformed, map: null };
    },
  };
}
