import type { Plugin } from "vite";

export function fixGreenhouseSpending(): Plugin {
  return {
    name: "fix-greenhouse-spending",
    enforce: "post",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      let transformed = code;

      // Le plugin de layering transforme d'abord le garde-fou en
      // "cost === null || solde insuffisant". C'est cette forme réellement
      // présente au build qu'il faut cibler ici.
      transformed = transformed.replace(
        /      const action = this\.makeButton\(18, 45, 186, 44, actionLabel, cost === null \? 0x5b5b45 : 0x2f7180, \(\) => \{\n        if \(cost === null \|\| this\.wateringCans < cost\) return;\n        this\.upgradePlantMastery\(kind\);\n        greenhouse\.destroy\(true\);\n        this\.scene\.restart\(\{ home: true, selectionPage: this\.selectionPage \}\);\n      \}\);/g,
        `      const action = this.makeButton(18, 45, 186, 44, actionLabel, cost === null ? 0x5b5b45 : 0x2f7180, () => undefined);\n      action.removeAllListeners("pointerdown");\n      action.on("pointerdown", (\n        _pointer: Phaser.Input.Pointer,\n        _localX: number,\n        _localY: number,\n        event: Phaser.Types.Input.EventData,\n      ) => {\n        // Empêche le même clic de traverser la fenêtre de la Serre et\n        // d'atteindre une carte de monde située en dessous.\n        event.stopPropagation();\n        if (cost === null || this.wateringCans < cost) {\n          if (cost !== null) this.cameras.main.shake(110, 0.0015);\n          return;\n        }\n        this.wateringCans -= cost;\n        this.plantMastery[kind] += 1;\n        this.savePermanentProgress();\n        // On attend la fin de l'événement tactile avant de reconstruire le\n        // panneau : aucune scène n'est redémarrée et aucun clic ne peut passer\n        // vers les cartes de mondes sous-jacentes.\n        this.time.delayedCall(0, () => {\n          if (greenhouse.active) greenhouse.destroy(true);\n          this.showPermanentGreenhouse();\n        });\n      });`,
      );

      // Compatibilité avec l'ancienne forme si l'ordre des plugins change.
      transformed = transformed.replace(
        /      const action = this\.makeButton\(18, 45, 186, 44, actionLabel, cost === null \? 0x5b5b45 : 0x2f7180, \(\) => \{\n        if \(cost === null\) return;\n        this\.upgradePlantMastery\(kind\);\n        greenhouse\.destroy\(true\);\n        this\.scene\.restart\(\{ home: true, selectionPage: this\.selectionPage \}\);\n      \}\);/g,
        `      const action = this.makeButton(18, 45, 186, 44, actionLabel, cost === null ? 0x5b5b45 : 0x2f7180, () => undefined);\n      action.removeAllListeners("pointerdown");\n      action.on("pointerdown", (\n        _pointer: Phaser.Input.Pointer,\n        _localX: number,\n        _localY: number,\n        event: Phaser.Types.Input.EventData,\n      ) => {\n        event.stopPropagation();\n        if (cost === null || this.wateringCans < cost) {\n          if (cost !== null) this.cameras.main.shake(110, 0.0015);\n          return;\n        }\n        this.wateringCans -= cost;\n        this.plantMastery[kind] += 1;\n        this.savePermanentProgress();\n        this.time.delayedCall(0, () => {\n          if (greenhouse.active) greenhouse.destroy(true);\n          this.showPermanentGreenhouse();\n        });\n      });`,
      );

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
