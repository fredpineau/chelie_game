import { defineConfig, type Plugin } from "vite";

function staggeredPlacementFix(): Plugin {
  return {
    name: "staggered-placement-fix",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith("/src/main.ts") && !id.endsWith("\\src\\main.ts")) return null;

      const oldCollision = `    if (this.towers.some((tower) =>\n      Math.abs(tower.body.x - placement.x) < PLANT_FRAME_SIZE - 1\n      && Math.abs(tower.body.y - placement.y) < PLANT_FRAME_SIZE - 1,\n    )) return { allowed: false, reason: \"Cet emplacement est déjà occupé\" };`;

      const newCollision = `    const occupied = this.towers.some((tower) => {\n      const distance = Phaser.Math.Distance.Between(\n        tower.body.x,\n        tower.body.y,\n        placement.x,\n        placement.y,\n      );\n\n      // Empêche deux plantes d'occuper le même emplacement ou de se chevaucher\n      // sur un seul axe. Le quinconce au demi-pas sur X ET Y reste autorisé :\n      // sa distance entre centres est légèrement supérieure à CELL.\n      return distance < CELL;\n    });\n    if (occupied) return { allowed: false, reason: \"Cet emplacement est déjà occupé\" };`;

      if (!code.includes(oldCollision)) {
        throw new Error("Placement collision block not found; staggered placement fix was not applied.");
      }

      return {
        code: code.replace(oldCollision, newCollision),
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
