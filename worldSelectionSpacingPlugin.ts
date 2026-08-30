import type { Plugin } from "vite";

export function worldSelectionSpacing(): Plugin {
  return {
    name: "world-selection-spacing",
    enforce: "post",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      let transformed = code;

      // Supprime uniquement la ligne de version bêta de la page des mondes.
      transformed = transformed.replace(
        /\n    this\.add\.text\(homeCenterX, 270, `BÊTA · \$\{BETA_VERSION\}`, \{[\s\S]*?\n    \}\)\.setOrigin\(0\.5\)\.setDepth\(32\);/,
        "",
      );

      // Descend légèrement les cartes des mondes pour aérer l'en-tête.
      transformed = transformed.replace(
        "const cardRowStart = 427;",
        "const cardRowStart = 472;",
      );

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
