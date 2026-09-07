import type { Plugin } from "vite";

/**
 * Test-only helper for PR #23.
 * Seeds 500 drops once in this browser profile so the greenhouse reset can be
 * exercised. A marker prevents the drops from being re-added after reset.
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

      const replacement = `${anchor}\n      if (localStorage.getItem("chelie-reset-test-seeded") !== "1") {\n        this.wateringCans = Math.max(this.wateringCans, 500);\n        localStorage.setItem("chelie-watering-cans", String(this.wateringCans));\n        localStorage.setItem("chelie-reset-test-seeded", "1");\n      }`;

      return { code: code.replace(anchor, replacement), map: null };
    },
  };
}
