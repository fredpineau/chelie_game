import { defineConfig, type Plugin } from "vite";

function staggeredPlacementFix(): Plugin {
  return {
    name: "staggered-placement-fix",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith("/src/main.ts") && !id.endsWith("\\src\\main.ts")) return null;

      const oldCollision = `    if (this.towers.some((tower) =>\n      Math.abs(tower.body.x - placement.x) < PLANT_FRAME_SIZE - 1\n      && Math.abs(tower.body.y - placement.y) < PLANT_FRAME_SIZE - 1,\n    )) return { allowed: false, reason: \"Cet emplacement est déjà occupé\" };`;

      const newCollision = `    const occupied = this.towers.some((tower) => {\n      const deltaX = Math.abs(tower.body.x - placement.x);\n      const deltaY = Math.abs(tower.body.y - placement.y);\n      const axisTolerance = PLANT_HALF_STEP * 0.75;\n      const fullSpacing = PLANT_FRAME_SIZE - 1;\n\n      // Un demi-pas sur un seul axe reste un chevauchement.\n      // Un demi-pas sur les deux axes correspond au quinconce voulu.\n      const tooCloseOnSameColumn = deltaX < axisTolerance && deltaY < fullSpacing;\n      const tooCloseOnSameRow = deltaY < axisTolerance && deltaX < fullSpacing;\n      return tooCloseOnSameColumn || tooCloseOnSameRow;\n    });\n    if (occupied) return { allowed: false, reason: \"Cet emplacement est déjà occupé\" };`;

      if (!code.includes(oldCollision)) {
        throw new Error("Placement collision block not found; staggered placement fix was not applied.");
      }

      let transformed = code.replace(oldCollision, newCollision);

      const oldClearance = "    const insectClearance = PLANT_FRAME_SIZE / 2;";
      const newClearance = `    // La grille de déplacement est plus grossière que la grille de pose.\n    // Une demi-case ne doit donc pas condamner plusieurs nœuds de chemin à la fois.\n    // Cette marge conserve un obstacle autour de la plante tout en laissant les\n    // passages visibles entre deux rangées en quinconce.\n    const insectClearance = PLANT_HALF_STEP * 0.75;`;

      if (!transformed.includes(oldClearance)) {
        throw new Error("Path clearance block not found; staggered path fix was not applied.");
      }
      transformed = transformed.replace(oldClearance, newClearance);

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
