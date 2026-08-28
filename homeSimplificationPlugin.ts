import type { Plugin } from "vite";

export function simplifyHomeProgression(): Plugin {
  return {
    name: "simplify-home-progression",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      let transformed = code;

      // Aère la zone entre les onglets et la première rangée de mondes.
      transformed = transformed.replace(
        '    const cardRowStart = 427;',
        '    const cardRowStart = 455;',
      );

      const greenhouseStart = '    this.add.text(homeCenterX, 960, `SERRE PERMANENTE  ·  💧 ${this.wateringCans}`, {';
      const optionsAnchor = '    this.makeButton(homeCenterX, 1150, 330, 50, "OPTIONS ET AIDE", 0x315968, () => this.showHomeOptions())';
      const start = transformed.indexOf(greenhouseStart);
      const end = transformed.indexOf(optionsAnchor, start);
      if (start >= 0 && end >= 0) {
        const compactHome = `    const greenhouseGlow = this.add.rectangle(homeCenterX, 1025, 520, 78, 0x7de3d5, 0.12)\n      .setStrokeStyle(3, 0xa7f3e6, 0.65)\n      .setDepth(31);\n    const greenhouseButton = this.makeButton(homeCenterX, 1025, 500, 68, \`🌱 SERRE PERMANENTE  ·  💧 \${this.wateringCans}  ›\`, 0x0f766e, () => this.showPermanentGreenhouse())\n      .setDepth(32);\n    this.tweens.add({\n      targets: greenhouseGlow,\n      alpha: 0.28,\n      scaleX: 1.03,\n      scaleY: 1.08,\n      yoyo: true,\n      repeat: -1,\n      duration: 1400,\n      ease: "Sine.easeInOut",\n    });\n    greenhouseButton.on("pointerover", () => greenhouseButton.setScale(1.035));\n    greenhouseButton.on("pointerout", () => greenhouseButton.setScale(1));\n\n`;
        transformed = transformed.slice(0, start) + compactHome + transformed.slice(end);
        transformed = transformed.replace(
          '    this.makeButton(homeCenterX, 1150, 330, 50, "OPTIONS ET AIDE", 0x315968, () => this.showHomeOptions())',
          '    this.makeButton(homeCenterX, 1125, 330, 50, "OPTIONS ET AIDE", 0x315968, () => this.showHomeOptions())',
        );
      }

      const oldOptions = `    const panel = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 590, 650, 0x164f59, 0.995)\n      .setStrokeStyle(4, 0x8ddce6, 0.95);\n    const title = this.add.text(WIDTH / 2, HEIGHT / 2 - 240, "OPTIONS ET AIDE", {\n      fontFamily: "Arial", fontSize: "35px", color: "#ffffff", fontStyle: "bold",\n      stroke: "#173943", strokeThickness: 5, letterSpacing: 2,\n    }).setOrigin(0.5);\n    const goal = this.makeButton(WIDTH / 2, HEIGHT / 2 - 125, 400, 60, "BUT DU JEU", 0x245d68, () => this.showGameGoalGuide());\n    const drops = this.makeButton(WIDTH / 2, HEIGHT / 2 - 45, 400, 60, "GUIDE DES GOUTTES", 0x2f7180, () => this.showWateringGuide());\n    const beta = this.makeButton(WIDTH / 2, HEIGHT / 2 + 35, 400, 60, "ESPACE BÊTA", 0x6b4c78, () => this.showBetaTools());\n    const version = this.add.text(WIDTH / 2, HEIGHT / 2 + 115, \`VERSION \${BETA_VERSION}\`, {\n      fontFamily: "Arial", fontSize: "18px", color: "#bfe7ea", fontStyle: "bold", letterSpacing: 1,\n    }).setOrigin(0.5);\n    const close = this.makeButton(WIDTH / 2, HEIGHT / 2 + 210, 300, 58, "FERMER", 0x0f766e, () => options.destroy(true));\n    options.add([veil, panel, title, goal, drops, beta, version, close]);`;
      const newOptions = `    const panel = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 590, 560, 0x164f59, 0.995)\n      .setStrokeStyle(4, 0x8ddce6, 0.95);\n    const title = this.add.text(WIDTH / 2, HEIGHT / 2 - 195, "OPTIONS ET AIDE", {\n      fontFamily: "Arial", fontSize: "35px", color: "#ffffff", fontStyle: "bold",\n      stroke: "#173943", strokeThickness: 5, letterSpacing: 2,\n    }).setOrigin(0.5);\n    const goal = this.makeButton(WIDTH / 2, HEIGHT / 2 - 85, 400, 60, "BUT DU JEU", 0x245d68, () => this.showGameGoalGuide());\n    const beta = this.makeButton(WIDTH / 2, HEIGHT / 2 + 5, 400, 60, "ESPACE BÊTA", 0x6b4c78, () => this.showBetaTools());\n    const version = this.add.text(WIDTH / 2, HEIGHT / 2 + 95, \`VERSION \${BETA_VERSION}\`, {\n      fontFamily: "Arial", fontSize: "18px", color: "#bfe7ea", fontStyle: "bold", letterSpacing: 1,\n    }).setOrigin(0.5);\n    const close = this.makeButton(WIDTH / 2, HEIGHT / 2 + 175, 300, 58, "FERMER", 0x0f766e, () => options.destroy(true));\n    options.add([veil, panel, title, goal, beta, version, close]);`;
      transformed = transformed.replace(oldOptions, newOptions);

      const wateringGuideAnchor = '  private showWateringGuide(): void {';
      if (transformed.includes(wateringGuideAnchor) && !transformed.includes('  private showPermanentGreenhouse(): void {')) {
        const greenhouseMethod = `  private showPermanentGreenhouse(): void {\n    const greenhouse = this.add.container(0, 0).setDepth(50);\n    const veil = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x071a20, 0.92).setInteractive();\n    const panel = this.add.rectangle(WIDTH / 2, HEIGHT / 2 + 18, 650, 920, 0x245d68, 0.995)\n      .setStrokeStyle(4, 0x8ddce6, 0.96);\n    const title = this.add.text(WIDTH / 2, 168, "SERRE PERMANENTE", {\n      fontFamily: "Arial", fontSize: "36px", color: "#ffffff", fontStyle: "bold",\n      stroke: "#12353d", strokeThickness: 5, letterSpacing: 2, align: "center",\n    }).setOrigin(0.5);\n    const balance = this.add.text(WIDTH / 2, 223, \`RÉSERVE  ·  💧 \${this.wateringCans}\`, {\n      fontFamily: "Arial", fontSize: "24px", color: "#bff5fb", fontStyle: "bold",\n      stroke: "#12353d", strokeThickness: 3, align: "center",\n    }).setOrigin(0.5);\n    const explanation = this.add.text(WIDTH / 2, 355,\n      "Les gouttes améliorent définitivement chaque famille de plantes.\\nElles se gagnent dans les mondes et restent acquises pour toutes les parties.", {\n        fontFamily: "Arial", fontSize: "22px", color: "#edf8f7", fontStyle: "bold",\n        align: "center", lineSpacing: 10, wordWrap: { width: 570 },\n      }).setOrigin(0.5);\n    const rewardHint = this.add.text(WIDTH / 2, 455,\n      "1re réussite : 1 💧   ·   parfaite : jusqu’à 2 💧   ·   boss parfait : jusqu’à 3 💧", {\n        fontFamily: "Arial", fontSize: "24px", color: "#edf8f7", fontStyle: "bold",\n        align: "center", lineSpacing: 10, wordWrap: { width: 570 },\n      }).setOrigin(0.5);\n    const costCurve = this.add.text(WIDTH / 2, 520, "COÛTS PAR PLANTE  ·  15 → 30 → 60 → 100 → 150 💧", {\n      fontFamily: "Arial", fontSize: "18px", color: "#ffe7a3", fontStyle: "bold",\n      stroke: "#3d3520", strokeThickness: 2, align: "center",\n    }).setOrigin(0.5);\n\n    const masteryKinds = Object.keys(TOWERS) as TowerKind[];\n    masteryKinds.forEach((kind, index) => {\n      const mastery = this.plantMastery[kind];\n      const cost = mastery < MASTERY_COSTS.length ? MASTERY_COSTS[mastery] : null;\n      const col = index % 2;\n      const row = Math.floor(index / 2);\n      const x = WIDTH / 2 + (col === 0 ? -155 : 155);\n      const y = 665 + row * 190;\n      const card = this.add.container(x, y);\n      const bg = this.add.rectangle(0, 0, 270, 160, 0x173f47, 0.98)\n        .setStrokeStyle(3, mastery >= MASTERY_COSTS.length ? 0xf0d77a : 0x8ddce6, 0.95);\n      const plant = this.createPlantVisual(kind, TOWERS[kind].color).setScale(0.72).setPosition(-82, -12);\n      const name = this.add.text(42, -46, TOWERS[kind].name.toUpperCase(), {\n        fontFamily: "Arial", fontSize: "18px", color: "#ffffff", fontStyle: "bold",\n        stroke: "#12353d", strokeThickness: 3, align: "center",\n      }).setOrigin(0.5);\n      const level = this.add.text(42, -10, \`NIV. \${mastery}/5\`, {\n        fontFamily: "Arial", fontSize: "17px", color: "#dffaff", fontStyle: "bold", align: "center",\n      }).setOrigin(0.5);\n      const actionLabel = cost === null ? "MAX" : \`NIV. \${mastery + 1}  ·  💧 \${cost}\`;\n      const action = this.makeButton(18, 45, 186, 44, actionLabel, cost === null ? 0x5b5b45 : 0x2f7180, () => {\n        if (cost === null) return;\n        if (this.wateringCans < cost) {\n          this.cameras.main.shake(110, 0.0015);\n          return;\n        }\n        this.wateringCans -= cost;\n        this.plantMastery[kind] += 1;\n        this.savePermanentProgress();\n        greenhouse.destroy(true);\n        this.showPermanentGreenhouse();\n      });\n      if (cost !== null && this.wateringCans < cost) action.setAlpha(0.55);\n      card.add([bg, plant, name, level, action]);\n      greenhouse.add(card);\n    });\n\n    const close = this.makeButton(WIDTH / 2, 1090, 300, 58, "FERMER", 0x0f766e, () => greenhouse.destroy(true));\n    greenhouse.add([veil, panel, title, balance, explanation, rewardHint, costCurve, close]);\n  }\n\n`;
        transformed = transformed.replace(wateringGuideAnchor, greenhouseMethod + wateringGuideAnchor);
      }

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
