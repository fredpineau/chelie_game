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

      const recovery = `  create(): void {\n    this.resetState();\n    try {\n      const recoveryKey = "chelie-drop-recovery-20260828-v4";\n      if (localStorage.getItem(recoveryKey) !== "done") {\n        this.wateringCans = 200;\n        this.savePermanentProgress();\n        localStorage.setItem(recoveryKey, "done");\n      }\n    } catch {\n      this.wateringCans = 200;\n    }\n`;

      const transformed = code.replace(createAnchor, recovery);
      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
