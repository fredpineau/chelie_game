import type { Plugin } from "vite";

/**
 * Visual-only combat polish:
 * - adapts plant range indicators to each biome background;
 * - replaces the two decorative leaves on À L’ATTAQUE with swords.
 * No placement, pathfinding, wave or combat behavior is changed.
 */
export function combatVisualPolish(): Plugin {
  return {
    name: "combat-visual-polish",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      let transformed = code;

      // Cercle d'une plante déjà posée lorsqu'elle est sélectionnée.
      const rangeAnchor = `    this.towerRangeIndicator = this.add.circle(
      tower.body.x,
      tower.body.y,
      tower.range,
      TOWERS[tower.kind].color,
      0.08,
    ).setStrokeStyle(3, TOWERS[tower.kind].color, 0.72).setDepth(10);`;
      const rangeReplacement = `    const biomeRangeColors = [
      0x1f6feb,
      0xfff23d,
      0x39ff88,
      0xffe45c,
      0xff5bd7,
      0x5dffec,
      0xffef5a,
      0xff5bd7,
      0xffe45c,
      0x5dffec,
      0x55e8ff,
      0xffe45c,
      0x55ff9a,
      0x55e8ff,
      0xffe45c,
      0x55ff9a,
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

      // Cercle de portée pendant la pose : c'est celui qui reste affiché pendant
      // le déplacement de la plante fantôme. Le rouge d'interdiction reste inchangé.
      transformed = transformed.replace(
        "    const color = check.allowed ? 0x55c878 : 0xe35b5b;",
        `    const placementRangeColors = [
      0x1f6feb,
      0xfff23d,
      0x39ff88,
      0xffe45c,
      0xff5bd7,
      0x5dffec,
      0xffef5a,
      0xff5bd7,
      0xffe45c,
      0x5dffec,
      0x55e8ff,
      0xffe45c,
      0x55ff9a,
      0x55e8ff,
      0xffe45c,
      0x55ff9a,
    ];
    const color = check.allowed ? (placementRangeColors[this.levelIndex] ?? 0x55c878) : 0xe35b5b;`,
      );

      // Remplace exactement les deux feuilles décoratives par deux épées.
      const leavesAnchor = `    const leftLeaf = this.add.ellipse(-118, 0, 17, 31, 0x5cae7b, 0.75).setRotation(-0.68);
    const rightLeaf = this.add.ellipse(118, 0, 17, 31, 0x5cae7b, 0.75).setRotation(0.68);
    const attackText = this.add.text(0, 0, "À L’ATTAQUE", {
      fontFamily: "Arial", fontSize: "24px", color: "#f3fff8", fontStyle: "bold",
      stroke: "#0a2925", strokeThickness: 4, letterSpacing: 1.5,
    }).setOrigin(0.5);
    attackButton.add([attackShadow, attackBackground, leftLeaf, rightLeaf, attackText]);`;
      const swordsReplacement = `    const leftSword = this.add.text(-118, 0, "⚔", {
      fontFamily: "Arial", fontSize: "28px", color: "#ffe36e", fontStyle: "bold",
      stroke: "#0a2925", strokeThickness: 3,
    }).setOrigin(0.5);
    const rightSword = this.add.text(118, 0, "⚔", {
      fontFamily: "Arial", fontSize: "28px", color: "#ffe36e", fontStyle: "bold",
      stroke: "#0a2925", strokeThickness: 3,
    }).setOrigin(0.5);
    const attackText = this.add.text(0, 0, "À L’ATTAQUE", {
      fontFamily: "Arial", fontSize: "24px", color: "#f3fff8", fontStyle: "bold",
      stroke: "#0a2925", strokeThickness: 4, letterSpacing: 1.5,
    }).setOrigin(0.5);
    attackButton.add([attackShadow, attackBackground, leftSword, rightSword, attackText]);`;
      transformed = transformed.replace(leavesAnchor, swordsReplacement);

      // Compatibilité avec la version précédente du plugin qui ajoutait une épée à gauche.
      const previousAttackAnchor = `    const attackSwords = this.add.text(-104, 0, "⚔", {
      fontFamily: "Arial", fontSize: "28px", color: "#ffe36e", fontStyle: "bold",
      stroke: "#0a2925", strokeThickness: 3,
    }).setOrigin(0.5);
    const attackText = this.add.text(18, 0, "À L’ATTAQUE", {
      fontFamily: "Arial", fontSize: "24px", color: "#f3fff8", fontStyle: "bold",
      stroke: "#0a2925", strokeThickness: 4, letterSpacing: 1.5,
    }).setOrigin(0.5);
    attackButton.add([attackShadow, attackBackground, leftLeaf, rightLeaf, attackSwords, attackText]);`;
      transformed = transformed.replace(previousAttackAnchor, swordsReplacement);

      transformed = transformed.replace(
        "    this.tweens.add({ targets: [leftLeaf, rightLeaf], scaleY: 1.12, yoyo: true, repeat: -1, duration: 1450 });",
        "    this.tweens.add({ targets: [leftSword, rightSword], scale: 1.08, yoyo: true, repeat: -1, duration: 1450 });",
      );

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
