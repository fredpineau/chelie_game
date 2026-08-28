import type { Plugin } from "vite";

export function endgameProgression(): Plugin {
  return {
    name: "endgame-progression",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      let transformed = code;

      transformed = transformed.replace(
        '    this.selectionPage = Phaser.Math.Clamp(data.selectionPage ?? 0, 0, 1);',
        '    this.selectionPage = Phaser.Math.Clamp(data.selectionPage ?? 0, 0, 2);',
      );

      const oldLevels = `const LEVELS: LevelDefinition[] = [\n  { name: "Marais affamé", code: "BIOME 01", waves: 10, healthMultiplier: 1.15, speedMultiplier: 0.98, swarmBonus: 2 },\n  { name: "Canopée hostile", code: "BIOME 02", waves: 15, healthMultiplier: 1.38, speedMultiplier: 1.04, swarmBonus: 3 },\n  { name: "Serre écarlate", code: "BIOME 03", waves: 20, healthMultiplier: 1.65, speedMultiplier: 1.10, swarmBonus: 5 },\n  { name: "Tourbière noire", code: "BIOME 04", waves: 25, healthMultiplier: 1.95, speedMultiplier: 1.16, swarmBonus: 6 },\n  { name: "Jardin primordial", code: "BIOME 05", waves: 30, healthMultiplier: 2.30, speedMultiplier: 1.22, swarmBonus: 8 },\n  { name: "Fosse des spores", code: "BIOME 06", waves: 35, healthMultiplier: 2.70, speedMultiplier: 1.29, swarmBonus: 10 },\n  { name: "Delta vorace", code: "BIOME 07", waves: 40, healthMultiplier: 3.15, speedMultiplier: 1.36, swarmBonus: 12 },\n  { name: "Crypte chlorophylle", code: "BIOME 08", waves: 45, healthMultiplier: 3.65, speedMultiplier: 1.43, swarmBonus: 14 },\n  { name: "Cime parasitaire", code: "BIOME 09", waves: 50, healthMultiplier: 4.20, speedMultiplier: 1.50, swarmBonus: 16 },\n  { name: "Nécropole florale", code: "BIOME 10", waves: 55, healthMultiplier: 4.85, speedMultiplier: 1.57, swarmBonus: 19 },\n  { name: "Tourbière souveraine", code: "BIOME 11", waves: 60, healthMultiplier: 5.60, speedMultiplier: 1.65, swarmBonus: 22 },\n  { name: "Floraison éternelle", code: "MODE INFINI", waves: null, healthMultiplier: 6.40, speedMultiplier: 1.72, swarmBonus: 24 },\n];`;
      const newLevels = `const LEVELS: LevelDefinition[] = [\n  { name: "Marais affamé", code: "BIOME 01", waves: 10, healthMultiplier: 1.15, speedMultiplier: 0.98, swarmBonus: 2 },\n  { name: "Canopée hostile", code: "BIOME 02", waves: 15, healthMultiplier: 1.38, speedMultiplier: 1.04, swarmBonus: 3 },\n  { name: "Serre écarlate", code: "BIOME 03", waves: 20, healthMultiplier: 1.65, speedMultiplier: 1.10, swarmBonus: 5 },\n  { name: "Tourbière noire", code: "BIOME 04", waves: 25, healthMultiplier: 1.95, speedMultiplier: 1.16, swarmBonus: 6 },\n  { name: "Jardin primordial", code: "BIOME 05", waves: 30, healthMultiplier: 2.30, speedMultiplier: 1.22, swarmBonus: 8 },\n  { name: "Fosse des spores", code: "BIOME 06", waves: 35, healthMultiplier: 2.70, speedMultiplier: 1.29, swarmBonus: 10 },\n  { name: "Delta vorace", code: "BIOME 07", waves: 40, healthMultiplier: 3.15, speedMultiplier: 1.36, swarmBonus: 12 },\n  { name: "Crypte chlorophylle", code: "BIOME 08", waves: 45, healthMultiplier: 3.65, speedMultiplier: 1.43, swarmBonus: 14 },\n  { name: "Cime parasitaire", code: "BIOME 09", waves: 50, healthMultiplier: 4.20, speedMultiplier: 1.50, swarmBonus: 16 },\n  { name: "Nécropole florale", code: "BIOME 10", waves: 55, healthMultiplier: 4.85, speedMultiplier: 1.57, swarmBonus: 19 },\n  { name: "Tourbière souveraine", code: "BIOME 11", waves: 60, healthMultiplier: 5.60, speedMultiplier: 1.65, swarmBonus: 22 },\n  { name: "Marais fracturé", code: "BIOME 12", waves: 48, healthMultiplier: 6.15, speedMultiplier: 1.69, swarmBonus: 24 },\n  { name: "Essaim chimérique", code: "BIOME 13", waves: 50, healthMultiplier: 6.75, speedMultiplier: 1.73, swarmBonus: 25 },\n  { name: "Ruche des alphas", code: "BIOME 14", waves: 55, healthMultiplier: 7.40, speedMultiplier: 1.77, swarmBonus: 27 },\n  { name: "Nexus carnivore", code: "BIOME 15", waves: 60, healthMultiplier: 8.10, speedMultiplier: 1.82, swarmBonus: 29 },\n  { name: "Floraison éternelle", code: "MODE INFINI", waves: null, healthMultiplier: 8.60, speedMultiplier: 1.86, swarmBonus: 30 },\n];`;
      transformed = transformed.replace(oldLevels, newLevels);

      const oldTabs = `    const firstPage = this.makeButton(homeCenterX - 110, 306, 200, 46, "MONDES 1–6", this.selectionPage === 0 ? 0x4d8f82 : 0x294f58, () => {\n      this.scene.restart({ home: true, selectionPage: 0 });\n    }).setDepth(32);\n    const secondPage = this.makeButton(homeCenterX + 110, 306, 200, 46, "MONDES 7–12", this.selectionPage === 1 ? 0x4d8f82 : 0x294f58, () => {\n      this.scene.restart({ home: true, selectionPage: 1 });\n    }).setDepth(32);\n    if (unlocked < 6) secondPage.setAlpha(0.62);`;
      const newTabs = `    const firstPage = this.makeButton(homeCenterX - 215, 306, 190, 46, "MONDES 1–6", this.selectionPage === 0 ? 0x4d8f82 : 0x294f58, () => {\n      this.scene.restart({ home: true, selectionPage: 0 });\n    }).setDepth(32);\n    const secondPage = this.makeButton(homeCenterX, 306, 190, 46, "MONDES 7–12", this.selectionPage === 1 ? 0x4d8f82 : 0x294f58, () => {\n      this.scene.restart({ home: true, selectionPage: 1 });\n    }).setDepth(32);\n    const thirdPage = this.makeButton(homeCenterX + 215, 306, 190, 46, "MONDES 13–15", this.selectionPage === 2 ? 0x4d8f82 : 0x294f58, () => {\n      this.scene.restart({ home: true, selectionPage: 2 });\n    }).setDepth(32);\n    if (unlocked < 6) secondPage.setAlpha(0.62);\n    if (unlocked < 12) thirdPage.setAlpha(0.62);`;
      transformed = transformed.replace(oldTabs, newTabs);

      transformed = transformed.replace(
        '    const biomeColors = [0x4f8068, 0x477f78, 0x9a555d, 0x475965, 0x6d7849, 0x527060, 0x3f7172, 0x54645f, 0x775361, 0x594c68, 0x4b6051, 0x596337];',
        '    const biomeColors = [0x4f8068, 0x477f78, 0x9a555d, 0x475965, 0x6d7849, 0x527060, 0x3f7172, 0x54645f, 0x775361, 0x594c68, 0x4b6051, 0x596337, 0x496b74, 0x65516f, 0x7a4b50, 0x394f4a];',
      );
      transformed = transformed.replace(
        '    const biomeAccents = [0xa8d5a2, 0x91d4c8, 0xf1a3a9, 0x9eb9c6, 0xc5d58b, 0x9cc8ae, 0x85d4d0, 0xa7c6b7, 0xd6a1b4, 0xb9a4d4, 0x9dc5a7, 0xe0d27d];',
        '    const biomeAccents = [0xa8d5a2, 0x91d4c8, 0xf1a3a9, 0x9eb9c6, 0xc5d58b, 0x9cc8ae, 0x85d4d0, 0xa7c6b7, 0xd6a1b4, 0xb9a4d4, 0x9dc5a7, 0x9fdde4, 0xc9a8de, 0xf0a0a6, 0xa7d4bc, 0xe0d27d];',
      );
      transformed = transformed.replace(
        '    const biomeIcons = ["✦", "⌁", "✹", "◆", "♣", "✧", "≋", "⬟", "✣", "◇", "♠", "∞"];',
        '    const biomeIcons = ["✦", "⌁", "✹", "◆", "♣", "✧", "≋", "⬟", "✣", "◇", "♠", "⌘", "✥", "⚜", "✺", "∞"];',
      );

      transformed = transformed.replace(
        '      const waveLabel = level.waves === null ? "VAGUES INFINIES" : "MENACE CROISSANTE";',
        '      const waveLabel = level.waves === null ? "VAGUES INFINIES" : index === 11 ? "ROUTES FRACTURÉES" : index === 12 ? "ESSAIMS HYBRIDES" : index === 13 ? "ALPHAS FRÉQUENTS" : index === 14 ? "ÉPREUVE FINALE" : "MENACE CROISSANTE";',
      );

      const terrainTail = `      [["root", 0.25, 0.28, 44], ["peat", 0.72, 0.3, 42], ["sticky", 0.28, 0.72, 50], ["parasite", 0.7, 0.7, 54]],\n      [],\n    ];`;
      const endgameTerrainTail = `      [["root", 0.25, 0.28, 44], ["peat", 0.72, 0.3, 42], ["sticky", 0.28, 0.72, 50], ["parasite", 0.7, 0.7, 54]],\n      [["root", 0.48, 0.28, 48], ["spore", 0.26, 0.56, 42], ["sticky", 0.72, 0.52, 52], ["parasite", 0.52, 0.76, 52]],\n      [["root", 0.28, 0.28, 44], ["root", 0.72, 0.72, 44], ["spore", 0.68, 0.32, 42], ["parasite", 0.34, 0.70, 52]],\n      [["sticky", 0.22, 0.36, 50], ["sticky", 0.72, 0.66, 50], ["root", 0.52, 0.50, 46], ["parasite", 0.78, 0.28, 50], ["spore", 0.28, 0.78, 40]],\n      [["root", 0.22, 0.30, 44], ["root", 0.78, 0.70, 44], ["sticky", 0.70, 0.30, 50], ["parasite", 0.30, 0.70, 52], ["spore", 0.50, 0.50, 42]],\n      [],\n    ];`;
      transformed = transformed.replace(terrainTail, endgameTerrainTail);

      const oldTraits = `  private getEnemyTrait(isBoss: boolean): EnemyTrait {\n    if (isBoss) return "armored";\n    const profile = this.getWaveProfile();\n    if (profile === 0) return this.spawnedThisWave % 3 === 2 ? "normal" : "armored";\n    if (profile === 1) return this.spawnedThisWave % 3 === 2 ? "normal" : "swift";\n    if (profile === 2 && this.wave >= 3) return this.spawnedThisWave % 4 === 3 ? "regenerator" : "normal";\n    if (profile === 3) return this.spawnedThisWave % 2 === 0 ? "swift" : "normal";\n    return "normal";\n  }`;
      const newTraits = `  private getEnemyTrait(isBoss: boolean): EnemyTrait {\n    if (isBoss) return "armored";\n    if (this.levelIndex >= 12) {\n      const endgameTraits: EnemyTrait[] = this.levelIndex >= 14\n        ? ["armored", "swift", "regenerator", "swift", "armored", "normal"]\n        : ["armored", "swift", "regenerator", "normal"];\n      return endgameTraits[(this.spawnedThisWave + this.wave + this.levelIndex) % endgameTraits.length];\n    }\n    const profile = this.getWaveProfile();\n    if (profile === 0) return this.spawnedThisWave % 3 === 2 ? "normal" : "armored";\n    if (profile === 1) return this.spawnedThisWave % 3 === 2 ? "normal" : "swift";\n    if (profile === 2 && this.wave >= 3) return this.spawnedThisWave % 4 === 3 ? "regenerator" : "normal";\n    if (profile === 3) return this.spawnedThisWave % 2 === 0 ? "swift" : "normal";\n    return "normal";\n  }`;
      transformed = transformed.replace(oldTraits, newTraits);

      transformed = transformed.replace(
        `  private isBossWave(): boolean {\n    return this.wave > 0 && this.wave % 5 === 0;\n  }`,
        `  private isBossWave(): boolean {\n    const endgameBossRush = this.levelIndex === 13 || this.levelIndex === 14;\n    const interval = endgameBossRush ? 4 : 5;\n    return this.wave > 0 && this.wave % interval === 0;\n  }`,
      );

      const oldRouteOrders = `    const routeOrders = [\n      [0, 1], [2, 3], [0, 2, 1], [3, 1, 2],\n      [0, 3, 1, 2], [2, 1, 3, 0], [1, 3, 0], [2, 0, 3],\n      [3, 2, 1], [1, 0, 2, 3], [2, 3, 0, 1], [3, 0, 1, 2],\n    ];`;
      const newRouteOrders = `    const routeOrders = [\n      [0, 1], [2, 3], [0, 2, 1], [3, 1, 2],\n      [0, 3, 1, 2], [2, 1, 3, 0], [1, 3, 0], [2, 0, 3],\n      [3, 2, 1], [1, 0, 2, 3], [2, 3, 0, 1], [0, 2, 3, 1],\n      [3, 0, 2, 1], [2, 3, 1, 0], [1, 3, 0, 2], [0, 3, 2, 1],\n    ];`;
      transformed = transformed.replace(oldRouteOrders, newRouteOrders);

      return { code: transformed, map: null };
    },
  };
}
