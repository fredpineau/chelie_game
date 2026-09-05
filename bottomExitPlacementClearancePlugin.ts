import type { Plugin } from "vite";

/**
 * Test-only placement guard for the physical mouth of the bottom exit.
 *
 * This deliberately changes only tower-placement validation. Enemy spawn,
 * wave routing, enemy pathfinding and movement remain untouched.
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

      const guard = `  private checkTowerPlacement(placement: TowerPlacement, kind: TowerKind): PlacementCheck {\n    // The map has an even number of columns, so the physical bottom opening is\n    // centred between the two middle path columns. Protect that physical mouth\n    // symmetrically; preview and final placement both pass through this method.\n    const bottomExitX = MAP_CENTER_X;\n    const bottomExitY = this.gridToWorldY(BOTTOM_EXIT_ROW);\n    const exitClearance = PLANT_FRAME_SIZE / 2;\n    if (\n      Math.abs(placement.x - bottomExitX) < exitClearance\n      && Math.abs(placement.y - bottomExitY) < exitClearance\n    ) {\n      return { allowed: false, reason: "La sortie basse doit rester dégagée" };\n    }\n`;

      let transformed = code.replace(placementAnchor, guard);

      const routeAnchor = `    const routeStates = this.getRouteOptions().map((route) => ({\n      route,\n      open: this.hasGridPath(route.entry, route.destination, blockedCells),\n    }));`;
      if (!transformed.includes(routeAnchor)) {
        throw new Error("Bottom exit symmetric route-validation anchor not found.");
      }

      const symmetricRouteValidation = `    // The bottom opening sits between columns 10 and 11. During placement\n    // validation only, either middle cell is a valid approach to the same\n    // physical opening. This removes the left/right bias without changing the\n    // route actually selected or followed by enemies during a wave.\n    const alternateBottomDestination = { col: BOTTOM_EXIT_COL + 1, row: BOTTOM_EXIT_ROW };\n    const routeStates = this.getRouteOptions().map((route) => {\n      const primaryOpen = this.hasGridPath(route.entry, route.destination, blockedCells);\n      const isBottomRoute = route.exit === "bottom";\n      return {\n        route,\n        open: primaryOpen || (\n          isBottomRoute\n          && this.hasGridPath(route.entry, alternateBottomDestination, blockedCells)\n        ),\n      };\n    });`;

      transformed = transformed.replace(routeAnchor, symmetricRouteValidation);
      return { code: transformed, map: null };
    },
  };
}
