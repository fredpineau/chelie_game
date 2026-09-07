import type { Plugin } from "vite";

/**
 * Test-only route continuity guard.
 *
 * Dynamic rerouting already validates that the connector from the enemy's real
 * position to a candidate start does not cross a plant. This adds continuity:
 * prefer candidates that are close to the enemy and that still make progress
 * toward the selected exit, instead of choosing a farther start only because
 * its grid path contains fewer cells.
 */
export function enemyRouteContinuity(): Plugin {
  return {
    name: "enemy-route-continuity",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const declarationAnchor = `        let bestPathForExit: Phaser.Math.Vector2[] | null = null;\n        for (const start of candidates) {`;
      const declarationReplacement = `        let bestPathForExit: Phaser.Math.Vector2[] | null = null;\n        let bestPathScoreForExit = Number.POSITIVE_INFINITY;\n        for (const start of candidates) {`;

      const selectionAnchor = `          const path = this.calculatePath(start, { col: exit.col, row: exit.row });\n          if (!path || (bestPathForExit && path.length >= bestPathForExit.length)) continue;`;
      const selectionReplacement = `          const path = this.calculatePath(start, { col: exit.col, row: exit.row });\n          if (!path) continue;\n\n          const connectorCost = Phaser.Math.Distance.Between(\n            enemy.body.x, enemy.body.y, startX, startY,\n          ) / CELL;\n          const currentExitDistance = Phaser.Math.Distance.Between(\n            enemy.body.x, enemy.body.y, exit.x, exit.y,\n          );\n          const candidateExitDistance = Phaser.Math.Distance.Between(\n            startX, startY, exit.x, exit.y,\n          );\n          const awayFromExitPenalty = Math.max(0, candidateExitDistance - currentExitDistance) / CELL;\n          const candidateScore = path.length + connectorCost + awayFromExitPenalty * 2;\n          if (candidateScore >= bestPathScoreForExit) continue;`;

      const assignmentAnchor = `          bestPathForExit = path;`;
      const assignmentReplacement = `          bestPathScoreForExit = candidateScore;\n          bestPathForExit = path;`;

      if (!code.includes(declarationAnchor) || !code.includes(selectionAnchor) || !code.includes(assignmentAnchor)) {
        throw new Error("Enemy route continuity anchors not found.");
      }

      let transformed = code.replace(declarationAnchor, declarationReplacement);
      transformed = transformed.replace(selectionAnchor, selectionReplacement);
      transformed = transformed.replace(assignmentAnchor, assignmentReplacement);
      return { code: transformed, map: null };
    },
  };
}
