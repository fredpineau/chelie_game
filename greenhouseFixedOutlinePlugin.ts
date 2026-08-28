import type { Plugin } from "vite";

export function greenhouseFixedOutline(): Plugin {
  return {
    name: "greenhouse-fixed-outline",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const oldBlock = `    const greenhouseGlow = this.add.rectangle(homeCenterX, 1025, 520, 78, 0x7de3d5, 0.12)\n      .setStrokeStyle(3, 0xa7f3e6, 0.65)\n      .setDepth(31);\n    const greenhouseButton = this.makeButton(homeCenterX, 1025, 500, 68, \`🌱 SERRE PERMANENTE  ·  💧 \${this.wateringCans}  ›\`, 0x0f766e, () => this.showPermanentGreenhouse())\n      .setDepth(32);\n    this.tweens.add({\n      targets: greenhouseGlow,\n      alpha: 0.28,\n      scaleX: 1.03,\n      scaleY: 1.08,\n      yoyo: true,\n      repeat: -1,\n      duration: 1400,\n      ease: "Sine.easeInOut",\n    });\n    greenhouseButton.on("pointerover", () => greenhouseButton.setScale(1.035));\n    greenhouseButton.on("pointerout", () => greenhouseButton.setScale(1));`;

      const newBlock = `    this.add.rectangle(WIDTH - 108, 238, 188, 50, 0x0f766e, 0)\n      .setStrokeStyle(3, 0xa7f3e6, 0.9)\n      .setDepth(31);\n    const greenhouseButton = this.makeButton(WIDTH - 108, 238, 176, 42, \`🌱 SERRE  ·  💧 \${this.wateringCans}\`, 0x0f766e, () => this.showPermanentGreenhouse())\n      .setDepth(32);\n    greenhouseButton.on("pointerover", () => greenhouseButton.setScale(1.02));\n    greenhouseButton.on("pointerout", () => greenhouseButton.setScale(1));`;

      if (!code.includes(oldBlock)) return null;
      return { code: code.replace(oldBlock, newBlock), map: null };
    },
  };
}
