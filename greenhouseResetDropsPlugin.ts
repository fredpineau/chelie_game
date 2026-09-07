import type { Plugin } from "vite";

/**
 * Adds a guarded reset control to the permanent greenhouse / drop guide.
 * The reset clears the whole drop economy so rewards can be earned again
 * without duplicating permanent mastery progress.
 */
export function greenhouseResetDrops(): Plugin {
  return {
    name: "greenhouse-reset-drops",
    enforce: "post",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const anchor = `    const close = this.makeButton(guideCenterX, 1125, 260, 56, "FERMER", 0x0f766e, () => guide.destroy(true));\n    guide.add([veil, panel, title, balance, explanation, rewards, levelsTitle, ...rows, total, distinction, close]);`;

      if (!code.includes(anchor)) {
        throw new Error("Greenhouse reset anchor not found.");
      }

      const replacement = `    const resetDrops = this.makeButton(guideCenterX - 170, 1125, 300, 56, "RÉINITIALISER", 0x7f1d2d, () => {\n      const confirmed = typeof window === "undefined"\n        ? true\n        : window.confirm("Réinitialiser toutes les gouttes et les améliorations permanentes ? Cette action est irréversible.");\n      if (!confirmed) return;\n      this.wateringCans = 0;\n      this.waveDropRecords = {};\n      this.plantMastery = { harpoon: 0, flak: 0, pulse: 0, cryo: 0 };\n      this.savePermanentProgress();\n      guide.destroy(true);\n      this.goToHome();\n    });\n    const close = this.makeButton(guideCenterX + 170, 1125, 220, 56, "FERMER", 0x0f766e, () => guide.destroy(true));\n    guide.add([veil, panel, title, balance, explanation, rewards, levelsTitle, ...rows, total, distinction, resetDrops, close]);`;

      return { code: code.replace(anchor, replacement), map: null };
    },
  };
}
