import type { Plugin } from "vite";

export function recoverLostDrops(): Plugin {
  return {
    name: "recover-lost-drops",
    enforce: "post",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const anchor = `  private loadPermanentProgress(): void {\n    try {\n`;
      if (!code.includes(anchor)) return null;

      const recovery = `  private loadPermanentProgress(): void {\n    try {\n      const dropRecoveryKey = "chelie-drop-recovery-20260828";\n      const storedDropsBeforeRecovery = Math.max(0, Number(localStorage.getItem("chelie-watering-cans") ?? 0));\n      const unlockedBeforeRecovery = Math.max(0, Number(localStorage.getItem("chelie-unlocked-level") ?? 0));\n      const rawWaveRecordsBeforeRecovery = localStorage.getItem("chelie-wave-drop-records") ?? "{}";\n      const hasExistingProgressBeforeRecovery = unlockedBeforeRecovery > 0 || rawWaveRecordsBeforeRecovery !== "{}";\n      if (storedDropsBeforeRecovery === 0 && hasExistingProgressBeforeRecovery && localStorage.getItem(dropRecoveryKey) !== "done") {\n        localStorage.setItem("chelie-watering-cans", "200");\n        localStorage.setItem(dropRecoveryKey, "done");\n      }\n`;

      const transformed = code.replace(anchor, recovery);
      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
