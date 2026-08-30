import type { Plugin } from "vite";

/**
 * Visual-only biome backgrounds.
 * Runs on the raw scene source and changes only the four background gradient colors.
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
    const biomeBackgrounds: Array<[number, number, number, number]> = [
      [0xc8bb94, 0xd8cba5, 0xb9ad88, 0xcdbf98], // 01 Marais affamé
      [0x73a985, 0x96bf91, 0x5d9275, 0x7eaa80], // 02 Canopée hostile
      [0xb56f63, 0xc98b72, 0x914f50, 0xaa6659], // 03 Serre écarlate
      [0x726c78, 0x8b7f87, 0x554f5d, 0x68616c], // 04 Tourbière noire
      [0x72a66f, 0x9abd79, 0x5c895d, 0x7ba069], // 05 Jardin primordial
      [0x8d7aa0, 0xaa91ad, 0x6d6588, 0x897594], // 06 Fosse des spores
      [0x72a6a0, 0x91b9a9, 0x578887, 0x719d92], // 07 Delta vorace
      [0x83a276, 0xa4b58b, 0x657e67, 0x829876], // 08 Crypte chlorophylle
      [0x687b9c, 0x8596ae, 0x505f7e, 0x687994], // 09 Cime parasitaire
      [0x88758f, 0xa28b9c, 0x695a75, 0x806b83], // 10 Nécropole florale
      [0x9a826a, 0xb39a78, 0x786450, 0x92765d], // 11 Tourbière souveraine
      [0x748b8d, 0x93a5a0, 0x596f76, 0x71868a], // 12 Marais fracturé
      [0x947a91, 0xae91a1, 0x735d79, 0x8b7088], // 13 Essaim chimérique
      [0x9a786f, 0xb5927c, 0x785b5c, 0x916d65], // 14 Ruche des alphas
      [0x70799b, 0x9095b0, 0x565f7e, 0x6c7393], // 15 Nexus carnivore
      [0x666d78, 0x808893, 0x4d555f, 0x626a75], // Mode infini
    ];
    const biomeBackground = biomeBackgrounds[this.levelIndex] ?? biomeBackgrounds[0];
    background.fillGradientStyle(biomeBackground[0], biomeBackground[1], biomeBackground[2], biomeBackground[3], 1);`;

      const transformed = code.replace(originalBackground, biomeBackground);
      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
