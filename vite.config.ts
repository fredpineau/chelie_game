import { defineConfig, type Plugin } from "vite";

function staggeredPlacementFix(): Plugin {
  return {
    name: "staggered-placement-fix",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith("/src/main.ts") && !id.endsWith("\\src\\main.ts")) return null;

      const oldCollision = `    if (this.towers.some((tower) =>\n      Math.abs(tower.body.x - placement.x) < PLANT_FRAME_SIZE - 1\n      && Math.abs(tower.body.y - placement.y) < PLANT_FRAME_SIZE - 1,\n    )) return { allowed: false, reason: "Cet emplacement est déjà occupé" };`;
      const newCollision = `    const occupied = this.towers.some((tower) => {\n      const deltaX = Math.abs(tower.body.x - placement.x);\n      const deltaY = Math.abs(tower.body.y - placement.y);\n\n      // Le placement garde le demi-pas d'origine sur X et Y pour conserver\n      // des lignes compactes. En revanche, deux cadres de plantes ne peuvent\n      // jamais se recouvrir réellement. Le contact bord à bord reste autorisé.\n      return deltaX < PLANT_FRAME_SIZE - 1\n        && deltaY < PLANT_FRAME_SIZE - 1;\n    });\n    if (occupied) return { allowed: false, reason: "Cet emplacement est déjà occupé" };`;
      if (!code.includes(oldCollision)) throw new Error("Placement collision block not found; compact spacing fix was not applied.");
      let transformed = code.replace(oldCollision, newCollision);

      const oldRouteCheck = `    const routeStates = this.getRouteOptions().map((route) => ({\n      route,\n      open: this.hasGridPath(route.entry, route.destination, blockedCells),\n    }));`;
      const newRouteCheck = `    const routeStates = this.getRouteOptions().map((route) => ({\n      route,\n      // On conserve le pathfinding historique en priorité. Le calcul fin ne\n      // s'active que lorsqu'il déclare à tort un passage fermé entre deux\n      // placements au demi-pas.\n      open: this.hasGridPath(route.entry, route.destination, blockedCells)\n        || this.calculateFinePath(route.entry, route.destination, extraBlocked) !== null,\n    }));`;
      if (!transformed.includes(oldRouteCheck)) throw new Error("Placement route check block not found; fine path fallback was not applied.");
      transformed = transformed.replace(oldRouteCheck, newRouteCheck);

      const helperAnchor = "  private hasGridPath(\n";
      if (!transformed.includes(helperAnchor)) throw new Error("Path helper anchor not found; fine path fallback was not applied.");
      const finePathHelper = `  private calculateFinePath(\n    start: { col: number; row: number },\n    end: { col: number; row: number },\n    extraBlocked?: { col: number; row: number; x?: number; y?: number },\n  ): Phaser.Math.Vector2[] | null {\n    const step = PLANT_HALF_STEP;\n    const minX = GRID_X;\n    const minY = GRID_Y;\n    const maxX = GRID_X + (GRID_COLS - 1) * CELL;\n    const maxY = GRID_Y + (GRID_ROWS - 1) * CELL;\n    const fineCols = Math.floor((maxX - minX) / step);\n    const fineRows = Math.floor((maxY - minY) / step);\n    const key = (col: number, row: number) => String(col) + "," + String(row);\n    const worldX = (col: number) => minX + col * step;\n    const worldY = (row: number) => minY + row * step;\n    const toFine = (x: number, y: number) => ({\n      col: Phaser.Math.Clamp(Math.round((x - minX) / step), 0, fineCols),\n      row: Phaser.Math.Clamp(Math.round((y - minY) / step), 0, fineRows),\n    });\n    const blockers = this.towers.map((tower) => ({ x: tower.body.x, y: tower.body.y }));\n    if (extraBlocked) blockers.push({\n      x: extraBlocked.x ?? this.gridToWorldX(extraBlocked.col, extraBlocked.row),\n      y: extraBlocked.y ?? this.gridToWorldY(extraBlocked.row),\n    });\n    const roots = this.terrainFeatures.filter((feature) => feature.kind === "root");\n    const plantClearance = PLANT_FRAME_SIZE / 2;\n    const isBlocked = (col: number, row: number): boolean => {\n      const x = worldX(col);\n      const y = worldY(row);\n      if (blockers.some((plant) => Math.abs(x - plant.x) < plantClearance && Math.abs(y - plant.y) < plantClearance)) return true;\n      return roots.some((root) => {\n        const dx = x - root.x;\n        const dy = y - root.y;\n        const clearance = root.radius + 5;\n        return dx * dx + dy * dy < clearance * clearance;\n      });\n    };\n    const startFine = toFine(this.gridToWorldX(start.col, start.row), this.gridToWorldY(start.row));\n    const endFine = toFine(this.gridToWorldX(end.col, end.row), this.gridToWorldY(end.row));\n    if (isBlocked(startFine.col, startFine.row) || isBlocked(endFine.col, endFine.row)) return null;\n    const frontier = [startFine];\n    const visited = new Set<string>([key(startFine.col, startFine.row)]);\n    const previous = new Map<string, { col: number; row: number }>();\n    const directions = [\n      { col: 1, row: 0 }, { col: -1, row: 0 }, { col: 0, row: 1 }, { col: 0, row: -1 },\n      { col: 1, row: 1 }, { col: 1, row: -1 }, { col: -1, row: 1 }, { col: -1, row: -1 },\n    ];\n    for (let index = 0; index < frontier.length; index += 1) {\n      const current = frontier[index];\n      if (current.col === endFine.col && current.row === endFine.row) {\n        const cells = [current];\n        let cursor = current;\n        while (key(cursor.col, cursor.row) !== key(startFine.col, startFine.row)) {\n          cursor = previous.get(key(cursor.col, cursor.row))!;\n          cells.push(cursor);\n        }\n        return cells.reverse().map((cell) => new Phaser.Math.Vector2(worldX(cell.col), worldY(cell.row)));\n      }\n      for (const direction of directions) {\n        const next = { col: current.col + direction.col, row: current.row + direction.row };\n        if (next.col < 0 || next.col > fineCols || next.row < 0 || next.row > fineRows) continue;\n        const nextKey = key(next.col, next.row);\n        if (visited.has(nextKey) || isBlocked(next.col, next.row)) continue;\n        if (direction.col !== 0 && direction.row !== 0 && (isBlocked(current.col + direction.col, current.row) || isBlocked(current.col, current.row + direction.row))) continue;\n        visited.add(nextKey);\n        previous.set(nextKey, current);\n        frontier.push(next);\n      }\n    }\n    return null;\n  }\n\n`;
      transformed = transformed.replace(helperAnchor, finePathHelper + helperAnchor);

      const calculatePathFallback = "    return null;\n  }\n\n  private getBlockedPathCells";
      if (!transformed.includes(calculatePathFallback)) throw new Error("calculatePath fallback anchor not found; fine path fallback was not applied.");
      transformed = transformed.replace(calculatePathFallback, "    return this.calculateFinePath(start, end, extraBlocked);\n  }\n\n  private getBlockedPathCells");

      transformed = transformed.replace(
        "    let layout = layouts[this.levelIndex] ?? [];",
        '    let layout = (layouts[this.levelIndex] ?? []).filter(([kind]) => kind !== "peat");',
      );
      transformed = transformed.replace(
        '      const kinds: TerrainKind[] = ["root", "peat", "spore", "sticky", "parasite"];',
        '      const kinds: TerrainKind[] = ["root", "spore", "sticky", "parasite"];',
      );

      // Apparence uniquement : aucune image ni texture supplémentaire. On ne fait
      // qu'accentuer les silhouettes vectorielles déjà rendues par Phaser.
      transformed = transformed.replace(
        '      (kind === "air" ? 44 : 58) * scale,\n      (kind === "air" ? 9 : 12) * scale,',
        '      (kind === "air" ? 34 : 64) * scale,\n      (kind === "air" ? 7 : 13) * scale,',
      );
      transformed = transformed.replace(
        '      const leftWing = this.add.triangle(-17 * scale, -4 * scale, -3, 8, -36, -3, -8, -23, 0xb9e8ed, 0.68)\n        .setStrokeStyle(2, 0x5b8f98, 0.95);\n      const rightWing = this.add.triangle(17 * scale, -4 * scale, 3, 8, 36, -3, 8, -23, 0xb9e8ed, 0.68)\n        .setStrokeStyle(2, 0x5b8f98, 0.95);',
        '      const leftWing = this.add.triangle(-20 * scale, -7 * scale, -3, 10, -44, -5, -9, -30, 0xc8f7ff, 0.86)\n        .setStrokeStyle(2, 0x3f91a3, 1);\n      const rightWing = this.add.triangle(20 * scale, -7 * scale, 3, 10, 44, -5, 9, -30, 0xc8f7ff, 0.86)\n        .setStrokeStyle(2, 0x3f91a3, 1);',
      );
      transformed = transformed.replace(
        '      const abdomen = this.add.ellipse(0, 5 * scale, 14 * scale, 39 * scale, color).setStrokeStyle(2, 0x171612, 0.95);',
        '      const abdomen = this.add.ellipse(0, 3 * scale, 12 * scale, 42 * scale, color).setStrokeStyle(2, 0x13272b, 0.98);',
      );
      transformed = transformed.replace(
        '      const abdomen = this.add.ellipse(-7 * scale, 0, 39 * scale, 28 * scale, color).setStrokeStyle(isBoss ? 3 : 2, 0x151612, 0.95);',
        '      const abdomen = this.add.ellipse(-8 * scale, 2 * scale, 45 * scale, 32 * scale, color).setStrokeStyle(isBoss ? 3 : 2, 0x15120d, 1);',
      );
      transformed = transformed.replace(
        '      const shellLeft = this.add.arc(-10 * scale, 0, 17 * scale, 95, 265, false, 0x344b47).setStrokeStyle(1, 0x171916);\n      const shellRight = this.add.arc(-4 * scale, 0, 17 * scale, -85, 85, false, 0x2d413e).setStrokeStyle(1, 0x171916);',
        '      const shellLeft = this.add.arc(-12 * scale, 1 * scale, 19 * scale, 95, 265, false, 0x59462d).setStrokeStyle(2, 0x241b12);\n      const shellRight = this.add.arc(-4 * scale, 1 * scale, 19 * scale, -85, 85, false, 0x463823).setStrokeStyle(2, 0x241b12);',
      );

      return { code: transformed, map: null };
    },
  };
}

export default defineConfig({
  base: "/",
  plugins: [staggeredPlacementFix()],
  build: { outDir: "dist" },
});
