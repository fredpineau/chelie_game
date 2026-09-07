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

      const recovery = `    // Dernier recours : le placement au demi-pas peut laisser un passage réel\n    // alors qu'aucune case de la grille grossière n'est joignable directement.\n    // Avant de vider le chemin (ce qui immobiliserait l'ennemi), on reprend le\n    // premier point futur de l'ancien trajet encore visible sans traverser une\n    // plante. Le pathfinder normal reste toujours prioritaire.\n    const recoveryHalfPlant = PLANT_FRAME_SIZE / 2 - 1;\n    for (let resumeIndex = Math.min(enemy.pathIndex + 1, enemy.path.length - 1); resumeIndex < enemy.path.length; resumeIndex += 1) {\n      const resumePoint = enemy.path[resumeIndex];\n      const connector = new Phaser.Geom.Line(enemy.body.x, enemy.body.y, resumePoint.x, resumePoint.y);\n      const connectorBlocked = this.towers.some((tower) => {\n        const currentInside = Math.abs(enemy.body.x - tower.body.x) < recoveryHalfPlant\n          && Math.abs(enemy.body.y - tower.body.y) < recoveryHalfPlant;\n        if (currentInside) return false;\n        return Phaser.Geom.Intersects.LineToRectangle(\n          connector,\n          new Phaser.Geom.Rectangle(\n            tower.body.x - recoveryHalfPlant,\n            tower.body.y - recoveryHalfPlant,\n            recoveryHalfPlant * 2,\n            recoveryHalfPlant * 2,\n          ),\n        );\n      });\n      if (connectorBlocked) continue;\n\n      enemy.path = [\n        new Phaser.Math.Vector2(enemy.body.x, enemy.body.y),\n        ...enemy.path.slice(resumeIndex),\n      ];\n      enemy.pathIndex = 1;\n      return;\n    }\n\n    enemy.path = [];\n    enemy.pathIndex = 0;\n  }\n\n  private calculatePath(`;

      let transformed = code.replace(failureAnchor, recovery);

      const fineFrontierAnchor = `    const frontier = [startFine];
    const visited = new Set<string>([key(startFine.col, startFine.row)]);
    const previous = new Map<string, { col: number; row: number }>();`;
      const fineFrontierReplacement = `    const frontier = [startFine];
    const usePlantAttraction = !this.waveEntryTop && this.waveExitId === "bottom";
    const visited = new Set<string>([key(startFine.col, startFine.row)]);
    const costs = new Map<string, number>([[key(startFine.col, startFine.row), 0]]);
    const processed = new Set<string>();
    const previous = new Map<string, { col: number; row: number }>();`;

      const fineLoopAnchor = `    for (let index = 0; index < frontier.length; index += 1) {
      const current = frontier[index];`;
      const fineLoopReplacement = `    while (frontier.length > 0) {
      if (usePlantAttraction) {
        frontier.sort((a, b) =>
          (costs.get(key(a.col, a.row)) ?? Infinity)
          - (costs.get(key(b.col, b.row)) ?? Infinity),
        );
      }
      const current = frontier.shift()!;
      const currentKey = key(current.col, current.row);
      if (processed.has(currentKey)) continue;
      processed.add(currentKey);`;

      const fineVisitAnchor = `        if (visited.has(nextKey) || isBlocked(next.col, next.row)) continue;
        if (direction.col !== 0 && direction.row !== 0 && (isBlocked(current.col + direction.col, current.row) || isBlocked(current.col, current.row + direction.row))) continue;
        visited.add(nextKey);
        previous.set(nextKey, current);
        frontier.push(next);`;
      const fineVisitReplacement = `        if ((!usePlantAttraction && visited.has(nextKey)) || (usePlantAttraction && processed.has(nextKey)) || isBlocked(next.col, next.row)) continue;
        if (direction.col !== 0 && direction.row !== 0 && (isBlocked(current.col + direction.col, current.row) || isBlocked(current.col, current.row + direction.row))) continue;
        if (!usePlantAttraction) {
          visited.add(nextKey);
          previous.set(nextKey, current);
          frontier.push(next);
          continue;
        }

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
        const movementCost = Math.max(0.16, 1 - scentStrength - routeAttraction)
          * (direction.col !== 0 && direction.row !== 0 ? Math.SQRT2 : 1);
        const newCost = (costs.get(currentKey) ?? 0) + movementCost;
        if (newCost >= (costs.get(nextKey) ?? Infinity)) continue;
        costs.set(nextKey, newCost);
        previous.set(nextKey, current);
        frontier.push(next);`;

      if (!transformed.includes(fineFrontierAnchor)
        || !transformed.includes(fineLoopAnchor)
        || !transformed.includes(fineVisitAnchor)) {
        throw new Error("Fine path attraction anchors not found.");
      }
      transformed = transformed.replace(fineFrontierAnchor, fineFrontierReplacement);
      transformed = transformed.replace(fineLoopAnchor, fineLoopReplacement);
      transformed = transformed.replace(fineVisitAnchor, fineVisitReplacement);

      return { code: transformed, map: null };
    },
  };
}
