import type { Plugin } from "vite";

/**
 * Test isolation: keep only the physical no-plant clearances at the two exits.
 * Enemy routing/pathfinding is deliberately left exactly as it was in the
 * previously validated mobile movement baseline.
 */
export function bottomExitPlacementClearance(): Plugin {
  return {
    name: "bottom-exit-placement-clearance",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const placementAnchor = `  private checkTowerPlacement(placement: TowerPlacement, kind: TowerKind): PlacementCheck {\n`;
      if (!code.includes(placementAnchor)) {
        throw new Error("Bottom exit placement clearance anchor not found.");
      }

      const guard = `  private checkTowerPlacement(placement: TowerPlacement, kind: TowerKind): PlacementCheck {\n    // Placement-only protection. Do not transform exit coordinates or routes.\n    const exitClearance = PLANT_FRAME_SIZE / 2;\n\n    const bottomExitX = MAP_CENTER_X;\n    const bottomExitY = this.gridToWorldY(BOTTOM_EXIT_ROW);\n    if (\n      Math.abs(placement.x - bottomExitX) < exitClearance\n      && Math.abs(placement.y - bottomExitY) < exitClearance\n    ) {\n      return { allowed: false, reason: \"La sortie basse doit rester dégagée\" };\n    }\n\n    const rightExitX = this.gridToWorldX(TOP_EXIT_COL, TOP_EXIT_ROW);\n    const rightExitY = this.gridToWorldY(TOP_EXIT_ROW);\n    if (\n      Math.abs(placement.x - rightExitX) < exitClearance\n      && Math.abs(placement.y - rightExitY) < exitClearance\n    ) {\n      return { allowed: false, reason: \"La sortie droite doit rester dégagée\" };\n    }\n`;

      return { code: code.replace(placementAnchor, guard), map: null };
    },
  };
}
