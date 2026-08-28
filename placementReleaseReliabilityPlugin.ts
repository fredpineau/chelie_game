import type { Plugin } from "vite";

export function reliablePlacementRelease(): Plugin {
  return {
    name: "reliable-placement-release",
    enforce: "post",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const oldBlock = `    this.input.on("pointerup", () => {\n      // Un relâchement sur le bouton de l'herbier ne doit pas quitter la pause\n      // tactique. Celle-ci se termine seulement après un passage sur la carte\n      // (pose ou relâchement du doigt hors de la zone).\n      if (this.placementDragActive && this.lastPlacementPreview) {\n        this.time.delayedCall(0, () => this.endPlacementDrag());\n      }\n    });`;

      const newBlock = `    this.input.on("pointerup", () => {\n      // Une sélection peut commencer dans l'herbier, donc le pointerdown n'appartient\n      // pas forcément à la zone de carte. Sur certains navigateurs mobiles, le\n      // pointerup n'est alors pas redistribué à cette zone même si le doigt finit\n      // dessus. La prévisualisation reste verte mais zone.pointerup ne se déclenche pas.\n      // Le pointerup global sert uniquement de filet de sécurité pour une case déjà\n      // validée en vert ; il ne recalcule ni le snapping ni le pathfinding.\n      if (!this.placementDragActive || !this.lastPlacementPreview) return;\n      if (this.selectedTower !== null && this.lastPlacementPreviewAllowed === true) {\n        const placement = this.lastPlacementPreview;\n        this.placeTower(placement.x, placement.y, placement);\n      }\n      if (this.placementDragActive) {\n        this.time.delayedCall(0, () => this.endPlacementDrag());\n      }\n    });`;

      if (!code.includes(oldBlock)) return null;
      const transformed = code.replace(oldBlock, newBlock);
      return { code: transformed, map: null };
    },
  };
}
