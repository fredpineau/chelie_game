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

      // Place la serre dans la barre d'action de la map, à gauche du bouton À L'ATTAQUE.
      const attackAnchor = `    this.startButton = attackButton;\n\n    const pauseButton = this.add.container(WIDTH - 83, HEIGHT - 42);`;
      const mapGreenhouse = `    this.startButton = attackButton;\n\n    const greenhouseMapOutline = this.add.rectangle(104, HEIGHT - 42, 182, 70, 0x0f766e, 0)\n      .setStrokeStyle(3, 0xa7f3e6, 0.9);\n    const greenhouseMapButton = this.makeButton(104, HEIGHT - 42, 170, 60, \`🌱 SERRE · 💧 \${this.wateringCans}\`, 0x0f766e, () => this.showPermanentGreenhouse());\n    greenhouseMapButton.on("pointerover", () => greenhouseMapButton.setScale(1.02));\n    greenhouseMapButton.on("pointerout", () => greenhouseMapButton.setScale(1));\n\n    const pauseButton = this.add.container(WIDTH - 83, HEIGHT - 42);`;
      transformed = transformed.replace(attackAnchor, mapGreenhouse);

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
