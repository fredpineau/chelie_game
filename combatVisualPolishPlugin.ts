import type { Plugin } from "vite";

/**
 * Visual-only combat polish:
 * - adapts the selected plant range indicator to each biome background;
 * - adds crossed swords to the existing À L’ATTAQUE button.
 * No placement, pathfinding, wave or combat behavior is changed.
 */
export function combatVisualPolish(): Plugin {
  return {
    name: "combat-visual-polish",
    enforce: "post",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      let transformed = code;

      const rangeAnchor = `    this.towerRangeIndicator = this.add.circle(
      tower.body.x,
      tower.body.y,
      tower.range,
      TOWERS[tower.kind].color,
      0.08,
    ).setStrokeStyle(3, TOWERS[tower.kind].color, 0.72).setDepth(10);`;
      const rangeReplacement = `    const biomeRangeColors = [
      0x1f6feb, // 01 sable clair -> bleu vif
      0xfff23d, // 02 vert -> jaune vif
      0x39ff88, // 03 rouge/terracotta -> vert néon
      0xffe45c, // 04 gris-violet -> jaune
      0xff5bd7, // 05 vert -> rose vif
      0x5dffec, // 06 violet -> cyan
      0xffef5a, // 07 turquoise -> jaune
      0xff5bd7, // 08 vert -> rose vif
      0xffe45c, // 09 bleu nuit -> jaune
      0x5dffec, // 10 mauve -> cyan
      0x55e8ff, // 11 brun/or -> cyan clair
      0xffe45c, // 12 gris-vert -> jaune
      0x55ff9a, // 13 violet -> vert vif
      0x55e8ff, // 14 rouge/brun -> cyan
      0xffe45c, // 15 bleu-violet -> jaune
      0x55ff9a, // infini sombre -> vert vif
    ];
    const rangeColor = biomeRangeColors[this.levelIndex] ?? 0xffe45c;
    this.towerRangeIndicator = this.add.circle(
      tower.body.x,
      tower.body.y,
      tower.range,
      rangeColor,
      0.07,
    ).setStrokeStyle(4, rangeColor, 0.96).setDepth(10);`;
      transformed = transformed.replace(rangeAnchor, rangeReplacement);

      const attackTextAnchor = `    const attackText = this.add.text(0, 0, "À L’ATTAQUE", {
      fontFamily: "Arial", fontSize: "24px", color: "#f3fff8", fontStyle: "bold",
      stroke: "#0a2925", strokeThickness: 4, letterSpacing: 1.5,
    }).setOrigin(0.5);
    attackButton.add([attackShadow, attackBackground, leftLeaf, rightLeaf, attackText]);`;
      const attackTextReplacement = `    const attackSwords = this.add.text(-104, 0, "⚔", {
      fontFamily: "Arial", fontSize: "28px", color: "#ffe36e", fontStyle: "bold",
      stroke: "#0a2925", strokeThickness: 3,
    }).setOrigin(0.5);
    const attackText = this.add.text(18, 0, "À L’ATTAQUE", {
      fontFamily: "Arial", fontSize: "24px", color: "#f3fff8", fontStyle: "bold",
      stroke: "#0a2925", strokeThickness: 4, letterSpacing: 1.5,
    }).setOrigin(0.5);
    attackButton.add([attackShadow, attackBackground, leftLeaf, rightLeaf, attackSwords, attackText]);`;
      transformed = transformed.replace(attackTextAnchor, attackTextReplacement);

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
