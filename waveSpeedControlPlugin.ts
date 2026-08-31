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

      transformed = transformed.replace(
        "      if (time - tower.lastShot < tower.fireDelay) continue;",
        "      if (time - tower.lastShot < tower.fireDelay / this.waveSpeedMultiplier) continue;",
      );

      transformed = transformed.replace(
        /this\.nextSpawnAt = time \+ ([^;]+);/g,
        "this.nextSpawnAt = time + ($1) / this.waveSpeedMultiplier;",
      );

      // Attach the speed control visually to the attack command instead of
      // consuming map or palette space. It sits as a small badge on the
      // attack button's upper-right corner, with its own hit area.
      const hudAnchor = `    const pauseButton = this.add.container(WIDTH - 83, HEIGHT - 42);`;
      const hudReplacement = `    const speedButton = this.add.container(WIDTH / 2 + 112, HEIGHT - 70).setDepth(24);\n    const speedGlow = this.add.circle(0, 0, 19, 0xf7df45, 0.10)\n      .setStrokeStyle(2, 0xf7df45, 0.98);\n    const speedArrows = this.add.graphics();\n    speedArrows.fillStyle(0xffed72, 1);\n    speedArrows.fillTriangle(-10, -8, 0, 0, -10, 8);\n    speedArrows.fillTriangle(0, -8, 10, 0, 0, 8);\n    this.waveSpeedButtonText = this.add.text(0, 23, "", {\n      fontFamily: "Arial", fontSize: "10px", color: "#ffe96b", fontStyle: "bold",\n      stroke: "#102d35", strokeThickness: 2,\n    }).setOrigin(0.5);\n    speedButton.add([speedGlow, speedArrows, this.waveSpeedButtonText]);\n    speedButton.setSize(44, 44).setInteractive({ useHandCursor: true });\n    speedButton.on("pointerover", () => speedButton.setScale(1.08));\n    speedButton.on("pointerout", () => speedButton.setScale(1));\n    speedButton.on("pointerdown", (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {\n      event.stopPropagation();\n      this.waveSpeedMode = (this.waveSpeedMode + 1) % 3;\n      const multipliers = [1, 1.5, 2];\n      const labels = ["", "×1", "×2"];\n      this.waveSpeedMultiplier = multipliers[this.waveSpeedMode];\n      this.waveSpeedButtonText?.setText(labels[this.waveSpeedMode]);\n      this.time.timeScale = this.waveSpeedMultiplier;\n    });\n\n    const pauseButton = this.add.container(WIDTH - 83, HEIGHT - 42);`;
      transformed = transformed.replace(hudAnchor, hudReplacement);

      transformed = transformed.replace(
        "    this.pathRecalculationVersion = 0;",
        `    this.waveSpeedMode = 0;\n    this.waveSpeedMultiplier = 1;\n    this.waveSpeedButtonText?.setText("");\n    this.time.timeScale = 1;\n    this.pathRecalculationVersion = 0;`,
      );

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
