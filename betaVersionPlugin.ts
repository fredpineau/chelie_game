import type { Plugin } from "vite";

/**
 * Build-time version label only. No gameplay logic is changed here.
 */
export function betaVersionDisplay(): Plugin {
  return {
    name: "beta-version-display",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const currentVersion = `const BETA_VERSION = "0.2.0-beta.1";`;
      const nextVersion = `const BETA_VERSION = "0.3";`;
      if (!code.includes(currentVersion)) {
        throw new Error("Beta version anchor not found.");
      }

      return { code: code.replace(currentVersion, nextVersion), map: null };
    },
  };
}
