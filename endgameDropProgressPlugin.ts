import type { Plugin } from "vite";

export function endgameDropProgress(): Plugin {
  return {
    name: "endgame-drop-progress",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      let transformed = code;

      // 2 gouttes max par vague parfaite + 3 gouttes bonus par Alpha tué.
      const oldLine = '      const maxDrops = level.waves === null ? null : level.waves * 2 + Math.floor(level.waves / 5);';
      const newLines = [
        '      const bossIntervalForDrops = index === 13 || index === 14 ? 4 : 5;',
        '      const maxDrops = level.waves === null ? null : level.waves * 2 + Math.floor(level.waves / bossIntervalForDrops) * 3;',
      ].join("\n");
      transformed = transformed.replace(oldLine, newLines);

      // Additionne séparément les records de vagues et les bonus Alpha persistants.
      const availableAnchor = '      const available = index <= unlocked;';
      const perWorldProgress = `      const available = index <= unlocked;
      const bossIntervalForCardDrops = index === 13 || index === 14 ? 4 : 5;
      const maxCardDrops = level.waves === null
        ? null
        : level.waves * 2 + Math.floor(level.waves / bossIntervalForCardDrops) * 3;
      const earnedWaveDrops = level.waves === null
        ? 0
        : Array.from({ length: level.waves }, (_, waveIndex) =>
          Phaser.Math.Clamp(Number(this.waveDropRecords[\`v2:\${level.code}:\${waveIndex + 1}\`] ?? 0), 0, 2),
        ).reduce((sum, tier) => sum + tier, 0);
      const earnedAlphaDrops = level.waves === null
        ? 0
        : Array.from({ length: level.waves }, (_, waveIndex) => {
          const waveNumber = waveIndex + 1;
          if (waveNumber % bossIntervalForCardDrops !== 0) return 0;
          return Phaser.Math.Clamp(Number(this.waveDropRecords[\`alpha:v1:\${level.code}:\${waveNumber}\`] ?? 0), 0, 3);
        }).reduce((sum, bonus) => sum + bonus, 0);
      const earnedCardDrops = level.waves === null ? null : earnedWaveDrops + earnedAlphaDrops;`;
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
