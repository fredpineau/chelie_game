import type { Plugin } from "vite";

export function fixGreenhouseSpending(): Plugin {
  return {
    name: "fix-greenhouse-spending",
    enforce: "post",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      let transformed = code;

      // La Serre gère désormais elle-même la dépense. On ne passe plus par
      // upgradePlantMastery(), car cette ancienne méthode ramène vers l'accueil.
      // Cela évite tout changement de scène : on déduit le coût, on sauvegarde,
      // puis on redessine uniquement la fenêtre de la Serre.
      transformed = transformed.replace(
        /        if \(cost === null\) return;\n        this\.upgradePlantMastery\(kind\);\n        greenhouse\.destroy\(true\);\n        this\.scene\.restart\(\{ home: true, selectionPage: this\.selectionPage \}\);/g,
        `        if (cost === null) return;\n        if (this.wateringCans < cost) {\n          this.cameras.main.shake(110, 0.0015);\n          return;\n        }\n        this.wateringCans -= cost;\n        this.plantMastery[kind] += 1;\n        this.savePermanentProgress();\n        greenhouse.destroy(true);\n        this.showPermanentGreenhouse();`,
      );

      // Sécurité supplémentaire : si une variante du handler a déjà été
      // transformée par un autre plugin, aucun redémarrage vers la page des
      // mondes ne doit subsister dans le callback de la Serre.
      transformed = transformed.replace(
        /        if \(cost === null\) return;\n        if \(!this\.upgradePlantMastery\(kind\)\) return;\n        greenhouse\.destroy\(true\);\n        this\.scene\.restart\(\{ home: true, selectionPage: this\.selectionPage \}\);/g,
        `        if (cost === null) return;\n        if (this.wateringCans < cost) {\n          this.cameras.main.shake(110, 0.0015);\n          return;\n        }\n        this.wateringCans -= cost;\n        this.plantMastery[kind] += 1;\n        this.savePermanentProgress();\n        greenhouse.destroy(true);\n        this.showPermanentGreenhouse();`,
      );

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
