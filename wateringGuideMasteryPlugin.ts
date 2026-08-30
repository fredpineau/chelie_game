import type { Plugin } from "vite";

export function wateringGuideMastery(): Plugin {
  return {
    name: "watering-guide-mastery",
    enforce: "post",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      let transformed = code;

      // Retire la serre permanente de la page de sélection des mondes.
      // On ne touche qu'au bloc UI situé juste avant les handlers de l'overlay.
      const homeMasteryPattern = /\n    this\.add\.text\(homeCenterX, 960, `SERRE PERMANENTE[\s\S]*?\n    overlay\.on\("pointerdown", \(\) => undefined\);/;
      if (!homeMasteryPattern.test(transformed)) {
        throw new Error("Home mastery block not found; watering guide mastery was not applied.");
      }
      transformed = transformed.replace(
        homeMasteryPattern,
        '\n    overlay.on("pointerdown", () => undefined);',
      );

      // Remplace la partie statique "niveaux permanents" du guide par la serre
      // interactive : les quatre familles de plantes peuvent y être améliorées.
      const guideMasteryPattern = /    const levelsTitle = this\.add\.text\(guideCenterX, 525, "NIVEAUX PERMANENTS", \{[\s\S]*?    guide\.add\(\[veil, panel, title, balance, explanation, rewards, levelsTitle, \.\.\.rows, total, distinction, close\]\);/;
      if (!guideMasteryPattern.test(transformed)) {
        throw new Error("Watering guide mastery section not found; interactive greenhouse was not applied.");
      }

      const interactiveGuide = `    const levelsTitle = this.add.text(guideCenterX, 515, "SERRE PERMANENTE", {
      fontFamily: "Arial",
      fontSize: "27px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#12353d",
      strokeThickness: 4,
      letterSpacing: 1.5,
    }).setOrigin(0.5);

    const greenhouseHint = this.add.text(guideCenterX, 555,
      "Touchez une fleur pour utiliser vos gouttes et l'améliorer définitivement.", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#d9f4f2",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: 590 },
      }).setOrigin(0.5);

    const masteryCards: Phaser.GameObjects.GameObject[] = [];
    const masteryKinds = Object.keys(TOWERS) as TowerKind[];
    masteryKinds.forEach((kind, index) => {
      const mastery = this.plantMastery[kind];
      const cost = mastery < MASTERY_COSTS.length ? MASTERY_COSTS[mastery] : null;
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = col === 0 ? 205 : 515;
      const y = row === 0 ? 695 : 905;
      const card = this.add.container(x, y);

      const shadow = this.add.graphics();
      shadow.fillStyle(0x071a20, 0.35);
      shadow.fillRoundedRect(-132, -82, 264, 174, 18);
      const background = this.add.graphics();
      background.fillStyle(0x184b55, 0.98);
      background.fillRoundedRect(-130, -85, 260, 170, 18);
      background.lineStyle(3, mastery >= MASTERY_COSTS.length ? 0xf0d77a : 0x8ddce6, 0.95);
      background.strokeRoundedRect(-130, -85, 260, 170, 18);

      const plant = this.createPlantVisual(kind, TOWERS[kind].color)
        .setScale(0.72)
        .setPosition(-78, -18);
      const name = this.add.text(12, -55, TOWERS[kind].name.toUpperCase(), {
        fontFamily: "Arial",
        fontSize: "19px",
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#12353d",
        strokeThickness: 3,
      }).setOrigin(0.5);
      const level = this.add.text(12, -20, \`NIV. \${mastery}/5\`, {
        fontFamily: "Arial",
        fontSize: "18px",
        color: mastery >= MASTERY_COSTS.length ? "#ffe89a" : "#dffaff",
        fontStyle: "bold",
      }).setOrigin(0.5);
      const costText = this.add.text(12, 18, cost === null ? "MAX" : \`PROCHAIN · 💧 \${cost}\`, {
        fontFamily: "Arial",
        fontSize: "17px",
        color: cost === null ? "#ffe89a" : this.wateringCans >= cost ? "#e6fbff" : "#86aeb3",
        fontStyle: "bold",
        stroke: "#12353d",
        strokeThickness: 2,
      }).setOrigin(0.5);

      const dots: Phaser.GameObjects.Arc[] = [];
      for (let dot = 0; dot < MASTERY_COSTS.length; dot += 1) {
        dots.push(this.add.circle(-12 + dot * 14, 55, 4.5, dot < mastery ? 0xf0d77a : 0x557d82, 1));
      }

      card.add([shadow, background, plant, name, level, costText, ...dots]);
      card.setSize(270, 180).setInteractive({ useHandCursor: true });
      card.on("pointerover", () => card.setScale(1.025));
      card.on("pointerout", () => card.setScale(1));
      card.on("pointerdown", () => {
        const previousMastery = this.plantMastery[kind];
        this.upgradePlantMastery(kind);
        if (this.plantMastery[kind] !== previousMastery) {
          guide.destroy(true);
          this.showWateringGuide();
        }
      });
      masteryCards.push(card);
    });

    const distinction = this.add.text(guideCenterX, 1035,
      "Les gouttes améliorent les fleurs pour toutes les parties. Les pièces restent propres à la partie en cours.", {
        fontFamily: "Arial",
        fontSize: "17px",
        color: "#cfe9e7",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: 600 },
      }).setOrigin(0.5);
    const close = this.makeButton(guideCenterX, 1125, 260, 56, "FERMER", 0x0f766e, () => guide.destroy(true));
    guide.add([veil, panel, title, balance, explanation, rewards, levelsTitle, greenhouseHint, ...masteryCards, distinction, close]);`;

      transformed = transformed.replace(guideMasteryPattern, interactiveGuide);
      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
