import type { Plugin } from "vite";

/** Visual-only identity for BIOME 02. No gameplay logic is changed. */
// Deployment marker: forces Vercel to rebuild this known-good revision without changing runtime behavior.
export function world2CanopyVisual(): Plugin {
  return {
    name: "world-2-canopy-visual",
    enforce: "post",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;
      if (!code.includes("  private drawWorld(): void {")) return null;

      let transformed = code;

      transformed = transformed.replace(
        "    this.createMarshAtmosphere();",
        "    this.createMarshAtmosphere();\n    this.createWorld2CanopyOverlay();",
      );

      const anchor = "  private createFertileZones(): void {";
      const helper = `  private createWorld2CanopyOverlay(): void {\n    if (this.levelIndex !== 1) return;\n\n    // Strong emerald jungle wash, deliberately unmistakable versus BIOME 01.\n    const wash = this.add.graphics().setDepth(0.3);\n    wash.fillStyle(0x0d4d2d, 0.48);\n    wash.fillRect(0, 0, WIDTH, HEIGHT - 270);\n\n    // Dense dark canopy around the map edges. Purely decorative.\n    const canopy = this.add.graphics().setDepth(0.31);\n    canopy.fillStyle(0x0b2f1c, 0.96);\n    canopy.fillEllipse(18, 230, 250, 650);\n    canopy.fillEllipse(WIDTH - 18, 260, 270, 690);\n    canopy.fillEllipse(WIDTH / 2, 20, WIDTH * 0.98, 190);\n    canopy.fillEllipse(95, HEIGHT - 330, 340, 210);\n    canopy.fillEllipse(WIDTH - 95, HEIGHT - 330, 340, 210);\n\n    // Large tropical leaves frame the battlefield.\n    const foliage = this.add.graphics().setDepth(0.32);\n    const leaves = [\n      [45, 125, 135, 48, -0.65, 0x2f843f], [95, 220, 155, 54, 0.52, 0x3f9847],\n      [48, 360, 145, 50, -0.42, 0x2d7739], [92, 515, 150, 52, 0.45, 0x438f43],\n      [WIDTH - 45, 145, 145, 50, 0.64, 0x368b40], [WIDTH - 95, 255, 160, 55, -0.5, 0x439d49],\n      [WIDTH - 48, 400, 150, 52, 0.38, 0x2c7838], [WIDTH - 90, 560, 155, 54, -0.44, 0x449647],\n      [135, 58, 160, 54, 0.18, 0x3d9344], [285, 40, 175, 56, -0.15, 0x2f803d],\n      [WIDTH - 145, 62, 165, 54, -0.22, 0x429849], [WIDTH - 295, 42, 170, 56, 0.16, 0x327f3e],\n      [100, HEIGHT - 340, 165, 56, -0.3, 0x3d8d43], [230, HEIGHT - 315, 170, 58, 0.24, 0x2f7d3b],\n      [WIDTH - 105, HEIGHT - 345, 170, 58, 0.32, 0x429447], [WIDTH - 240, HEIGHT - 318, 175, 58, -0.25, 0x317d3c],\n    ] as const;\n\n    leaves.forEach(([x, y, w, h, rotation, color]) => {\n      foliage.fillStyle(color, 0.94);\n      foliage.fillEllipse(x, y, w, h);\n      const vein = this.add.line(0, 0, x - w * 0.3, y, x + w * 0.3, y, 0xb2d879, 0.52)\n        .setOrigin(0, 0)\n        .setRotation(rotation)\n        .setDepth(0.33)\n        .setLineWidth(2);\n      void vein;\n    });\n\n    // Hanging vines from the canopy.\n    const vines = this.add.graphics().setDepth(0.34);\n    vines.lineStyle(5, 0x2e6b31, 0.95);\n    [105, 205, 315, WIDTH - 115, WIDTH - 225, WIDTH - 325].forEach((x, index) => {\n      vines.beginPath();\n      vines.moveTo(x, 0);\n      vines.lineTo(x + (index % 2 === 0 ? 20 : -20), 70);\n      vines.lineTo(x + (index % 2 === 0 ? -8 : 8), 145);\n      vines.strokePath();\n    });\n\n    // Bright jungle pools/patches that stay visual only.\n    const jungleLight = this.add.graphics().setDepth(0.305);\n    jungleLight.fillStyle(0x59b84b, 0.18);\n    jungleLight.fillEllipse(235, 315, 280, 150);\n    jungleLight.fillEllipse(505, 610, 320, 170);\n    jungleLight.fillStyle(0x8fcf4d, 0.12);\n    jungleLight.fillEllipse(430, 190, 250, 110);\n\n    // Small luminous spores reinforce the tropical identity.\n    [\n      [92, 300], [165, 150], [WIDTH - 105, 330], [WIDTH - 185, 165],\n      [85, 610], [WIDTH - 92, 660], [175, HEIGHT - 365], [WIDTH - 175, HEIGHT - 380],\n    ].forEach(([x, y], index) => {\n      const glow = this.add.circle(x, y, 4 + (index % 2), 0xc7ff68, 0.8).setDepth(0.35);\n      this.tweens.add({ targets: glow, alpha: 0.22, yoyo: true, repeat: -1, duration: 1000 + index * 120 });\n    });\n  }\n\n`;

      if (transformed.includes(anchor) && !transformed.includes("private createWorld2CanopyOverlay")) {
        transformed = transformed.replace(anchor, helper + anchor);
      }

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
