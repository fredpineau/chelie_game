import type { Plugin } from "vite";

/**
 * Emergency recovery for the rare case where a live reroute cannot find a
 * coarse-grid start candidate even though the enemy still has usable points in
 * its previous route (notably with half-step plant placement).
 *
 * Normal pathfinding is untouched. Only immediately before the historical
 * `enemy.path = []` failure do we try to reconnect to the nearest future point
 * of the existing path with a straight segment that does not cross a plant.
 */
export function pathfindingStability(): Plugin {
  return {
    name: "pathfinding-stability",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const failureAnchor = `    enemy.path = [];\n    enemy.pathIndex = 0;\n  }\n\n  private calculatePath(`;
      if (!code.includes(failureAnchor)) {
        throw new Error("Pathfinding stability failure anchor not found.");
      }

      const recovery = `    // Dernier recours : le placement au demi-pas peut laisser un passage réel\n    // alors qu'aucune case de la grille grossière n'est joignable directement.\n    // Avant de vider le chemin (ce qui immobiliserait l'ennemi), on reprend le\n    // premier point futur de l'ancien trajet encore visible sans traverser une\n    // plante. Le pathfinder normal reste toujours prioritaire.\n    const recoveryHalfPlant = PLANT_FRAME_SIZE / 2 - 1;\n    if (enemy.path.length > 0) {\n      const firstResumeIndex = Math.max(0, Math.min(enemy.pathIndex, enemy.path.length - 1));\n      for (let resumeIndex = firstResumeIndex; resumeIndex < enemy.path.length; resumeIndex += 1) {\n        const resumePoint = enemy.path[resumeIndex];\n        const connector = new Phaser.Geom.Line(enemy.body.x, enemy.body.y, resumePoint.x, resumePoint.y);\n        const connectorBlocked = this.towers.some((tower) => {\n          const currentInside = Math.abs(enemy.body.x - tower.body.x) < recoveryHalfPlant\n            && Math.abs(enemy.body.y - tower.body.y) < recoveryHalfPlant;\n          if (currentInside) return false;\n          return Phaser.Geom.Intersects.LineToRectangle(\n            connector,\n            new Phaser.Geom.Rectangle(\n              tower.body.x - recoveryHalfPlant,\n              tower.body.y - recoveryHalfPlant,\n              recoveryHalfPlant * 2,\n              recoveryHalfPlant * 2,\n            ),\n          );\n        });\n        if (connectorBlocked) continue;\n\n        enemy.path = [\n          new Phaser.Math.Vector2(enemy.body.x, enemy.body.y),\n          ...enemy.path.slice(resumeIndex),\n        ];\n        enemy.pathIndex = 1;\n        return;\n      }\n    }\n\n    // Aucun trajet exploitable ne subsiste. L'ancienne version vidait le tableau,\n    // puis lisait enemy.path[-1] à l'image suivante et arrêtait toute la partie.\n    // On termine uniquement cet ennemi comme échappé afin que la vague continue.\n    enemy.body.setPosition(enemy.exitX, enemy.exitY);\n    enemy.path = [new Phaser.Math.Vector2(enemy.exitX, enemy.exitY)];\n    enemy.pathIndex = 1;\n  }\n\n  private calculatePath(`;

      let transformed = code.replace(failureAnchor, recovery);

      const finePathAnchor = "    const frontier = [startFine];";
      const leftBottomAttraction = `    const isLeftToBottomRoute = !this.waveEntryTop
      && this.waveExitId === "bottom"
      && end.row === BOTTOM_EXIT_ROW;
    if (isLeftToBottomRoute) {
      type FineQueueNode = { col: number; row: number; cost: number; priority: number };
      const queue: FineQueueNode[] = [];
      const weightedCosts = new Map<string, number>([[key(startFine.col, startFine.row), 0]]);
      const weightedPrevious = new Map<string, { col: number; row: number }>();
      const settled = new Set<string>();
      const heuristic = (col: number, row: number): number => {
        const deltaCol = Math.abs(endFine.col - col);
        const deltaRow = Math.abs(endFine.row - row);
        const diagonal = Math.min(deltaCol, deltaRow);
        const straight = Math.max(deltaCol, deltaRow) - diagonal;
        return 0.16 * (diagonal * Math.SQRT2 + straight);
      };
      const pushQueue = (node: FineQueueNode): void => {
        queue.push(node);
        let index = queue.length - 1;
        while (index > 0) {
          const parent = Math.floor((index - 1) / 2);
          if (queue[parent].priority <= node.priority) break;
          queue[index] = queue[parent];
          index = parent;
        }
        queue[index] = node;
      };
      const popQueue = (): FineQueueNode | undefined => {
        if (queue.length === 0) return undefined;
        const first = queue[0];
        const last = queue.pop()!;
        if (queue.length === 0) return first;
        let index = 0;
        while (true) {
          const left = index * 2 + 1;
          const right = left + 1;
          if (left >= queue.length) break;
          const child = right < queue.length && queue[right].priority < queue[left].priority ? right : left;
          if (queue[child].priority >= last.priority) break;
          queue[index] = queue[child];
          index = child;
        }
        queue[index] = last;
        return first;
      };
      pushQueue({ ...startFine, cost: 0, priority: heuristic(startFine.col, startFine.row) });
      const weightedDirections = [
        { col: 1, row: 0, cost: 1 }, { col: -1, row: 0, cost: 1 },
        { col: 0, row: 1, cost: 1 }, { col: 0, row: -1, cost: 1 },
        { col: 1, row: 1, cost: Math.SQRT2 }, { col: 1, row: -1, cost: Math.SQRT2 },
        { col: -1, row: 1, cost: Math.SQRT2 }, { col: -1, row: -1, cost: Math.SQRT2 },
      ];
      while (queue.length > 0) {
        const current = popQueue()!;
        const currentKey = key(current.col, current.row);
        if (settled.has(currentKey)) continue;
        settled.add(currentKey);
        if (current.col === endFine.col && current.row === endFine.row) {
          const cells = [{ col: current.col, row: current.row }];
          let cursor = cells[0];
          while (key(cursor.col, cursor.row) !== key(startFine.col, startFine.row)) {
            cursor = weightedPrevious.get(key(cursor.col, cursor.row))!;
            cells.push(cursor);
          }
          return cells.reverse().map((cell) => new Phaser.Math.Vector2(worldX(cell.col), worldY(cell.row)));
        }
        for (const direction of weightedDirections) {
          const next = { col: current.col + direction.col, row: current.row + direction.row };
          if (next.col < 0 || next.col > fineCols || next.row < 0 || next.row > fineRows) continue;
          const nextKey = key(next.col, next.row);
          if (settled.has(nextKey) || isBlocked(next.col, next.row)) continue;
          if (direction.col !== 0 && direction.row !== 0
            && (isBlocked(current.col + direction.col, current.row)
              || isBlocked(current.col, current.row + direction.row))) continue;
          const x = worldX(next.col);
          const y = worldY(next.row);
          const nearestPlantDistance = blockers.reduce((nearest, plant) => Math.min(
            nearest,
            (Math.abs(x - plant.x) + Math.abs(y - plant.y)) / step,
          ), Infinity);
          const scentStrength = nearestPlantDistance <= 2 ? 0.72
            : nearestPlantDistance <= 4 ? 0.32
              : nearestPlantDistance <= 6 ? 0.10
                : 0;
          const guideX = this.gridToWorldX(this.waveRouteGuide.col, this.waveRouteGuide.row);
          const guideY = this.gridToWorldY(this.waveRouteGuide.row);
          const guideDistance = (Math.abs(x - guideX) + Math.abs(y - guideY)) / CELL;
          const routeAttraction = Math.max(0, 0.24 - guideDistance * 0.0175);
          const movementCost = Math.max(0.16, 1 - scentStrength - routeAttraction) * direction.cost;
          const newCost = current.cost + movementCost;
          if (newCost >= (weightedCosts.get(nextKey) ?? Infinity)) continue;
          weightedCosts.set(nextKey, newCost);
          weightedPrevious.set(nextKey, { col: current.col, row: current.row });
          pushQueue({
            ...next,
            cost: newCost,
            priority: newCost + heuristic(next.col, next.row),
          });
        }
      }
    }

`;
      if (!transformed.includes(finePathAnchor)) {
        throw new Error("Fine path insertion anchor not found.");
      }
      transformed = transformed.replace(finePathAnchor, leftBottomAttraction + finePathAnchor);

      return { code: transformed, map: null };
    },
  };
}
