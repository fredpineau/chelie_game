import type { Plugin } from "vite";

export function realisticEnemyVisuals(): Plugin {
  return {
    name: "realistic-enemy-visuals",
    // Important : le remplacement doit être fait sur le TypeScript source.
    // En post-transform, Vite/esbuild a déjà réécrit les signatures de méthodes
    // et le plugin ne trouvait plus create()/spawnEnemy(), donc les anciens
    // monstres vectoriels restaient affichés.
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const createAnchor = "  create(): void {";
      const spawnAnchor = "  private spawnEnemy(kind: EnemyKind, isBoss = false): void {";
      if (!code.includes(createAnchor) || !code.includes(spawnAnchor)) return null;

      const preloadBlock = `  preload(): void {\n    this.load.svg("enemy-ground-art", "/assets/enemies/beetle.svg", { width: 96, height: 96 });\n    this.load.svg("enemy-air-art", "/assets/enemies/wasp.svg", { width: 96, height: 96 });\n    this.load.svg("enemy-ground-boss-art", "/assets/enemies/beetle-boss.svg", { width: 112, height: 112 });\n    this.load.svg("enemy-air-boss-art", "/assets/enemies/wasp-boss.svg", { width: 112, height: 112 });\n  }\n\n`;
      let transformed = code.replace(createAnchor, preloadBlock + createAnchor);

      const visualStart = transformed.indexOf("    const shadow = this.add.ellipse(", transformed.indexOf(spawnAnchor));
      const healthAnchor = "    const healthBarWidth = isBoss ? 82 : 48;";
      const visualEnd = transformed.indexOf(healthAnchor, visualStart);
      if (visualStart < 0 || visualEnd < 0) return null;

      const visualBlock = `    const shadow = this.add.ellipse(\n      0,\n      kind === "air" ? 24 : 17,\n      kind === "air" ? (isBoss ? 39 : 32) : (isBoss ? 55 : 46),\n      kind === "air" ? (isBoss ? 8 : 6) : (isBoss ? 12 : 10),\n      0x010403,\n      kind === "air" ? 0.22 : 0.44,\n    );\n    const textureKey = kind === "air"\n      ? (isBoss ? "enemy-air-boss-art" : "enemy-air-art")\n      : (isBoss ? "enemy-ground-boss-art" : "enemy-ground-art");\n    const visual = this.add.image(0, kind === "air" ? -4 : 0, textureKey);\n    const displaySize = isBoss ? (kind === "air" ? 72 : 70) : (kind === "air" ? 58 : 56);\n    visual.setDisplaySize(displaySize, displaySize);\n    if (!isBoss) {\n      if (trait === "armored") visual.setTint(kind === "air" ? 0xd9e5e8 : 0xc8baa5);\n      else if (trait === "swift") visual.setTint(kind === "air" ? 0xffddb0 : 0xe6c47b);\n      else if (trait === "regenerator") visual.setTint(kind === "air" ? 0xc8f0d8 : 0xa9cc98);\n    }\n    const insectParts: Phaser.GameObjects.GameObject[] = [shadow, visual];\n    if (kind === "air") {\n      this.tweens.add({ targets: visual, y: visual.y - (isBoss ? 4 : 3), yoyo: true, repeat: -1, duration: isBoss ? 320 : 220, ease: "Sine.easeInOut" });\n      this.tweens.add({ targets: visual, angle: isBoss ? 1.2 : 2, yoyo: true, repeat: -1, duration: isBoss ? 430 : 280, ease: "Sine.easeInOut" });\n    }\n`;

      transformed = transformed.slice(0, visualStart) + visualBlock + transformed.slice(visualEnd);

      const labelStartAnchor = '    const typeName = kind === "air" ? "VOLANT" : "TERRIEN";';
      const containerAddAnchor = '    container.add([...insectParts, healthBg, healthBar, ...(bossLabel ? [bossLabel] : []), ...(traitLabel ? [traitLabel] : [])]);';
      const labelStart = transformed.indexOf(labelStartAnchor, transformed.indexOf(spawnAnchor));
      const containerAdd = transformed.indexOf(containerAddAnchor, labelStart);
      if (labelStart >= 0 && containerAdd >= 0) {
        const labelEnd = containerAdd + containerAddAnchor.length;
        transformed = transformed.slice(0, labelStart)
          + '    container.add([...insectParts, healthBg, healthBar]);'
          + transformed.slice(labelEnd);
      }

      // Quand beaucoup d'ennemis sont présents, leur recalcul de chemin est étalé
      // sur plusieurs frames pour préserver la fluidité. Les ennemis proches de la
      // plante fraîchement posée doivent toutefois être recalculés immédiatement.
      transformed = transformed.replace(
        '    this.recalculateEnemyPaths();',
        '    this.recalculateEnemyPaths(towerX, towerY);',
      );

      const recalcStartAnchor = '  private recalculateEnemyPaths(): void {';
      const recalcEndAnchor = '  private hasGridPath(';
      const recalcStart = transformed.indexOf(recalcStartAnchor);
      const recalcEnd = transformed.indexOf(recalcEndAnchor, recalcStart);
      if (recalcStart >= 0 && recalcEnd >= 0) {
        const recalcBlock = `  private recalculateEnemyPaths(urgentX?: number, urgentY?: number): void {\n    const version = ++this.pathRecalculationVersion;\n    const activeEnemies = [...this.enemies];\n    const recalculate = (enemy: Enemy): void => {\n      if (version !== this.pathRecalculationVersion || !enemy.body.active || !this.enemies.includes(enemy)) return;\n      this.recalculateEnemyPath(enemy);\n    };\n\n    let deferredEnemies = activeEnemies;\n    if (urgentX !== undefined && urgentY !== undefined) {\n      const urgentRadius = PLANT_FRAME_SIZE * 3;\n      const urgentRadiusSquared = urgentRadius * urgentRadius;\n      deferredEnemies = [];\n      activeEnemies.forEach((enemy) => {\n        const distanceSquared = Phaser.Math.Distance.Squared(enemy.body.x, enemy.body.y, urgentX, urgentY);\n        if (distanceSquared <= urgentRadiusSquared) recalculate(enemy);\n        else deferredEnemies.push(enemy);\n      });\n    }\n\n    const enemiesPerFrame = 6;\n    deferredEnemies.forEach((enemy, index) => {\n      const delay = 1 + Math.floor(index / enemiesPerFrame) * 16;\n      this.time.delayedCall(delay, () => recalculate(enemy));\n    });\n  }\n\n`;
        transformed = transformed.slice(0, recalcStart) + recalcBlock + transformed.slice(recalcEnd);
      }

      // Progression permanente : les cinq paliers deviennent atteignables pendant
      // la campagne, tout en conservant une vraie valeur aux gouttes du mode infini.
      transformed = transformed.replace(
        'const MASTERY_COSTS = [100, 200, 300, 400, 500];',
        'const MASTERY_COSTS = [15, 30, 60, 100, 150];',
      );

      // Courbe des mondes lissée : chaque biome augmente à la fois la vie, la
      // vitesse et la densité, sans le saut brutal qui existait entre 5 et 6.
      const oldLevels = `const LEVELS: LevelDefinition[] = [\n  { name: "Marais affamé", code: "BIOME 01", waves: 10, healthMultiplier: 1.15, speedMultiplier: 0.98, swarmBonus: 2 },\n  { name: "Canopée hostile", code: "BIOME 02", waves: 15, healthMultiplier: 1.4, speedMultiplier: 1.08, swarmBonus: 4 },\n  { name: "Serre écarlate", code: "BIOME 03", waves: 20, healthMultiplier: 1.7, speedMultiplier: 1.17, swarmBonus: 6 },\n  { name: "Tourbière noire", code: "BIOME 04", waves: 25, healthMultiplier: 2.05, speedMultiplier: 1.25, swarmBonus: 8 },\n  { name: "Jardin primordial", code: "BIOME 05", waves: 30, healthMultiplier: 2.25, speedMultiplier: 1.28, swarmBonus: 9 },\n  { name: "Fosse des spores", code: "BIOME 06", waves: 35, healthMultiplier: 2.9, speedMultiplier: 1.38, swarmBonus: 12 },\n  { name: "Delta vorace", code: "BIOME 07", waves: 40, healthMultiplier: 3.4, speedMultiplier: 1.44, swarmBonus: 14 },\n  { name: "Crypte chlorophylle", code: "BIOME 08", waves: 45, healthMultiplier: 4, speedMultiplier: 1.5, swarmBonus: 16 },\n  { name: "Cime parasitaire", code: "BIOME 09", waves: 50, healthMultiplier: 4.7, speedMultiplier: 1.57, swarmBonus: 18 },\n  { name: "Nécropole florale", code: "BIOME 10", waves: 55, healthMultiplier: 5.5, speedMultiplier: 1.64, swarmBonus: 20 },\n  { name: "Tourbière souveraine", code: "BIOME 11", waves: 60, healthMultiplier: 6.4, speedMultiplier: 1.72, swarmBonus: 23 },\n  { name: "Floraison éternelle", code: "MODE INFINI", waves: null, healthMultiplier: 7.2, speedMultiplier: 1.8, swarmBonus: 26 },\n];`;
      const newLevels = `const LEVELS: LevelDefinition[] = [\n  { name: "Marais affamé", code: "BIOME 01", waves: 10, healthMultiplier: 1.15, speedMultiplier: 0.98, swarmBonus: 2 },\n  { name: "Canopée hostile", code: "BIOME 02", waves: 15, healthMultiplier: 1.38, speedMultiplier: 1.04, swarmBonus: 3 },\n  { name: "Serre écarlate", code: "BIOME 03", waves: 20, healthMultiplier: 1.65, speedMultiplier: 1.10, swarmBonus: 5 },\n  { name: "Tourbière noire", code: "BIOME 04", waves: 25, healthMultiplier: 1.95, speedMultiplier: 1.16, swarmBonus: 6 },\n  { name: "Jardin primordial", code: "BIOME 05", waves: 30, healthMultiplier: 2.30, speedMultiplier: 1.22, swarmBonus: 8 },\n  { name: "Fosse des spores", code: "BIOME 06", waves: 35, healthMultiplier: 2.70, speedMultiplier: 1.29, swarmBonus: 10 },\n  { name: "Delta vorace", code: "BIOME 07", waves: 40, healthMultiplier: 3.15, speedMultiplier: 1.36, swarmBonus: 12 },\n  { name: "Crypte chlorophylle", code: "BIOME 08", waves: 45, healthMultiplier: 3.65, speedMultiplier: 1.43, swarmBonus: 14 },\n  { name: "Cime parasitaire", code: "BIOME 09", waves: 50, healthMultiplier: 4.20, speedMultiplier: 1.50, swarmBonus: 16 },\n  { name: "Nécropole florale", code: "BIOME 10", waves: 55, healthMultiplier: 4.85, speedMultiplier: 1.57, swarmBonus: 19 },\n  { name: "Tourbière souveraine", code: "BIOME 11", waves: 60, healthMultiplier: 5.60, speedMultiplier: 1.65, swarmBonus: 22 },\n  { name: "Floraison éternelle", code: "MODE INFINI", waves: null, healthMultiplier: 6.40, speedMultiplier: 1.72, swarmBonus: 24 },\n];`;
      transformed = transformed.replace(oldLevels, newLevels);

      // Les vagues contiennent déjà de plus en plus d'ennemis. La récompense par
      // insecte progresse donc plus lentement et plafonne à 4 pièces afin que les
      // choix de construction restent importants dans les mondes avancés.
      const oldEnergyReward = `  private getEnemyEnergyReward(isBoss: boolean): number {\n    if (isBoss) return 20 + this.wave * 2 + this.levelIndex * 3;\n    const waveTier = Math.floor((this.wave - 1) / 3);\n    const worldTier = Math.floor(this.levelIndex / 4);\n    return Math.min(10, 1 + waveTier + worldTier);\n  }`;
      const newEnergyReward = `  private getEnemyEnergyReward(isBoss: boolean): number {\n    if (isBoss) return 10 + this.wave + this.levelIndex * 2;\n    const waveTier = Math.floor((this.wave - 1) / 10);\n    const worldTier = Math.floor(this.levelIndex / 7);\n    return Math.min(4, 1 + waveTier + worldTier);\n  }`;
      transformed = transformed.replace(oldEnergyReward, newEnergyReward);

      // Le mode infini devient une vraie source de progression : toujours un
      // versement tous les cinq paliers, mais son montant augmente avec la profondeur.
      const oldInfiniteDrops = `      if (level.waves === null) {\n        if (this.wave % 5 === 0) {\n          dropReward = 1;\n          rewardLabel = "PALIER INFINI";\n        }\n      } else {`;
      const newInfiniteDrops = `      if (level.waves === null) {\n        if (this.wave % 5 === 0) {\n          dropReward = Math.min(5, 1 + Math.floor(this.wave / 25));\n          rewardLabel = "PALIER INFINI";\n        }\n      } else {`;
      transformed = transformed.replace(oldInfiniteDrops, newInfiniteDrops);
      transformed = transformed.replace(
        '• Mode infini : 1 goutte tous les 5 paliers',
        '• Mode infini : bonus tous les 5 paliers, croissant avec la profondeur',
      );

      // Affiche la progression des gouttes directement sur chaque carte de biome.
      const oldCardAdd = '      card.add([background, iconHalo, icon, code, name, threat]);';
      const newCardAdd = [
        '      const earnedDrops = level.waves === null',
        '        ? null',
        '        : Object.entries(this.waveDropRecords)',
        '          .filter(([recordKey]) => recordKey.startsWith(`v2:${level.code}:`))',
        '          .reduce((sum, [, tier]) => sum + Number(tier), 0);',
        '      const maxDrops = level.waves === null ? null : level.waves * 2 + Math.floor(level.waves / 5);',
        '      const dropLabel = earnedDrops === null || maxDrops === null ? "💧 ∞" : `💧 ${earnedDrops}/${maxDrops}`;',
        '      const dropProgress = this.add.text(118, -68, dropLabel, {',
        '        fontFamily: "Arial",',
        '        fontSize: "15px",',
        '        color: available ? "#e8feff" : "#789399",',
        '        fontStyle: "bold",',
        '        backgroundColor: available ? "#173f47" : "#29464b",',
        '        padding: { x: 6, y: 3 },',
        '        stroke: "#0d292e",',
        '        strokeThickness: 2,',
        '      }).setOrigin(1, 0.5);',
        '      card.add([background, iconHalo, icon, code, name, threat, dropProgress]);',
      ].join("\n");
      transformed = transformed.replace(oldCardAdd, newCardAdd);

      return { code: transformed, map: null };
    },
  };
}
