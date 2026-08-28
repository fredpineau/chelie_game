import type { Plugin } from "vite";

export function fixGreenhouseSpending(): Plugin {
  return {
    name: "fix-greenhouse-spending",
    enforce: "post",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      let transformed = code;

      // L'amélioration permanente ne doit plus changer de scène. Elle indique
      // simplement si la dépense a réellement réussi afin que la Serre puisse
      // rafraîchir son contenu sur place.
      transformed = transformed.replace(
        /  private upgradePlantMastery\(kind: TowerKind\): void \{\n    const mastery = this\.plantMastery\[kind\];\n    if \(mastery >= MASTERY_COSTS\.length\) return;\n    const cost = MASTERY_COSTS\[mastery\];\n    if \(this\.wateringCans < cost\) \{\n      this\.cameras\.main\.shake\(110, 0\.0015\);\n      return;\n    \}\n    this\.wateringCans -= cost;\n    this\.plantMastery\[kind\] \+= 1;\n    this\.savePermanentProgress\(\);\n    this\.goToHome\(\);\n  \}/,
        `  private upgradePlantMastery(kind: TowerKind): boolean {\n    const mastery = this.plantMastery[kind];\n    if (mastery >= MASTERY_COSTS.length) return false;\n    const cost = MASTERY_COSTS[mastery];\n    if (this.wateringCans < cost) {\n      this.cameras.main.shake(110, 0.0015);\n      return false;\n    }\n    this.wateringCans -= cost;\n    this.plantMastery[kind] += 1;\n    this.savePermanentProgress();\n    return true;\n  }`,
      );

      // Dans la Serre, ne ferme/réouvre le panneau que si la dépense a réussi.
      // Aucun scene.restart ici : le solde restant reste chargé en mémoire et
      // sauvegardé par savePermanentProgress().
      transformed = transformed.replace(
        /        if \(cost === null\) return;\n        this\.upgradePlantMastery\(kind\);\n        greenhouse\.destroy\(true\);\n        this\.scene\.restart\(\{ home: true, selectionPage: this\.selectionPage \}\);/,
        `        if (cost === null) return;\n        if (!this.upgradePlantMastery(kind)) return;\n        greenhouse.destroy(true);\n        this.showPermanentGreenhouse();`,
      );

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
