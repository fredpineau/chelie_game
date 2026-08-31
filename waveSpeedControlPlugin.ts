import type { Plugin } from "vite";

/**
 * Adds the wave speed control without mixing UI/state logic into src/main.ts.
 *
 * The three display states are:
 * - NORMAL: current game speed
 * - ×1: first acceleration tier (1.5x)
 * - ×2: double speed
 *
 * Only battle simulation calls are scaled. Placement and pathfinding code are
 * deliberately left untouched.
 */
export function waveSpeedControl(): Plugin {
  return {
    name: "wave-speed-control",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      let transformed = code;

      const stateAnchor = "  private pathRecalculationVersion = 0;";
      const stateReplacement = `  private waveSpeedMode = 0;\n  private waveSpeedMultiplier = 1;\n  private waveSpeedButtonText?: Phaser.GameObjects.Text;\n  private pathRecalculationVersion = 0;`;
      transformed = transformed.replace(stateAnchor, stateReplacement);

      const updateAnchor = `    this.updateAutoWave(time);\n    this.spawnWaveEnemies(time);\n    this.moveEnemies(time, delta);\n    this.fireTowers(time);`;
      const updateReplacement = `    this.updateAutoWave(time);\n    this.spawnWaveEnemies(time);\n    this.moveEnemies(time, delta * this.waveSpeedMultiplier);\n    this.fireTowers(time);`;
      transformed = transformed.replace(updateAnchor, updateReplacement);

      // Keep tower cadence proportional to enemy movement speed. This avoids
      // turning acceleration into an unintended difficulty modifier.
      transformed = transformed.replace(
        "      if (time - tower.lastShot < tower.fireDelay) continue;",
        "      if (time - tower.lastShot < tower.fireDelay / this.waveSpeedMultiplier) continue;",
      );

      // Spawn cadence follows the same multiplier. The regex is intentionally
      // limited to assignments made from the spawn method's `time` argument.
      transformed = transformed.replace(
        /this\.nextSpawnAt = time \+ ([^;]+);/g,
        "this.nextSpawnAt = time + ($1) / this.waveSpeedMultiplier;",
      );

      const hudAnchor = `    const pauseButton = this.add.container(WIDTH - 83, HEIGHT - 42);`;
      const hudReplacement = `    const speedButton = this.add.container(WIDTH - 120, HEIGHT - 322).setDepth(22);\n    const speedShadow = this.add.graphics();\n    speedShadow.fillStyle(0x071a20, 0.42);\n    speedShadow.fillRoundedRect(-58, -31, 116, 68, 18);\n    const speedBackground = this.add.graphics();\n    speedBackground.fillStyle(0x244c5a, 1);\n    speedBackground.fillRoundedRect(-56, -34, 112, 68, 18);\n    speedBackground.lineStyle(3, 0x9bd9e4, 1);\n    speedBackground.strokeRoundedRect(-56, -34, 112, 68, 18);\n    this.waveSpeedButtonText = this.add.text(0, 0, "NORMAL", {\n      fontFamily: "Arial", fontSize: "17px", color: "#effcff", fontStyle: "bold",\n      stroke: "#102d35", strokeThickness: 3,\n    }).setOrigin(0.5);\n    speedButton.add([speedShadow, speedBackground, this.waveSpeedButtonText]);\n    speedButton.setSize(124, 76).setInteractive({ useHandCursor: true });\n    speedButton.on("pointerover", () => speedButton.setScale(1.04));\n    speedButton.on("pointerout", () => speedButton.setScale(1));\n    speedButton.on("pointerdown", () => {\n      this.waveSpeedMode = (this.waveSpeedMode + 1) % 3;\n      const multipliers = [1, 1.5, 2];\n      const labels = ["NORMAL", "×1", "×2"];\n      this.waveSpeedMultiplier = multipliers[this.waveSpeedMode];\n      this.waveSpeedButtonText?.setText(labels[this.waveSpeedMode]);\n      this.time.timeScale = this.waveSpeedMultiplier;\n    });\n\n    const pauseButton = this.add.container(WIDTH - 83, HEIGHT - 42);`;
      transformed = transformed.replace(hudAnchor, hudReplacement);

      // A scene restart always starts at normal speed.
      transformed = transformed.replace(
        "    this.pathRecalculationVersion = 0;",
        `    this.waveSpeedMode = 0;\n    this.waveSpeedMultiplier = 1;\n    this.waveSpeedButtonText?.setText("NORMAL");\n    this.time.timeScale = 1;\n    this.pathRecalculationVersion = 0;`,
      );

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
