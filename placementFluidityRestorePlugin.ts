import type { Plugin } from "vite";

export function restorePlacementFluidity(): Plugin {
  return {
    name: "restore-placement-fluidity",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      let transformed = code;

      // Les événements pointermove peuvent arriver bien plus vite que le rendu.
      // On ne recalcule donc l'aperçu qu'une fois par tick Phaser, en gardant
      // toujours la dernière position du doigt. Cela évite de recalculer le
      // pathfinding plusieurs fois pour la même image affichée.
      transformed = transformed.replace(
        '    zone.on("pointermove", previewAtPointer);',
        `    let pendingPlacementPointer: Phaser.Input.Pointer | null = null;\n    let placementPreviewScheduled = false;\n    zone.on("pointermove", (pointer: Phaser.Input.Pointer) => {\n      pendingPlacementPointer = pointer;\n      if (placementPreviewScheduled) return;\n      placementPreviewScheduled = true;\n      this.time.delayedCall(0, () => {\n        placementPreviewScheduled = false;\n        const latestPointer = pendingPlacementPointer;\n        pendingPlacementPointer = null;\n        if (latestPointer) previewAtPointer(latestPointer);\n      });\n    });`,
      );

      // Au relâchement on force toujours un dernier calcul exact à la position
      // du doigt avant la pose. Le lissage ci-dessus ne peut donc jamais faire
      // perdre une position intermédiaire ou décaler la plante.
      transformed = transformed.replace(
        '      const touchOffset = pointer.event instanceof TouchEvent ? this.getPlacementTouchOffset(pointer.worldY) : 0;\n      this.placeTower(pointer.worldX, pointer.worldY - touchOffset, this.lastPlacementPreview);',
        '      previewAtPointer(pointer);\n      const touchOffset = pointer.event instanceof TouchEvent ? this.getPlacementTouchOffset(pointer.worldY) : 0;\n      this.placeTower(pointer.worldX, pointer.worldY - touchOffset, this.lastPlacementPreview);',
      );

      // Les animations infinies de chaque insecte volant continuent de tourner
      // même quand son rendu est masqué pendant la pose. On garde exactement le
      // même sprite, mais sans deux tweens permanents par ennemi : beaucoup moins
      // de travail CPU dans les grosses vagues, sans changer le gameplay.
      transformed = transformed.replace(
        '    if (kind === "air") {\n      this.tweens.add({ targets: visual, y: visual.y - (isBoss ? 4 : 3), yoyo: true, repeat: -1, duration: isBoss ? 320 : 220, ease: "Sine.easeInOut" });\n      this.tweens.add({ targets: visual, angle: isBoss ? 1.2 : 2, yoyo: true, repeat: -1, duration: isBoss ? 430 : 280, ease: "Sine.easeInOut" });\n    }',
        '',
      );

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
