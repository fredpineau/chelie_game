import type { Plugin } from "vite";

export function polishWorldSelection(): Plugin {
  return {
    name: "polish-world-selection",
    enforce: "post",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      let transformed = code;

      // Nouvelle version de la bêta après l'extension des mondes et la refonte de l'accueil.
      transformed = transformed.replace(
        'const BETA_VERSION = "0.2.0-beta.1";',
        'const BETA_VERSION = "0.3.0-beta.1";',
      );

      // La sélection des mondes reprend la palette turquoise du bandeau inférieur de la map.
      transformed = transformed.replace(
        'const overlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x164f59, 0.94)',
        'const overlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x2f7782, 0.98)',
      );
      transformed = transformed.replace(
        'const panel = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 680, 1080, 0x326f77, 0.98)',
        'const panel = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 680, 1080, 0x58a8ad, 0.96)',
      );

      // La version reste accessible dans Options et Aide : on la retire de l'écran principal.
      // Suppression robuste, même si un autre plugin a modifié l'espacement ou le format du bloc.
      transformed = transformed.replace(
        /\s*this\.add\.text\(homeCenterX,\s*270,\s*`BÊTA\s*·\s*\$\{BETA_VERSION\}`,[\s\S]*?\)\.setOrigin\(0\.5\)\.setDepth\(32\);\s*/g,
        "\n",
      );
      transformed = transformed.replace(
        /\s*this\.add\.text\(homeCenterX,\s*270,\s*`BETA\s*·\s*\$\{BETA_VERSION\}`,[\s\S]*?\)\.setOrigin\(0\.5\)\.setDepth\(32\);\s*/g,
        "\n",
      );

      // Recentrage vertical après suppression du libellé bêta, sans remonter les cartes.
      transformed = transformed.replace(
        'homeCenterX - 215, 306, 190, 46, "MONDES 1–6"',
        'homeCenterX - 215, 286, 190, 46, "MONDES 1–6"',
      );
      transformed = transformed.replace(
        'homeCenterX, 306, 190, 46, "MONDES 7–12"',
        'homeCenterX, 286, 190, 46, "MONDES 7–12"',
      );
      transformed = transformed.replace(
        'homeCenterX + 215, 306, 190, 46, "MONDES 13–15"',
        'homeCenterX + 215, 286, 190, 46, "MONDES 13–15"',
      );

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
