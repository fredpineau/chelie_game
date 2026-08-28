import type { Plugin } from "vite";

export function fixGreenhouseSpending(): Plugin {
  return {
    name: "fix-greenhouse-spending",
    enforce: "post",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const greenhouseStart = code.indexOf("  private showPermanentGreenhouse(): void {");
      const greenhouseEnd = greenhouseStart >= 0
        ? code.indexOf("  private showWateringGuide(): void {", greenhouseStart)
        : -1;
      if (greenhouseStart < 0 || greenhouseEnd < 0) return null;

      const before = code.slice(0, greenhouseStart);
      let greenhouse = code.slice(greenhouseStart, greenhouseEnd);
      const after = code.slice(greenhouseEnd);

      // Un autre plugin transforme la condition en
      // `cost === null || wateringCans < cost`. On cible donc toute la méthode
      // de la Serre plutôt qu'une chaîne exacte fragile.
      greenhouse = greenhouse.replace(
        /if \(cost === null(?: \|\| this\.wateringCans < cost)?\) return;\s*this\.upgradePlantMastery\(kind\);\s*greenhouse\.destroy\(true\);\s*this\.scene\.restart\(\{ home: true, selectionPage: this\.selectionPage \}\);/g,
        `if (cost === null) return;\n        if (this.wateringCans < cost) {\n          this.cameras.main.shake(110, 0.0015);\n          return;\n        }\n        this.wateringCans -= cost;\n        this.plantMastery[kind] += 1;\n        this.savePermanentProgress();\n        greenhouse.destroy(true);\n        this.showPermanentGreenhouse();`,
      );

      // Garde-fou : l'ancienne fonction upgradePlantMastery() appelle goToHome().
      // Elle ne doit jamais être utilisée depuis la fenêtre de la Serre.
      greenhouse = greenhouse.replace(
        /if \(cost === null(?: \|\| this\.wateringCans < cost)?\) return;\s*this\.upgradePlantMastery\(kind\);/g,
        `if (cost === null) return;\n        if (this.wateringCans < cost) {\n          this.cameras.main.shake(110, 0.0015);\n          return;\n        }\n        this.wateringCans -= cost;\n        this.plantMastery[kind] += 1;\n        this.savePermanentProgress();`,
      );

      // Aucun redémarrage vers le choix des mondes ne doit subsister dans la Serre.
      greenhouse = greenhouse.replace(
        /\s*this\.scene\.restart\(\{ home: true, selectionPage: this\.selectionPage \}\);/g,
        "",
      );

      // Après une dépense, on redessine uniquement la fenêtre afin d'afficher
      // immédiatement le nouveau niveau et le nouveau solde.
      greenhouse = greenhouse.replace(
        /this\.savePermanentProgress\(\);\s*greenhouse\.destroy\(true\);(?!\s*this\.showPermanentGreenhouse\(\);)/g,
        `this.savePermanentProgress();\n        greenhouse.destroy(true);\n        this.showPermanentGreenhouse();`,
      );

      const transformed = before + greenhouse + after;
      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
