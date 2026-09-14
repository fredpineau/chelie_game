import type { Plugin } from "vite";

export function wateringGuideMastery(): Plugin {
  return {
    name: "watering-guide-mastery",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      let transformed = code;

      // Répare une seule fois les profils touchés par l'ancienne réinitialisation
      // qui vidait la réserve alors que l'historique de récompenses restait présent.
      const loadProgressAnchor = `      (Object.keys(TOWERS) as TowerKind[]).forEach((kind) => {
        this.plantMastery[kind] = Phaser.Math.Clamp(Number(stored[kind] ?? 0), 0, MASTERY_COSTS.length);
      });`;
      if (transformed.includes(loadProgressAnchor)) {
        transformed = transformed.replace(
          loadProgressAnchor,
          `${loadProgressAnchor}
      const reserveRecoveryMarker = "chelie-drop-reserve-recovery-v1";
      const masteryIsReset = (Object.keys(TOWERS) as TowerKind[])
        .every((kind) => this.plantMastery[kind] === 0);
      if (localStorage.getItem(reserveRecoveryMarker) !== "done") {
        if (this.wateringCans === 0 && masteryIsReset) {
          const recoveredDrops = Object.entries(this.waveDropRecords).reduce((sum, [key, value]) => {
            if (!key.startsWith("v2:") && !key.startsWith("alpha:v1:")) return sum;
            return sum + Math.max(0, Number(value) || 0);
          }, 0);
          if (recoveredDrops > 0) {
            this.wateringCans = recoveredDrops;
            localStorage.setItem("chelie-watering-cans", String(this.wateringCans));
          }
        }
        localStorage.setItem(reserveRecoveryMarker, "done");
      }
      const reserveReconciliationMarker = "chelie-drop-reserve-reconciliation-v2";
      if (localStorage.getItem(reserveReconciliationMarker) !== "done") {
        const recordedDrops = Object.entries(this.waveDropRecords).reduce((sum, [key, value]) => {
          if (!key.startsWith("v2:") && !key.startsWith("alpha:v1:")) return sum;
          return sum + Math.max(0, Number(value) || 0);
        }, 0);
        const investedDrops = (Object.keys(TOWERS) as TowerKind[]).reduce((total, kind) => {
          const mastery = this.plantMastery[kind];
          return total + MASTERY_COSTS
            .slice(0, mastery)
            .reduce((plantTotal, cost) => plantTotal + cost, 0);
        }, 0);
        const minimumExpectedReserve = Math.max(0, recordedDrops - investedDrops);
        if (this.wateringCans < minimumExpectedReserve) {
          this.wateringCans = minimumExpectedReserve;
          localStorage.setItem("chelie-watering-cans", String(this.wateringCans));
        }
        localStorage.setItem(reserveReconciliationMarker, "done");
      }`,
        );
      }

      // Retire uniquement le bloc de maîtrise permanente de la page des mondes.
      const homeMasteryPattern = /\n    this\.add\.text\(homeCenterX, \d+, `SERRE PERMANENTE[\s\S]*?\n    this\.makeButton\(homeCenterX, \d+, \d+, \d+, "OPTIONS ET AIDE"[\s\S]*?\.setDepth\(32\);/;
      if (homeMasteryPattern.test(transformed)) {
        transformed = transformed.replace(
          homeMasteryPattern,
          '\n\n    this.makeButton(homeCenterX, 1150, 330, 50, "OPTIONS ET AIDE", 0x315968, () => this.showHomeOptions())\n      .setDepth(32);',
        );
      }

      transformed = transformed.replace('"GUIDE DES GOUTTES"', '"SERRE PERMANENTE"');

      if (transformed.includes('"Touchez une fleur pour utiliser vos gouttes')) {
        return transformed === code ? null : { code: transformed, map: null };
      }

      const guideMasteryPattern = /    const levelsTitle = this\.add\.text\(guideCenterX, \d+, "NIVEAUX PERMANENTS", \{[\s\S]*?    guide\.add\(\[veil, panel, title, balance, explanation, rewards, levelsTitle, \.\.\.rows, total, distinction, close\]\);/;

      if (guideMasteryPattern.test(transformed)) {
        const interactiveGuide = `    const greenhouseHint = this.add.text(guideCenterX, 590,
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
      const level = this.add.text(12, -20, "NIV. " + mastery + "/5", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: mastery >= MASTERY_COSTS.length ? "#ffe89a" : "#dffaff",
        fontStyle: "bold",
      }).setOrigin(0.5);
      const costText = this.add.text(12, 18, cost === null ? "MAX" : "PROCHAIN · 💧 " + cost, {
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
        if (cost === null) return;
        if (this.wateringCans < cost) {
          this.cameras.main.shake(110, 0.0015);
          return;
        }
        this.wateringCans -= cost;
        this.plantMastery[kind] += 1;
        this.savePermanentProgress();
        guide.destroy(true);
        this.showWateringGuide();
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

    const resetDrops = this.makeButton(guideCenterX - 170, 1125, 300, 56, "RÉINITIALISER", 0x7f1d2d, () => {
      const confirmed = typeof window === "undefined"
        ? true
        : window.confirm("Réinitialiser les améliorations permanentes des fleurs ? Toutes les gouttes dépensées seront remboursées dans votre réserve.");
      if (!confirmed) return;
      const refundedDrops = (Object.keys(TOWERS) as TowerKind[]).reduce((total, kind) => {
        const mastery = this.plantMastery[kind];
        return total + MASTERY_COSTS
          .slice(0, mastery)
          .reduce((plantTotal, cost) => plantTotal + cost, 0);
      }, 0);
      this.wateringCans += refundedDrops;
      this.plantMastery = { harpoon: 0, flak: 0, pulse: 0, cryo: 0 };
      this.savePermanentProgress();
      guide.destroy(true);
      this.showWateringGuide();
    });
    const close = this.makeButton(guideCenterX + 170, 1125, 220, 56, "FERMER", 0x0f766e, () => guide.destroy(true));
    guide.add([veil, panel, title, balance, explanation, rewards, greenhouseHint, ...masteryCards, distinction, resetDrops, close]);`;

        transformed = transformed.replace(guideMasteryPattern, interactiveGuide);
      }

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
