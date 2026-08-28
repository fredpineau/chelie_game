import type { Plugin } from "vite";

export function recoverLostDrops(): Plugin {
  return {
    name: "recover-lost-drops",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const createAnchor = `  create(): void {\n    this.resetState();\n`;
      if (!code.includes(createAnchor)) return null;

      const recovery = `  create(): void {\n    this.resetState();\n    try {\n      const recoveryKey = "chelie-profile-repair-20260828-v5";\n      if (localStorage.getItem(recoveryKey) !== "done") {\n        // Répare uniquement les deux valeurs touchées par la régression :\n        // le solde de Frédéric revient à 200 et la Sarracénie, jamais améliorée, revient à 0/5.\n        // Les autres maîtrises, mondes débloqués et records restent strictement inchangés.\n        this.wateringCans = 200;\n        this.plantMastery.flak = 0;\n        this.savePermanentProgress();\n        localStorage.setItem(recoveryKey, "done");\n      }\n    } catch {\n      // Si le stockage local est indisponible, on répare au moins la session courante.\n      this.wateringCans = 200;\n      this.plantMastery.flak = 0;\n    }\n`;

      const transformed = code.replace(createAnchor, recovery);
      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
