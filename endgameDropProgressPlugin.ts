import type { Plugin } from "vite";

export function endgameDropProgress(): Plugin {
  return {
    name: "endgame-drop-progress",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      let transformed = code;

      const oldLine = '      const maxDrops = level.waves === null ? null : level.waves * 2 + Math.floor(level.waves / 5);';
      const newLines = [
        '      const bossIntervalForDrops = index === 13 || index === 14 ? 4 : 5;',
        '      const maxDrops = level.waves === null ? null : level.waves * 2 + Math.floor(level.waves / bossIntervalForDrops);',
      ].join("\n");
      transformed = transformed.replace(oldLine, newLines);

      const betaBlock = `    this.add.text(homeCenterX, 270, \`BÊTA · \${BETA_VERSION}\`, {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#ccecef",
      fontStyle: "bold",
      letterSpacing: 1.5,
      stroke: "#173943",
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(32);`;

      const dropProgressBlock = `    const unlockedDropCount = LEVELS.reduce((total, level) => {
      if (level.waves === null) return total;
      const prefix = \`v2:\${level.code}:\`;
      return total + Object.entries(this.waveDropRecords)
        .filter(([key]) => key.startsWith(prefix))
        .reduce((sum, [, tier]) => sum + Phaser.Math.Clamp(Number(tier) || 0, 0, 3), 0);
    }, 0);
    const totalDropCount = LEVELS.reduce((total, level, index) => {
      if (level.waves === null) return total;
      const bossInterval = index === 13 || index === 14 ? 4 : 5;
      return total + level.waves * 2 + Math.floor(level.waves / bossInterval);
    }, 0);
    this.add.text(homeCenterX, 270, \`GOUTTES DÉBLOQUÉES  💧 \${unlockedDropCount}/\${totalDropCount}\`, {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#dffaff",
      fontStyle: "bold",
      letterSpacing: 1.2,
      stroke: "#173943",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(32);`;

      transformed = transformed.replace(betaBlock, dropProgressBlock);

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
