import type { Plugin } from "vite";

/**
 * BIOME 02 visual-only override.
 * Runs on the raw scene source so it does not depend on another visual plugin.
 * No methods, callbacks, selection, placement or gameplay logic are changed.
 */
export function world2CanopyVisual(): Plugin {
  return {
    name: "world-2-canopy-visual",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const originalBackground = `    const background = this.add.graphics();
    background.fillGradientStyle(0xc8bb94, 0xd8cba5, 0xb9ad88, 0xcdbf98, 1);`;
      const biomeBackground = `    const background = this.add.graphics();
    if (this.levelIndex === 1) {
      background.fillGradientStyle(0x4f8a68, 0x72a879, 0x386f58, 0x5b9369, 1);
    } else {
      background.fillGradientStyle(0xc8bb94, 0xd8cba5, 0xb9ad88, 0xcdbf98, 1);
    }`;

      const transformed = code.replace(originalBackground, biomeBackground);
      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
