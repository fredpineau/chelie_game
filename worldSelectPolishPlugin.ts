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

      // Les cartes des mondes finis n'affichent plus la mention générique
      // « MENACE CROISSANTE ». On garde uniquement les libellés utiles aux
      // modes infinis / spéciaux.
      transformed = transformed.replace(
        'const waveLabel = level.waves === null ? "VAGUES INFINIES" : "MENACE CROISSANTE";',
        'const waveLabel = level.waves === null ? "VAGUES INFINIES" : "";',
      );

      // Recentre le contenu des cartes standards maintenant que la dernière
      // ligne a disparu. Les cartes qui hébergent un accès infini conservent
      // leur mise en page compacte afin de laisser la place au second bouton.
      transformed = transformed.replace(
        'const iconHalo = this.add.circle(0, -39, 29, available ? biomeAccents[index] : 0x496469, available ? 0.24 : 0.16);',
        'const compactCard = hostsFirstInfinite || isFinalInfinite;\n      const iconHalo = this.add.circle(0, compactCard ? -39 : -25, 29, available ? biomeAccents[index] : 0x496469, available ? 0.24 : 0.16);',
      );
      transformed = transformed.replace(
        'const icon = this.add.text(0, -40, available ? biomeIcons[index] : "×", {',
        'const icon = this.add.text(0, compactCard ? -40 : -26, available ? biomeIcons[index] : "×", {',
      );
      transformed = transformed.replace(
        'const code = this.add.text(0, -6, available ? level.code : "VERROUILLÉ", {',
        'const code = this.add.text(0, compactCard ? -6 : 8, available ? level.code : "VERROUILLÉ", {',
      );
      transformed = transformed.replace(
        'const name = this.add.text(0, 22, level.name.toUpperCase(), {',
        'const name = this.add.text(0, compactCard ? 22 : 38, level.name.toUpperCase(), {',
      );
      transformed = transformed.replace(
        'const threat = this.add.text(0, 53, available ? waveLabel : level.code, {',
        'const threat = this.add.text(0, 53, available ? waveLabel : (level.waves === null ? level.code : ""), {',
      );

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
