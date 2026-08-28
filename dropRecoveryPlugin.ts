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

      const recovery = `  create(): void {\n    this.resetState();\n    try {\n      const recoveryKey = "chelie-greenhouse-test-compensation-20260828-v6";\n      if (localStorage.getItem(recoveryKey) !== "done") {\n        // Les gouttes dépensées pendant les essais de la régression Serre sont\n        // compensées une seule fois. On ne touche à aucune maîtrise ni aux mondes.\n        if (this.wateringCans < 200) this.wateringCans = 200;\n        this.savePermanentProgress();\n        localStorage.setItem(recoveryKey, "done");\n      }\n    } catch {\n      if (this.wateringCans < 200) this.wateringCans = 200;\n    }\n`;

      const transformed = code.replace(createAnchor, recovery);
      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
