import type { Plugin } from "vite";

export function endgameDropProgress(): Plugin {
  return {
    name: "endgame-drop-progress",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      let transformed = code;

      // Réutilise le calcul précis déjà validé pour les mondes de fin de jeu.
      const oldLine = '      const maxDrops = level.waves === null ? null : level.waves * 2 + Math.floor(level.waves / 5);';
      const newLines = [
        '      const bossIntervalForDrops = index === 13 || index === 14 ? 4 : 5;',
        '      const maxDrops = level.waves === null ? null : level.waves * 2 + Math.floor(level.waves / bossIntervalForDrops);',
      ].join("\n");
      transformed = transformed.replace(oldLine, newLines);

      // Calcule la progression de gouttes monde par monde, directement depuis
      // les records persistants des vagues. Aucun gameplay n'est modifié.
      const availableAnchor = '      const available = index <= unlocked;';
      const perWorldProgress = `      const available = index <= unlocked;
      const bossIntervalForCardDrops = index === 13 || index === 14 ? 4 : 5;
      const maxCardDrops = level.waves === null
        ? null
        : level.waves * 2 + Math.floor(level.waves / bossIntervalForCardDrops);
      const earnedCardDrops = level.waves === null
        ? null
        : Array.from({ length: level.waves }, (_, waveIndex) =>
          Phaser.Math.Clamp(Number(this.waveDropRecords[\`v2:\${level.code}:\${waveIndex + 1}\`] ?? 0), 0, 3),
        ).reduce((sum, tier) => sum + tier, 0);`;
      transformed = transformed.replace(availableAnchor, perWorldProgress);

      const cardAddAnchor = '      card.add([background, iconHalo, icon, code, name, threat]);';
      const cardAddWithDrops = `      card.add([background, iconHalo, icon, code, name, threat]);
      const dropProgress = this.add.text(
        86,
        -64,
        level.waves === null ? "💧 ∞" : \`💧 \${earnedCardDrops ?? 0}/\${maxCardDrops ?? 0}\`,
        {
          fontFamily: "Arial",
          fontSize: "14px",
          color: available ? "#e9fdff" : "#789399",
          fontStyle: "bold",
          stroke: "#173943",
          strokeThickness: 3,
        },
      ).setOrigin(0.5);
      card.add(dropProgress);`;
      transformed = transformed.replace(cardAddAnchor, cardAddWithDrops);

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
