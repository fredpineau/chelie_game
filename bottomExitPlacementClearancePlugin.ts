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

      const guard = `  private checkTowerPlacement(placement: TowerPlacement, kind: TowerKind): PlacementCheck {\n    // Keep the physical mouth of the bottom exit clear. The pathfinder works\n    // on grid-cell centres, while plants use a half-step placement lattice; a\n    // plant could therefore overlap the exit point without blocking its grid\n    // destination. Preview and final placement both pass through this method.\n    const bottomExitX = this.gridToWorldX(BOTTOM_EXIT_COL, BOTTOM_EXIT_ROW);\n    const bottomExitY = this.gridToWorldY(BOTTOM_EXIT_ROW);\n    const exitClearance = PLANT_FRAME_SIZE / 2 + 4;\n    if (\n      Math.abs(placement.x - bottomExitX) < exitClearance\n      && Math.abs(placement.y - bottomExitY) < exitClearance\n    ) {\n      return { allowed: false, reason: "La sortie basse doit rester dégagée" };\n    }\n`;

      return { code: code.replace(anchor, guard), map: null };
    },
  };
}
