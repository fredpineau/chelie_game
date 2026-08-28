import type { Plugin } from "vite";

export function allowDiagonalCornerTouchPlacement(): Plugin {
  return {
    name: "allow-diagonal-corner-touch-placement",
    enforce: "post",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const currentCollision = `    const occupied = this.towers.some((tower) => {\n      const deltaX = Math.abs(tower.body.x - placement.x);\n      const deltaY = Math.abs(tower.body.y - placement.y);\n\n      // Le placement garde le demi-pas d'origine sur X et Y pour conserver\n      // des lignes compactes. En revanche, deux cadres de plantes ne peuvent\n      // jamais se recouvrir réellement. Le contact bord à bord reste autorisé.\n      return deltaX < PLANT_FRAME_SIZE - 1\n        && deltaY < PLANT_FRAME_SIZE - 1;\n    });\n    if (occupied) return { allowed: false, reason: "Cet emplacement est déjà occupé" };`;

      const cornerTouchCollision = `    const occupied = this.towers.some((tower) => {\n      const deltaX = Math.abs(tower.body.x - placement.x);\n      const deltaY = Math.abs(tower.body.y - placement.y);\n      const axisTolerance = PLANT_HALF_STEP * 0.75;\n      const fullSpacing = PLANT_FRAME_SIZE - 1;\n\n      // Sur une même ligne/colonne, les cadres ne peuvent pas se chevaucher.\n      // En diagonale, un demi-pas sur X ET Y est autorisé : les cadres ne font\n      // alors que se toucher par leur pointe, comme prévu par le placement en quinconce.\n      const tooCloseOnSameColumn = deltaX < axisTolerance && deltaY < fullSpacing;\n      const tooCloseOnSameRow = deltaY < axisTolerance && deltaX < fullSpacing;\n      return tooCloseOnSameColumn || tooCloseOnSameRow;\n    });\n    if (occupied) return { allowed: false, reason: "Cet emplacement est déjà occupé" };`;

      if (!code.includes(currentCollision)) return null;
      const transformed = code.replace(currentCollision, cornerTouchCollision);
      return { code: transformed, map: null };
    },
  };
}
