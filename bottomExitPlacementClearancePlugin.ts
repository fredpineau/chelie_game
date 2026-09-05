import type { Plugin } from "vite";

/**
 * Test-only correction for the bottom exit.
 *
 * The map has an even number of columns: the physical exit is therefore centred
 * between the two middle path columns. Keep that physical centre consistent for
 * the gate, warnings and enemy final target, while leaving grid pathfinding and
 * wave route selection on their existing cells.
 */
export function bottomExitPlacementClearance(): Plugin {
  return {
    name: "bottom-exit-placement-clearance",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      // BOTTOM_EXIT_COL is the left middle grid column (10 on a 22-column map).
      // Any world-space X coordinate for the physical bottom exit must instead
      // use the true centre between columns 10 and 11. This keeps the visible
      // gate, warning marker and enemies' final target aligned with placement.
      const physicalBottomExitX = "this.gridToWorldX(BOTTOM_EXIT_COL, BOTTOM_EXIT_ROW)";
      if (!code.includes(physicalBottomExitX)) {
        throw new Error("Bottom exit physical X anchor not found.");
      }
      let transformed = code.split(physicalBottomExitX).join("MAP_CENTER_X");

      const placementAnchor = `  private checkTowerPlacement(placement: TowerPlacement, kind: TowerKind): PlacementCheck {\n`;
      if (!transformed.includes(placementAnchor)) {
        throw new Error("Bottom exit placement clearance anchor not found.");
      }

      const guard = `  private checkTowerPlacement(placement: TowerPlacement, kind: TowerKind): PlacementCheck {\n    // Protect the exact physical mouths of both exits. The bottom exit is\n    // centred between the two middle columns; the right exit keeps its existing\n    // grid-aligned opening. Preview and final placement both use this method.\n    const exitClearance = PLANT_FRAME_SIZE / 2;\n\n    const bottomExitX = MAP_CENTER_X;\n    const bottomExitY = this.gridToWorldY(BOTTOM_EXIT_ROW);\n    if (\n      Math.abs(placement.x - bottomExitX) < exitClearance\n      && Math.abs(placement.y - bottomExitY) < exitClearance\n    ) {\n      return { allowed: false, reason: "La sortie basse doit rester dégagée" };\n    }\n\n    const rightExitX = this.gridToWorldX(TOP_EXIT_COL, TOP_EXIT_ROW);\n    const rightExitY = this.gridToWorldY(TOP_EXIT_ROW);\n    if (\n      Math.abs(placement.x - rightExitX) < exitClearance\n      && Math.abs(placement.y - rightExitY) < exitClearance\n    ) {\n      return { allowed: false, reason: "La sortie droite doit rester dégagée" };\n    }\n`;

      transformed = transformed.replace(placementAnchor, guard);

      // staggeredPlacementFix runs before this plugin and has already augmented
      // the route check with calculateFinePath. Keep both normal and fine-grid
      // checks, but allow either middle grid cell to represent the same centred
      // physical bottom opening during placement validation only.
      const routeAnchor = `    const routeStates = this.getRouteOptions().map((route) => ({\n      route,\n      // On conserve le pathfinding historique en priorité. Le calcul fin ne\n      // s'active que lorsqu'il déclare à tort un passage fermé entre deux\n      // placements au demi-pas.\n      open: this.hasGridPath(route.entry, route.destination, blockedCells)\n        || this.calculateFinePath(route.entry, route.destination, extraBlocked) !== null,\n    }));`;
      if (!transformed.includes(routeAnchor)) {
        throw new Error("Bottom exit symmetric route-validation anchor not found.");
      }

      const symmetricRouteValidation = `    const alternateBottomDestination = { col: BOTTOM_EXIT_COL + 1, row: BOTTOM_EXIT_ROW };\n    const routeStates = this.getRouteOptions().map((route) => {\n      const primaryOpen = this.hasGridPath(route.entry, route.destination, blockedCells)\n        || this.calculateFinePath(route.entry, route.destination, extraBlocked) !== null;\n      const alternateBottomOpen = route.exit === "bottom"\n        && (\n          this.hasGridPath(route.entry, alternateBottomDestination, blockedCells)\n          || this.calculateFinePath(route.entry, alternateBottomDestination, extraBlocked) !== null\n        );\n      return { route, open: primaryOpen || alternateBottomOpen };\n    });`;

      transformed = transformed.replace(routeAnchor, symmetricRouteValidation);
      return { code: transformed, map: null };
    },
  };
}
