import type { Plugin } from "vite";

/**
 * Surgical reroute guard for enemies already moving when a plant is placed.
 * It keeps the existing placement, blocked-cell and pathfinding logic intact,
 * and only rejects reroute anchor cells whose straight connector would cross
 * the physical footprint of an existing plant.
 */
export function safeEnemyReroute(): Plugin {
  return {
    name: "safe-enemy-reroute",
    enforce: "post",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const candidatesAnchor = `    const blocked = this.getBlockedPathCells();
    const candidates: { col: number; row: number }[] = [];

    for (let radius = 0; radius <= 2; radius += 1) {`;
      const candidatesReplacement = `    const blocked = this.getBlockedPathCells();
    const candidates: { col: number; row: number }[] = [];

    // A reroute starts with a straight connector from the enemy's exact world
    // position to the chosen grid anchor. Reject anchors when that connector
    // would cut through a plant. This does not move the enemy backwards and
    // does not alter the normal grid path calculation after the anchor.
    const canReachRerouteAnchor = (col: number, row: number): boolean => {
      const startX = enemy.body.x;
      const startY = enemy.body.y;
      const endX = this.gridToWorldX(col, row);
      const endY = this.gridToWorldY(row);
      const dx = endX - startX;
      const dy = endY - startY;
      const lengthSquared = dx * dx + dy * dy;
      if (lengthSquared < 1) return true;

      const plantRadius = CELL * 0.48;
      const plantRadiusSquared = plantRadius * plantRadius;
      return this.towers.every((tower) => {
        const towerX = tower.body.x;
        const towerY = tower.body.y;
        const projection = Phaser.Math.Clamp(
          ((towerX - startX) * dx + (towerY - startY) * dy) / lengthSquared,
          0,
          1,
        );
        const closestX = startX + projection * dx;
        const closestY = startY + projection * dy;
        const distanceX = towerX - closestX;
        const distanceY = towerY - closestY;
        return distanceX * distanceX + distanceY * distanceY > plantRadiusSquared;
      });
    };

    for (let radius = 0; radius <= 2; radius += 1) {`;

      const candidateAnchor = `          if (blocked.has(\`\${col},\${row}\`)) continue;
          candidates.push({ col, row });`;
      const candidateReplacement = `          if (blocked.has(\`\${col},\${row}\`)) continue;
          if (!canReachRerouteAnchor(col, row)) continue;
          candidates.push({ col, row });`;

      let transformed = code.replace(candidatesAnchor, candidatesReplacement);
      transformed = transformed.replace(candidateAnchor, candidateReplacement);
      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
