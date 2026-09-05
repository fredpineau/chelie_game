import type { Plugin } from "vite";

/**
 * Test-only placement guard for the physical mouth of the bottom exit.
 *
 * This deliberately changes only tower-placement validation. Enemy spawn,
 * route selection, pathfinding and movement remain untouched.
 */
export function bottomExitPlacementClearance(): Plugin {
  return {
    name: "bottom-exit-placement-clearance",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const anchor = `  private checkTowerPlacement(placement: TowerPlacement, kind: TowerKind): PlacementCheck {\n`;
      if (!code.includes(anchor)) {
        throw new Error("Bottom exit placement clearance anchor not found.");
      }

      const guard = `  private checkTowerPlacement(placement: TowerPlacement, kind: TowerKind): PlacementCheck {\n    // The map has an even number of columns, so its visual centre lies halfway\n    // between the two middle path columns. BOTTOM_EXIT_COL points to the left\n    // one for pathfinding; using it here shifted the protected placement area.\n    // Protect the physical opening around the true map centre instead.\n    const bottomExitX = MAP_CENTER_X;\n    const bottomExitY = this.gridToWorldY(BOTTOM_EXIT_ROW);\n    const exitClearance = PLANT_FRAME_SIZE / 2;\n    if (\n      Math.abs(placement.x - bottomExitX) < exitClearance\n      && Math.abs(placement.y - bottomExitY) < exitClearance\n    ) {\n      return { allowed: false, reason: "La sortie basse doit rester dégagée" };\n    }\n`;

      return { code: code.replace(anchor, guard), map: null };
    },
  };
}
