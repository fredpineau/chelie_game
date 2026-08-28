import { defineConfig, type Plugin } from "vite";

function staggeredPlacementFix(): Plugin {
  return {
    name: "staggered-placement-fix",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith("/src/main.ts") && !id.endsWith("\\src\\main.ts")) return null;

      const oldRowSnap = `    const placementHalfRow = Phaser.Math.Clamp(\n      Math.round((y - placementStartY) / PLANT_HALF_STEP),\n      0,\n      placementHalfRows,\n    );`;
      const newRowSnap = `    const placementHalfRow = Phaser.Math.Clamp(\n      Math.round((y - placementStartY) / PLANT_FRAME_SIZE),\n      0,\n      Math.floor(placementHalfRows / 2),\n    );`;
      const oldTowerY = "    const towerY = placementStartY + placementHalfRow * PLANT_HALF_STEP;";
      const newTowerY = "    const towerY = placementStartY + placementHalfRow * PLANT_FRAME_SIZE;";

      if (!code.includes(oldRowSnap) || !code.includes(oldTowerY)) {
        throw new Error("Placement row snapping block not found; overlap fix was not applied.");
      }

      // X reste sur une demi-case pour permettre le quinconce gauche/droite.
      // Y passe sur une hauteur de plante complète afin que deux cadres ne
      // puissent jamais se chevaucher verticalement.
      let transformed = code.replace(oldRowSnap, newRowSnap);
      transformed = transformed.replace(oldTowerY, newTowerY);

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
