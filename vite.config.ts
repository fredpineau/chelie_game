import { defineConfig, type Plugin } from "vite";

function staggeredPlacementFix(): Plugin {
  return {
    name: "staggered-placement-fix",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith("/src/main.ts") && !id.endsWith("\\src\\main.ts")) return null;

      const oldCollision = `    if (this.towers.some((tower) =>\n      Math.abs(tower.body.x - placement.x) < PLANT_FRAME_SIZE - 1\n      && Math.abs(tower.body.y - placement.y) < PLANT_FRAME_SIZE - 1,\n    )) return { allowed: false, reason: \"Cet emplacement est déjà occupé\" };`;

      const newCollision = `    const occupied = this.towers.some((tower) => {\n      const deltaX = Math.abs(tower.body.x - placement.x);\n      const deltaY = Math.abs(tower.body.y - placement.y);\n\n      // Le placement garde le demi-pas d'origine sur X et Y pour conserver\n      // des lignes compactes. En revanche, deux cadres de plantes ne peuvent\n      // jamais se recouvrir réellement. Le contact bord à bord reste autorisé.\n      return deltaX < PLANT_FRAME_SIZE - 1\n        && deltaY < PLANT_FRAME_SIZE - 1;\n    });\n    if (occupied) return { allowed: false, reason: \"Cet emplacement est déjà occupé\" };`;

      if (!code.includes(oldCollision)) {
        throw new Error("Placement collision block not found; compact spacing fix was not applied.");
      }

      let transformed = code.replace(oldCollision, newCollision);

      const oldRouteCheck = `    const routeStates = this.getRouteOptions().map((route) => ({\n      route,\n      open: this.hasGridPath(route.entry, route.destination, blockedCells),\n    }));`;
      const newRouteCheck = `    const routeStates = this.getRouteOptions().map((route) => ({\n      route,\n      // On conserve le pathfinding historique en priorité. Le calcul fin ne\n      // s'active que lorsqu'il déclare à tort un passage fermé entre deux\n      // placements au demi-pas.\n      open: this.hasGridPath(route.entry, route.destination, blockedCells)\n        || this.calculateFinePath(route.entry, route.destination, extraBlocked) !== null,\n    }));`;

      if (!transformed.includes(oldRouteCheck)) {
        throw new Error("Placement route check block not found; fine path fallback was not applied.");
      }
      transformed = transformed.replace(oldRouteCheck, newRouteCheck);

      const helperAnchor = "  private hasGridPath(\n";
      if (!transformed.includes(helperAnchor)) {
        throw new Error("Path helper anchor not found; fine path fallback was not applied.");
      }

      const finePathHelper = `  private calculateFinePath(\n    start: { col: number; row: number },\n    end: { col: number; row: number },\n    extraBlocked?: { col: number; row: number; x?: number; y?: number },\n  ): Phaser.Math.Vector2[] | null {\n    const step = PLANT_HALF_STEP;\n    const minX = GRID_X;\n    const minY = GRID_Y;\n    const maxX = GRID_X + (GRID_COLS - 1) * CELL;\n    const maxY = GRID_Y + (GRID_ROWS - 1) * CELL;\n    const fineCols = Math.floor((maxX - minX) / step);\n    const fineRows = Math.floor((maxY - minY) / step);\n    const key = (col: number, row: number) => String(col) + \",\" + String(row);\n    const worldX = (col: number) => minX + col * step;\n    const worldY = (row: number) => minY + row * step;\n    const toFine = (x: number, y: number) => ({\n      col: Phaser.Math.Clamp(Math.round((x - minX) / step), 0, fineCols),\n      row: Phaser.Math.Clamp(Math.round((y - minY) / step), 0, fineRows),\n    });\n\n    const blockers = this.towers.map((tower) => ({ x: tower.body.x, y: tower.body.y }));\n    if (extraBlocked) {\n      blockers.push({\n        x: extraBlocked.x ?? this.gridToWorldX(extraBlocked.col, extraBlocked.row),\n        y: extraBlocked.y ?? this.gridToWorldY(extraBlocked.row),\n      });\n    }\n    const roots = this.terrainFeatures.filter((feature) => feature.kind === \"root\");\n    const plantClearance = PLANT_FRAME_SIZE / 2;\n    const isBlocked = (col: number, row: number): boolean => {\n      const x = worldX(col);\n      const y = worldY(row);\n      if (blockers.some((plant) =>\n        Math.abs(x - plant.x) < plantClearance\n        && Math.abs(y - plant.y) < plantClearance,\n      )) return true;\n      return roots.some((root) => {\n        const dx = x - root.x;\n        const dy = y - root.y;\n        const clearance = root.radius + 5;\n        return dx * dx + dy * dy < clearance * clearance;\n      });\n    };\n\n    const startFine = toFine(this.gridToWorldX(start.col, start.row), this.gridToWorldY(start.row));\n    const endFine = toFine(this.gridToWorldX(end.col, end.row), this.gridToWorldY(end.row));\n    if (isBlocked(startFine.col, startFine.row) || isBlocked(endFine.col, endFine.row)) return null;\n\n    const frontier = [startFine];\n    const visited = new Set<string>([key(startFine.col, startFine.row)]);\n    const previous = new Map<string, { col: number; row: number }>();\n    const directions = [\n      { col: 1, row: 0 }, { col: -1, row: 0 }, { col: 0, row: 1 }, { col: 0, row: -1 },\n      { col: 1, row: 1 }, { col: 1, row: -1 }, { col: -1, row: 1 }, { col: -1, row: -1 },\n    ];\n\n    for (let index = 0; index < frontier.length; index += 1) {\n      const current = frontier[index];\n      if (current.col === endFine.col && current.row === endFine.row) {\n        const cells = [current];\n        let cursor = current;\n        while (key(cursor.col, cursor.row) !== key(startFine.col, startFine.row)) {\n          cursor = previous.get(key(cursor.col, cursor.row))!;\n          cells.push(cursor);\n        }\n        return cells.reverse().map((cell) => new Phaser.Math.Vector2(worldX(cell.col), worldY(cell.row)));\n      }\n\n      for (const direction of directions) {\n        const next = { col: current.col + direction.col, row: current.row + direction.row };\n        if (next.col < 0 || next.col > fineCols || next.row < 0 || next.row > fineRows) continue;\n        const nextKey = key(next.col, next.row);\n        if (visited.has(nextKey) || isBlocked(next.col, next.row)) continue;\n        if (direction.col !== 0 && direction.row !== 0) {\n          if (isBlocked(current.col + direction.col, current.row)\n            || isBlocked(current.col, current.row + direction.row)) continue;\n        }\n        visited.add(nextKey);\n        previous.set(nextKey, current);\n        frontier.push(next);\n      }\n    }\n    return null;\n  }\n\n`;
      transformed = transformed.replace(helperAnchor, finePathHelper + helperAnchor);

      const calculatePathFallback = "    return null;\n  }\n\n  private getBlockedPathCells";
      const calculatePathReplacement = "    return this.calculateFinePath(start, end, extraBlocked);\n  }\n\n  private getBlockedPathCells";
      if (!transformed.includes(calculatePathFallback)) {
        throw new Error("calculatePath fallback anchor not found; fine path fallback was not applied.");
      }
      transformed = transformed.replace(calculatePathFallback, calculatePathReplacement);

      return {
        code: transformed,
        map: null,
      };
    },
  };
}

export default defineConfig({
  base: "/",
  plugins: [staggeredPlacementFix()],
  build: {
    outDir: "dist",
  },
});
