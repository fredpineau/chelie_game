import type { Plugin } from "vite";

/** Visual-only accent for BIOME 02. No gameplay logic is changed. */
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
      const helper = `  private createWorld2CanopyOverlay(): void {\n    if (this.levelIndex !== 1) return;\n\n    const overlay = this.add.graphics();\n    overlay.fillStyle(0x2f7a46, 0.16);\n    overlay.fillRect(0, 0, WIDTH, HEIGHT - 270);\n\n    const foliage = this.add.graphics();\n    const leaves = [\n      [48, 150, 96, 58, -0.45], [108, 205, 112, 64, 0.35], [175, 125, 104, 58, -0.2],\n      [WIDTH - 55, 175, 108, 64, 0.5], [WIDTH - 122, 238, 118, 68, -0.35], [WIDTH - 184, 132, 100, 56, 0.22],\n      [58, 760, 116, 70, 0.35], [128, 830, 110, 64, -0.42], [WIDTH - 65, 735, 120, 72, -0.28],\n      [WIDTH - 138, 825, 112, 66, 0.4], [210, 92, 122, 62, 0.08], [WIDTH - 235, 92, 126, 66, -0.12],\n    ];\n    foliage.fillStyle(0x1f5f36, 0.82);\n    leaves.forEach(([x, y, w, h, rotation]) => {\n      foliage.fillEllipse(x, y, w, h);\n      const vein = this.add.line(0, 0, x - w * 0.28, y, x + w * 0.28, y, 0x9ac77d, 0.45)\n        .setOrigin(0, 0)\n        .setRotation(rotation);\n      vein.setDepth(1);\n    });\n\n    const canopyShade = this.add.graphics();\n    canopyShade.fillStyle(0x173d27, 0.2);\n    canopyShade.fillEllipse(WIDTH / 2, 35, WIDTH * 0.92, 150);\n    canopyShade.fillStyle(0x6fbf67, 0.1);\n    canopyShade.fillEllipse(WIDTH / 2, 510, WIDTH * 0.72, 520);\n  }\n\n`;

      if (transformed.includes(anchor) && !transformed.includes("private createWorld2CanopyOverlay")) {
        transformed = transformed.replace(anchor, helper + anchor);
      }

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
