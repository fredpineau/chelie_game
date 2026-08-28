import type { Plugin } from "vite";

export function realisticEnemyVisuals(): Plugin {
  return {
    name: "realistic-enemy-visuals",
    enforce: "post",
    transform(code, id) {
      // Vite appelle aussi les hooks transform pour index.html pendant vite:build-html.
      // Ne jamais tenter d'appliquer les remplacements Phaser à ces modules.
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const createAnchor = "  create(): void {";
      if (!code.includes(createAnchor)) throw new Error("Scene create anchor not found; enemy sprites were not loaded.");
      const preloadBlock = `  preload(): void {\n    this.load.svg("enemy-ground-art", "/assets/enemies/beetle.svg", { width: 96, height: 96 });\n    this.load.svg("enemy-air-art", "/assets/enemies/wasp.svg", { width: 96, height: 96 });\n    this.load.svg("enemy-ground-boss-art", "/assets/enemies/beetle-boss.svg", { width: 112, height: 112 });\n    this.load.svg("enemy-air-boss-art", "/assets/enemies/wasp-boss.svg", { width: 112, height: 112 });\n  }\n\n`;
      let transformed = code.replace(createAnchor, preloadBlock + createAnchor);

      const spawnAnchor = "  private spawnEnemy(kind: EnemyKind, isBoss = false): void {";
      if (!transformed.includes(spawnAnchor)) throw new Error("Enemy spawn anchor not found; prerendered visuals were not applied.");
      const visualStart = transformed.indexOf("    const shadow = this.add.ellipse(", transformed.indexOf(spawnAnchor));
      const healthAnchor = "    const healthBarWidth = isBoss ? 82 : 48;";
      const visualEnd = transformed.indexOf(healthAnchor, visualStart);
      if (visualStart < 0 || visualEnd < 0) throw new Error("Enemy visual block not found; prerendered visuals were not applied.");

      const visualBlock = `    const shadow = this.add.ellipse(\n      0,\n      kind === "air" ? 24 : 17,\n      kind === "air" ? (isBoss ? 39 : 32) : (isBoss ? 55 : 46),\n      kind === "air" ? (isBoss ? 8 : 6) : (isBoss ? 12 : 10),\n      0x010403,\n      kind === "air" ? 0.22 : 0.44,\n    );\n    const textureKey = kind === "air"\n      ? (isBoss ? "enemy-air-boss-art" : "enemy-air-art")\n      : (isBoss ? "enemy-ground-boss-art" : "enemy-ground-art");\n    const visual = this.add.image(0, kind === "air" ? -4 : 0, textureKey);\n    // Le style change nettement, mais l'encombrement reste volontairement\n    // contenu afin que les ennemis ne masquent pas les fleurs voisines.\n    const displaySize = isBoss ? (kind === "air" ? 72 : 70) : (kind === "air" ? 58 : 56);\n    visual.setDisplaySize(displaySize, displaySize);\n    if (!isBoss) {\n      if (trait === "armored") visual.setTint(kind === "air" ? 0xd9e5e8 : 0xc8baa5);\n      else if (trait === "swift") visual.setTint(kind === "air" ? 0xffddb0 : 0xe6c47b);\n      else if (trait === "regenerator") visual.setTint(kind === "air" ? 0xc8f0d8 : 0xa9cc98);\n    }\n    const insectParts: Phaser.GameObjects.GameObject[] = [shadow, visual];\n    if (kind === "air") {\n      this.tweens.add({ targets: visual, y: visual.y - (isBoss ? 4 : 3), yoyo: true, repeat: -1, duration: isBoss ? 320 : 220, ease: "Sine.easeInOut" });\n      this.tweens.add({ targets: visual, angle: isBoss ? 1.2 : 2, yoyo: true, repeat: -1, duration: isBoss ? 430 : 280, ease: "Sine.easeInOut" });\n    }\n`;

      transformed = transformed.slice(0, visualStart) + visualBlock + transformed.slice(visualEnd);
      return { code: transformed, map: null };
    },
  };
}
