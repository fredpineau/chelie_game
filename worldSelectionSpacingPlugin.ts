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

      // Centre verticalement le contenu utile des cartes.
      transformed = transformed.replace(
        "const iconHalo = this.add.circle(0, -39, 29,",
        "const iconHalo = this.add.circle(0, -34, 29,",
      );
      transformed = transformed.replace(
        "const icon = this.add.text(0, -40,",
        "const icon = this.add.text(0, -35,",
      );
      transformed = transformed.replace(
        "const code = this.add.text(0, -6,",
        "const code = this.add.text(0, 2,",
      );
      transformed = transformed.replace(
        "const name = this.add.text(0, 22,",
        "const name = this.add.text(0, 34,",
      );

      // Retire la ligne de menace / difficulté en bas de chaque cadre.
      transformed = transformed.replace(
        /\n      const threat = this\.add\.text\(0, 53, available \? waveLabel : level\.code, \{[\s\S]*?\n      \}\)\.setOrigin\(0\.5\);/,
        "",
      );
      transformed = transformed.replace(
        "card.add([background, iconHalo, icon, code, name, threat]);",
        "card.add([background, iconHalo, icon, code, name]);",
      );

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
