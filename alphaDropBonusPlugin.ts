import type { Plugin } from "vite";

/**
 * Makes Alpha rewards independent from the wave-perfect reward.
 * - A normal completed wave keeps its 1 / 2 drop progression.
 * - Killing an Alpha grants +3 drops immediately.
 * - In finite worlds, the Alpha bonus is persisted once per world/wave.
 * - Infinite mode keeps the Alpha bonus repeatable, like its milestone rewards.
 */
export function alphaDropBonus(): Plugin {
  return {
    name: "alpha-drop-bonus",
    enforce: "post",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      let transformed = code;

      const tierPattern = /const achievedTier = perfectWave \? \(this\.isBossWave\(\) \? 3 : 2\) : 1;/;
      if (!tierPattern.test(transformed)) {
        throw new Error("Alpha drop bonus wave tier calculation not found.");
      }
      transformed = transformed.replace(tierPattern, "const achievedTier = perfectWave ? 2 : 1;");

      const destroyPattern = /private destroyEnemy\(enemy: Enemy\): void \{\n\s*const index = this\.enemies\.indexOf\(enemy\);\n\s*if \(index === -1\) return;\n\s*this\.energy \+= enemy\.energyReward;/;
      if (!destroyPattern.test(transformed)) {
        throw new Error("Alpha drop bonus destroyEnemy calculation not found.");
      }
      transformed = transformed.replace(
        destroyPattern,
        `private destroyEnemy(enemy: Enemy): void {\n    const index = this.enemies.indexOf(enemy);\n    if (index === -1) return;\n\n    if (enemy.isBoss) {\n      const level = LEVELS[this.levelIndex];\n      const alphaRecordKey = \`alpha:v1:\${level.code}:\${this.wave}\`;\n      const alreadyRewarded = level.waves !== null && Number(this.waveDropRecords[alphaRecordKey] ?? 0) >= 3;\n      if (!alreadyRewarded) {\n        this.wateringCans += 3;\n        if (level.waves !== null) this.waveDropRecords[alphaRecordKey] = 3;\n        this.savePermanentProgress();\n        this.showWateringCanReward(3, "ALPHA DIGÉRÉ");\n      }\n    }\n\n    this.energy += enemy.energyReward;`,
      );

      transformed = transformed.replace(
        "• Boss parfait : jusqu’à 3 gouttes au total",
        "• Alpha digéré : +3 gouttes bonus",
      );

      return { code: transformed, map: null };
    },
  };
}
