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
