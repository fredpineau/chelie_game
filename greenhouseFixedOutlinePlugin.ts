import type { Plugin } from "vite";

export function greenhouseFixedOutline(): Plugin {
  return {
    name: "greenhouse-fixed-outline",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      let transformed = code;

      // Retire complètement l'accès à la serre de la page de sélection des mondes.
      const oldHomeBlock = `    const greenhouseGlow = this.add.rectangle(homeCenterX, 1025, 520, 78, 0x7de3d5, 0.12)\n      .setStrokeStyle(3, 0xa7f3e6, 0.65)\n      .setDepth(31);\n    const greenhouseButton = this.makeButton(homeCenterX, 1025, 500, 68, \`🌱 SERRE PERMANENTE  ·  💧 \${this.wateringCans}  ›\`, 0x0f766e, () => this.showPermanentGreenhouse())\n      .setDepth(32);\n    this.tweens.add({\n      targets: greenhouseGlow,\n      alpha: 0.28,\n      scaleX: 1.03,\n      scaleY: 1.08,\n      yoyo: true,\n      repeat: -1,\n      duration: 1400,\n      ease: "Sine.easeInOut",\n    });\n    greenhouseButton.on("pointerover", () => greenhouseButton.setScale(1.035));\n    greenhouseButton.on("pointerout", () => greenhouseButton.setScale(1));`;
      transformed = transformed.replace(oldHomeBlock, "");

      // Décale À L'ATTAQUE vers la droite pour laisser une vraie respiration à la serre.
      transformed = transformed.replace(
        '    const attackButton = this.add.container(WIDTH / 2 - 25, HEIGHT - 42);',
        '    const attackButton = this.add.container(WIDTH / 2 + 10, HEIGHT - 42);',
      );

      // Place la serre dans la barre d'action de la map, à gauche de À L'ATTAQUE,
      // avec le même langage visuel : fond sombre, contour turquoise et coins arrondis.
      const attackAnchor = `    this.startButton = attackButton;\n\n    const pauseButton = this.add.container(WIDTH - 83, HEIGHT - 42);`;
      const mapGreenhouse = `    this.startButton = attackButton;\n\n    const greenhouseMapButton = this.add.container(96, HEIGHT - 42);\n    const greenhouseShadow = this.add.graphics();\n    greenhouseShadow.fillStyle(0x071a20, 0.4);\n    greenhouseShadow.fillRoundedRect(-82, -30, 164, 64, 18);\n    const greenhouseBackground = this.add.graphics();\n    greenhouseBackground.fillStyle(0x123f3b, 1);\n    greenhouseBackground.fillRoundedRect(-80, -32, 160, 64, 18);\n    greenhouseBackground.lineStyle(3, 0x70c9ae, 0.98);\n    greenhouseBackground.strokeRoundedRect(-80, -32, 160, 64, 18);\n    greenhouseBackground.lineStyle(1, 0xc0f1dc, 0.26);\n    greenhouseBackground.strokeRoundedRect(-74, -26, 148, 52, 15);\n    const greenhouseLabel = this.add.text(0, 0, \`🌱 SERRE · 💧 \${this.wateringCans}\`, {\n      fontFamily: "Arial",\n      fontSize: "17px",\n      color: "#ffffff",\n      fontStyle: "bold",\n      stroke: "#071a20",\n      strokeThickness: 2,\n    }).setOrigin(0.5);\n    greenhouseMapButton.add([greenhouseShadow, greenhouseBackground, greenhouseLabel]);\n    greenhouseMapButton.setSize(160, 64).setInteractive({ useHandCursor: true });\n    greenhouseMapButton.on("pointerover", () => greenhouseMapButton.setScale(1.02));\n    greenhouseMapButton.on("pointerout", () => greenhouseMapButton.setScale(1));\n    greenhouseMapButton.on("pointerdown", () => this.showPermanentGreenhouse());\n\n    const pauseButton = this.add.container(WIDTH - 83, HEIGHT - 42);`;
      transformed = transformed.replace(attackAnchor, mapGreenhouse);

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
