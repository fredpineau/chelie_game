import type { Plugin } from "vite";

/** Purely decorative identity for BIOME 02. No gameplay object is changed. */
export function worldTwoStrongVisual(): Plugin {
  return {
    name: "world-two-strong-visual",
    enforce: "post",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const anchor = "    this.createMarshAtmosphere();";
      if (!code.includes(anchor)) return null;

      const replacement = `${anchor}\n    if (this.levelIndex === 1) {\n      const canopy = this.add.graphics().setDepth(0.35);\n\n      // Dense emerald wash: intentionally very different from BIOME 01.\n      canopy.fillStyle(0x123f2c, 0.34);\n      canopy.fillRect(0, 0, WIDTH, HEIGHT - 270);\n\n      // Dark jungle canopy framing the playable area without creating obstacles.\n      canopy.fillStyle(0x163c25, 0.94);\n      canopy.fillEllipse(45, 210, 240, 500);\n      canopy.fillEllipse(WIDTH - 45, 245, 260, 540);\n      canopy.fillEllipse(180, 38, 430, 150);\n      canopy.fillEllipse(WIDTH - 170, 42, 450, 160);\n      canopy.fillEllipse(90, HEIGHT - 345, 300, 190);\n      canopy.fillEllipse(WIDTH - 95, HEIGHT - 350, 320, 200);\n\n      canopy.fillStyle(0x2f713a, 0.92);\n      const leaves = [\n        [58, 155, 95, 38, -0.65], [105, 235, 120, 44, 0.5], [48, 355, 105, 40, -0.35],\n        [WIDTH - 58, 170, 105, 40, 0.62], [WIDTH - 98, 285, 125, 46, -0.5], [WIDTH - 48, 405, 110, 42, 0.38],\n        [145, 62, 115, 42, 0.2], [285, 42, 125, 44, -0.18], [WIDTH - 155, 64, 120, 42, -0.22],\n        [105, HEIGHT - 330, 125, 45, -0.3], [WIDTH - 110, HEIGHT - 335, 135, 46, 0.32],\n      ] as const;\n      leaves.forEach(([x, y, w, h, rotation]) => {\n        canopy.fillEllipse(x, y, w, h);\n        const vein = this.add.line(0, 0, x - w * 0.28, y, x + w * 0.28, y, 0xa0c96b, 0.38)\n          .setOrigin(0, 0)\n          .setRotation(rotation)\n          .setDepth(0.36)\n          .setLineWidth(2);\n        void vein;\n      });\n\n      // Bright tropical leaves and hanging vines make the biome recognizable at a glance.\n      canopy.fillStyle(0x66a83f, 0.8);\n      canopy.fillEllipse(72, 465, 105, 34);\n      canopy.fillEllipse(WIDTH - 72, 520, 112, 36);\n      canopy.fillEllipse(205, 82, 100, 32);\n      canopy.fillEllipse(WIDTH - 230, 88, 108, 34);\n\n      const vines = this.add.graphics().setDepth(0.37);\n      vines.lineStyle(5, 0x315f2d, 0.88);\n      [125, 225, WIDTH - 145, WIDTH - 245].forEach((x, index) => {\n        vines.beginPath();\n        vines.moveTo(x, 0);\n        vines.lineTo(x + (index % 2 === 0 ? 18 : -18), 58);\n        vines.lineTo(x + (index % 2 === 0 ? -4 : 4), 118);\n        vines.strokePath();\n      });\n\n      // A few luminous jungle specks, decorative only.\n      [\n        [95, 305], [165, 130], [WIDTH - 105, 350], [WIDTH - 185, 145],\n        [92, 625], [WIDTH - 88, 690], [175, HEIGHT - 365], [WIDTH - 175, HEIGHT - 380],\n      ].forEach(([x, y], index) => {\n        const glow = this.add.circle(x, y, 3 + (index % 2), 0xb8f36b, 0.72).setDepth(0.38);\n        this.tweens.add({ targets: glow, alpha: 0.18, yoyo: true, repeat: -1, duration: 1100 + index * 130 });\n      });\n    }`;

      const transformed = code.replace(anchor, replacement);
      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
