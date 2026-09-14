import type { Plugin } from "vite";

/**
 * Aide réservée à la preview de la PR #36.
 * Ajoute 1 000 gouttes une seule fois afin de tester le remboursement.
 * Ce plugin doit être retiré avant toute fusion vers main.
 */
export function testDropSeed(): Plugin {
  return {
    name: "test-drop-seed",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const anchor = `      this.wateringCans = Math.max(0, Number(localStorage.getItem("chelie-watering-cans") ?? 0));`;
      if (!code.includes(anchor)) {
        throw new Error("Test drop seed anchor not found.");
      }

      const replacement = `${anchor}\n      if (localStorage.getItem("chelie-refund-test-seeded-v1") !== "1") {\n        this.wateringCans = Math.max(this.wateringCans, 1000);\n        localStorage.setItem("chelie-watering-cans", String(this.wateringCans));\n        localStorage.setItem("chelie-refund-test-seeded-v1", "1");\n      }`;

      return { code: code.replace(anchor, replacement), map: null };
    },
  };
}
