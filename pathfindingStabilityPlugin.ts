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

      return { code: code.replace(failureAnchor, recovery), map: null };
    },
  };
}
