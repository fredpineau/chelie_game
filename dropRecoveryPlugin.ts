import type { Plugin } from "vite";

export function recoverLostDrops(): Plugin {
  return {
    name: "recover-lost-drops",
    enforce: "post",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      let transformed = code;

      // Première passe : conserve la récupération existante avant le chargement.
      // Si une donnée de progression corrompue déclenche ensuite le catch de
      // loadPermanentProgress(), la seconde passe ci-dessous restaure à nouveau
      // le solde après ce catch.
      const loadAnchor = `  private loadPermanentProgress(): void {\n    try {\n`;
      if (transformed.includes(loadAnchor)) {
        const recovery = `  private loadPermanentProgress(): void {\n    try {\n      const dropRecoveryKey = "chelie-drop-recovery-20260828";\n      const storedDropsBeforeRecovery = Number(localStorage.getItem("chelie-watering-cans") ?? 0);\n      const unlockedBeforeRecovery = Number(localStorage.getItem("chelie-unlocked-level") ?? 0);\n      const rawWaveRecordsBeforeRecovery = localStorage.getItem("chelie-wave-drop-records") ?? "{}";\n      const hasExistingProgressBeforeRecovery = Number.isFinite(unlockedBeforeRecovery) && unlockedBeforeRecovery > 0 || rawWaveRecordsBeforeRecovery !== "{}";\n      if ((!Number.isFinite(storedDropsBeforeRecovery) || storedDropsBeforeRecovery <= 0) && hasExistingProgressBeforeRecovery && localStorage.getItem(dropRecoveryKey) !== "done") {\n        localStorage.setItem("chelie-watering-cans", "200");\n        localStorage.setItem(dropRecoveryKey, "done");\n      }\n`;
        transformed = transformed.replace(loadAnchor, recovery);
      }

      // Seconde passe, volontairement après tout le try/catch de chargement :
      // le premier correctif a déjà marqué le navigateur concerné avec "done".
      // On utilise ce marqueur pour ne réparer QUE les profils touchés par cette
      // régression, puis on persiste les 200 gouttes sans modifier les mondes,
      // les maîtrises ou les records.
      const saveAnchor = `  private savePermanentProgress(): void {`;
      if (transformed.includes(saveAnchor) && !transformed.includes("chelie-drop-recovery-20260828-v2")) {
        const postLoadRepair = `    try {\n      const recoveryV1 = localStorage.getItem("chelie-drop-recovery-20260828");\n      const recoveryV2 = localStorage.getItem("chelie-drop-recovery-20260828-v2");\n      if (recoveryV1 === "done" && recoveryV2 !== "done" && this.wateringCans <= 0) {\n        this.wateringCans = 200;\n        localStorage.setItem("chelie-watering-cans", "200");\n        localStorage.setItem("chelie-drop-recovery-20260828-v2", "done");\n      }\n    } catch {\n      // Ne jamais casser le chargement du jeu si le stockage local est indisponible.\n    }\n  }\n\n  private savePermanentProgress(): void {`;

        // Remplace uniquement la fin de loadPermanentProgress juste avant la
        // méthode de sauvegarde. Le "  }" immédiatement précédent ferme bien
        // loadPermanentProgress dans le source actuel.
        transformed = transformed.replace(`  }\n\n${saveAnchor}`, postLoadRepair);
      }

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
