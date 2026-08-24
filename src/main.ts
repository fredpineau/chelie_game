import Phaser from "phaser";
import "./style.css";

const WIDTH = 1280;
const HEIGHT = 720;
const CELL = 52;
const GRID_X = 230;
const GRID_Y = 142;
const GRID_COLS = 17;
const GRID_ROWS = 10;
const ENTRY_ROW = 5;

type EnemyKind = "air" | "sea";
type TowerKind = "harpoon" | "flak" | "pulse";

type Enemy = {
  body: Phaser.GameObjects.Container;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  speed: number;
  healthBar: Phaser.GameObjects.Rectangle;
  path: Phaser.Math.Vector2[];
  pathIndex: number;
};

type Tower = {
  body: Phaser.GameObjects.Container;
  kind: TowerKind;
  range: number;
  damage: number;
  fireDelay: number;
  lastShot: number;
  col: number;
  row: number;
};

type TowerDefinition = {
  name: string;
  icon: string;
  color: number;
  target: "air" | "sea" | "all";
};

const TOWERS: Record<TowerKind, TowerDefinition> = {
  harpoon: { name: "Harpon", icon: "H", color: 0x38bdf8, target: "sea" },
  flak: { name: "Flak", icon: "F", color: 0xf97316, target: "air" },
  pulse: { name: "Pulse", icon: "P", color: 0x8b5cf6, target: "all" },
};

class DefenseScene extends Phaser.Scene {
  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private baseHp = 20;
  private wave = 0;
  private enemiesToSpawn = 0;
  private spawnedThisWave = 0;
  private waveActive = false;
  private selectedTower: TowerKind = "harpoon";
  private nextSpawnAt = 0;
  private hpText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private startButton!: Phaser.GameObjects.Container;
  private towerButtons = new Map<TowerKind, Phaser.GameObjects.Container>();

  constructor() {
    super("defense");
  }

  create(): void {
    this.drawWorld();
    this.createHud();
    this.createTowerPalette();
    this.createPlacementZone();
    this.updateHud("Placez les tours pour créer un labyrinthe sans fermer le passage");
  }

  update(time: number, delta: number): void {
    if (this.baseHp <= 0) return;

    this.spawnWaveEnemies(time);
    this.moveEnemies(delta);
    this.fireTowers(time);

    if (this.waveActive && this.spawnedThisWave >= this.enemiesToSpawn && this.enemies.length === 0) {
      this.waveActive = false;
      this.updateHud(`Vague ${this.wave} neutralisée — secteur sécurisé`);
      this.setStartButtonEnabled(true);
    }
  }

  private drawWorld(): void {
    const background = this.add.graphics();
    background.fillGradientStyle(0x080b12, 0x111827, 0x172033, 0x0b1220, 1);
    background.fillRect(0, 0, WIDTH, HEIGHT);

    for (let i = 0; i < 7; i += 1) {
      this.add.circle(100 + i * 190, 95 + (i % 3) * 70, 2, 0xffffff, 0.25);
    }

    for (let y = 130; y < HEIGHT; y += 58) {
      const wave = this.add.graphics();
      wave.lineStyle(2, 0x64748b, 0.08);
      wave.beginPath();
      for (let x = 0; x <= WIDTH; x += 40) {
        const py = y + Math.sin((x + y) / 55) * 7;
        x === 0 ? wave.moveTo(x, py) : wave.lineTo(x, py);
      }
      wave.strokePath();
    }

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x7dd3fc, 0.1);
    for (let col = 0; col <= GRID_COLS; col += 1) {
      grid.lineBetween(GRID_X - CELL / 2 + col * CELL, GRID_Y - CELL / 2, GRID_X - CELL / 2 + col * CELL, GRID_Y - CELL / 2 + GRID_ROWS * CELL);
    }
    for (let row = 0; row <= GRID_ROWS; row += 1) {
      grid.lineBetween(GRID_X - CELL / 2, GRID_Y - CELL / 2 + row * CELL, GRID_X - CELL / 2 + GRID_COLS * CELL, GRID_Y - CELL / 2 + row * CELL);
    }

    this.add.circle(GRID_X - 30, GRID_Y + ENTRY_ROW * CELL, 18, 0x22d3ee, 0.2).setStrokeStyle(2, 0x22d3ee);
    this.add.text(GRID_X - 30, GRID_Y + ENTRY_ROW * CELL, "IN", { fontFamily: "Arial", fontSize: "11px", color: "#67e8f9", fontStyle: "bold" }).setOrigin(0.5);

    this.add.rectangle(WIDTH - 88, HEIGHT / 2, 176, HEIGHT, 0x02040a, 0.66);
    this.add.rectangle(WIDTH - 176, HEIGHT / 2, 3, HEIGHT, 0xef4444, 0.5);
    this.createBase();

    this.add.text(224, 108, "PÉRIMÈTRE DE CONFINEMENT 01", this.labelStyle(0x94a3b8));
  }

  private createBase(): void {
    const x = WIDTH - 92;
    const y = HEIGHT / 2;
    const glow = this.add.circle(x, y, 62, 0xef4444, 0.1);
    this.tweens.add({ targets: glow, alpha: 0.28, scale: 1.12, yoyo: true, repeat: -1, duration: 1200 });
    this.add.circle(x, y, 43, 0x070a10).setStrokeStyle(3, 0xef4444, 0.8);
    this.add.circle(x, y, 26, 0x991b1b, 0.28).setStrokeStyle(2, 0xf87171);
    this.add.text(x, y - 2, "N", { fontFamily: "Arial", fontSize: "28px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(x, y + 75, "NOYAU", this.labelStyle(0xf87171)).setOrigin(0.5);
  }

  private createHud(): void {
    this.add.rectangle(WIDTH / 2, 48, WIDTH - 40, 72, 0x020617, 0.76)
      .setStrokeStyle(1, 0x334155, 0.8);

    this.add.text(46, 25, "CHELIE //", {
      fontFamily: "Arial",
      fontSize: "21px",
      color: "#f8fafc",
      fontStyle: "bold",
      letterSpacing: 4,
    });
    this.add.text(46, 50, "DEFENSE PROTOCOL", {
      fontFamily: "Arial",
      fontSize: "10px",
      color: "#64748b",
      letterSpacing: 2,
    });

    this.waveText = this.add.text(300, 35, "VAGUE 0", this.hudStyle());
    this.hpText = this.add.text(485, 35, "INTÉGRITÉ 20", this.hudStyle("#f87171"));
    this.statusText = this.add.text(WIDTH / 2, 93, "", {
      fontFamily: "Arial",
      fontSize: "15px",
      color: "#cbd5e1",
    }).setOrigin(0.5);

    this.startButton = this.makeButton(WIDTH - 178, 48, 150, 42, "LANCER", 0x0284c7, () => this.startWave());
  }

  private createTowerPalette(): void {
    const x = 112;
    const startY = 185;

    this.add.text(x, startY - 48, "ARSENAL", this.labelStyle(0xe2e8f0)).setOrigin(0.5);

    (Object.keys(TOWERS) as TowerKind[]).forEach((kind, index) => {
      const definition = TOWERS[kind];
      const y = startY + index * 92;
      const button = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, 170, 72, 0x071426, 0.92)
        .setStrokeStyle(2, kind === this.selectedTower ? definition.color : 0x334155, 1);
      const icon = this.add.circle(-55, 0, 22, definition.color, 0.2).setStrokeStyle(2, definition.color);
      const iconText = this.add.text(-55, -2, definition.icon, {
        fontFamily: "Arial",
        fontSize: "24px",
        color: `#${definition.color.toString(16).padStart(6, "0")}`,
      }).setOrigin(0.5);
      const title = this.add.text(-20, -18, definition.name.toUpperCase(), {
        fontFamily: "Arial",
        fontSize: "15px",
        color: "#f8fafc",
        fontStyle: "bold",
      });
      const targetLabel = definition.target === "sea" ? "CIBLE MARINE" : definition.target === "air" ? "CIBLE AÉRIENNE" : "CIBLE UNIVERSELLE";
      const target = this.add.text(-20, 8, targetLabel, {
        fontFamily: "Arial",
        fontSize: "10px",
        color: "#64748b",
        letterSpacing: 1,
      });
      button.add([bg, icon, iconText, title, target]);
      button.setSize(170, 72).setInteractive({ useHandCursor: true });
      button.on("pointerdown", () => this.selectTower(kind));
      this.towerButtons.set(kind, button);
    });
  }

  private createPlacementZone(): void {
    const zone = this.add.zone(
      GRID_X + ((GRID_COLS - 1) * CELL) / 2,
      GRID_Y + ((GRID_ROWS - 1) * CELL) / 2,
      GRID_COLS * CELL,
      GRID_ROWS * CELL,
    ).setInteractive({ useHandCursor: true });
    zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.placeTower(pointer.worldX, pointer.worldY);
    });
  }

  private selectTower(kind: TowerKind): void {
    this.selectedTower = kind;
    this.towerButtons.forEach((button, buttonKind) => {
      const bg = button.getAt(0) as Phaser.GameObjects.Rectangle;
      bg.setStrokeStyle(2, buttonKind === kind ? TOWERS[buttonKind].color : 0x334155, 1);
    });
    const target = TOWERS[kind].target === "all" ? "toutes les unités" : `unités ${TOWERS[kind].target === "air" ? "aériennes" : "marines"}`;
    this.updateHud(`${TOWERS[kind].name} sélectionné — cible les ${target}`);
  }

  private placeTower(x: number, y: number): void {
    const definition = TOWERS[this.selectedTower];
    const col = Phaser.Math.Clamp(Math.round((x - GRID_X) / CELL), 0, GRID_COLS - 1);
    const row = Phaser.Math.Clamp(Math.round((y - GRID_Y) / CELL), 0, GRID_ROWS - 1);
    const towerX = GRID_X + col * CELL;
    const towerY = GRID_Y + row * CELL;

    if ((col === 0 && row === ENTRY_ROW) || (col === GRID_COLS - 1 && row === ENTRY_ROW)) {
      this.updateHud("L’entrée et la sortie doivent rester libres");
      return;
    }
    if (this.towers.some((tower) => tower.col === col && tower.row === row)) {
      this.updateHud("Cet emplacement est déjà occupé");
      return;
    }
    if (!this.calculatePath({ col: 0, row: ENTRY_ROW }, { col: GRID_COLS - 1, row: ENTRY_ROW }, { col, row })) {
      this.updateHud("Il faut toujours laisser un chemin jusqu’au cœur");
      this.cameras.main.shake(120, 0.002);
      return;
    }

    const towerBody = this.add.container(towerX, towerY);

    const base = this.add.circle(0, 8, 28, 0x071426).setStrokeStyle(3, definition.color, 0.8);
    const turret = this.add.rectangle(0, -3, 17, 34, definition.color, 0.92).setRounded(6);
    const core = this.add.circle(0, -7, 8, 0xffffff, 0.85);
    towerBody.add([base, turret, core]);

    this.towers.push({
      body: towerBody,
      kind: this.selectedTower,
      range: this.selectedTower === "pulse" ? 245 : 220,
      damage: this.selectedTower === "pulse" ? 16 : 22,
      fireDelay: this.selectedTower === "pulse" ? 680 : 850,
      lastShot: 0,
      col,
      row,
    });
    this.recalculateSeaPaths();
    this.updateHud(`${definition.name} déployé`);
  }

  private startWave(): void {
    if (this.waveActive || this.baseHp <= 0) return;
    this.wave += 1;
    this.enemiesToSpawn = 5 + this.wave * 2;
    this.spawnedThisWave = 0;
    this.waveActive = true;
    this.nextSpawnAt = 0;
    this.setStartButtonEnabled(false);
    this.updateHud(`Vague ${this.wave} en approche`);
  }

  private spawnWaveEnemies(time: number): void {
    if (!this.waveActive || this.spawnedThisWave >= this.enemiesToSpawn || time < this.nextSpawnAt) return;

    const kind: EnemyKind = (this.spawnedThisWave + this.wave) % 2 === 0 ? "air" : "sea";
    const y = Phaser.Math.Between(150, HEIGHT - 55);
    this.spawnEnemy(kind, y);
    this.spawnedThisWave += 1;
    this.nextSpawnAt = time + Math.max(520, 1150 - this.wave * 45);
  }

  private spawnEnemy(kind: EnemyKind, y: number): void {
    const color = kind === "air" ? 0xfb7185 : 0x22d3ee;
    const spawnY = kind === "sea" ? GRID_Y + ENTRY_ROW * CELL : y;
    const container = this.add.container(GRID_X, spawnY);
    const shadow = this.add.ellipse(0, 15, 54, 14, 0x020617, 0.35);
    const creature = kind === "air"
      ? this.add.triangle(0, 0, -25, 12, 0, -18, 25, 12, color, 0.95)
      : this.add.ellipse(0, 0, 54, 30, color, 0.9);
    creature.setStrokeStyle(2, 0xffffff, 0.35);
    const eye = this.add.circle(12, -4, 3, 0xffffff);
    const healthBg = this.add.rectangle(0, -28, 48, 5, 0x020617, 0.8);
    const healthBar = this.add.rectangle(-24, -28, 48, 5, color).setOrigin(0, 0.5);
    container.add([shadow, creature, eye, healthBg, healthBar]);

    const hp = 48 + this.wave * 12;
    this.enemies.push({
      body: container,
      kind,
      hp,
      maxHp: hp,
      speed: 38 + this.wave * 2.5,
      healthBar,
      path: kind === "sea" ? this.calculatePath(
        { col: 0, row: ENTRY_ROW },
        { col: GRID_COLS - 1, row: ENTRY_ROW },
      ) ?? [] : [],
      pathIndex: 1,
    });
  }

  private moveEnemies(delta: number): void {
    const baseX = WIDTH - 150;
    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = this.enemies[index];
      if (enemy.kind === "air") {
        enemy.body.x += enemy.speed * (delta / 1000);
        enemy.body.y += Math.sin((enemy.body.x + index * 20) / 55) * 0.16;
      } else {
        this.followPath(enemy, delta);
      }

      if (enemy.body.x >= baseX) {
        enemy.body.destroy();
        this.enemies.splice(index, 1);
        this.baseHp = Math.max(0, this.baseHp - 1);
        this.cameras.main.shake(180, 0.005);
        this.updateHud(this.baseHp > 0 ? "Le cœur est touché !" : "Défaite — le cœur est tombé");
        if (this.baseHp === 0) this.gameOver();
      }
    }
  }

  private fireTowers(time: number): void {
    for (const tower of this.towers) {
      if (time - tower.lastShot < tower.fireDelay) continue;
      const target = this.findTarget(tower);
      if (!target) continue;

      tower.lastShot = time;
      const definition = TOWERS[tower.kind];
      const projectile = this.add.circle(tower.body.x, tower.body.y, 5, definition.color);
      this.tweens.add({
        targets: projectile,
        x: target.body.x,
        y: target.body.y,
        duration: 180,
        ease: "Quad.easeIn",
        onComplete: () => {
          projectile.destroy();
          if (!target.body.active) return;
          target.hp -= tower.damage;
          target.healthBar.width = 48 * Math.max(0, target.hp / target.maxHp);
          this.createImpact(target.body.x, target.body.y, definition.color);
          if (target.hp <= 0) this.destroyEnemy(target);
        },
      });
    }
  }

  private findTarget(tower: Tower): Enemy | undefined {
    const definition = TOWERS[tower.kind];
    return this.enemies
      .filter((enemy) => definition.target === "all" || definition.target === enemy.kind)
      .filter((enemy) => Phaser.Math.Distance.Between(tower.body.x, tower.body.y, enemy.body.x, enemy.body.y) <= tower.range)
      .sort((a, b) => b.body.x - a.body.x)[0];
  }

  private destroyEnemy(enemy: Enemy): void {
    const index = this.enemies.indexOf(enemy);
    if (index === -1) return;
    enemy.body.destroy();
    this.enemies.splice(index, 1);
    this.updateHud(`${enemy.kind === "air" ? "Créature aérienne" : "Monstre marin"} neutralisé`);
  }

  private createImpact(x: number, y: number, color: number): void {
    const impact = this.add.circle(x, y, 8, color, 0.65);
    this.tweens.add({ targets: impact, scale: 2.4, alpha: 0, duration: 180, onComplete: () => impact.destroy() });
  }

  private followPath(enemy: Enemy, delta: number): void {
    const target = enemy.path[enemy.pathIndex];
    if (!target) {
      enemy.body.x += enemy.speed * (delta / 1000);
      return;
    }

    const distance = Phaser.Math.Distance.Between(enemy.body.x, enemy.body.y, target.x, target.y);
    const step = enemy.speed * (delta / 1000);
    if (distance <= step) {
      enemy.body.setPosition(target.x, target.y);
      enemy.pathIndex += 1;
      return;
    }
    enemy.body.x += ((target.x - enemy.body.x) / distance) * step;
    enemy.body.y += ((target.y - enemy.body.y) / distance) * step;
  }

  private recalculateSeaPaths(): void {
    this.enemies.filter((enemy) => enemy.kind === "sea").forEach((enemy) => {
      const start = {
        col: Phaser.Math.Clamp(Math.round((enemy.body.x - GRID_X) / CELL), 0, GRID_COLS - 1),
        row: Phaser.Math.Clamp(Math.round((enemy.body.y - GRID_Y) / CELL), 0, GRID_ROWS - 1),
      };
      enemy.path = this.calculatePath(start, { col: GRID_COLS - 1, row: ENTRY_ROW }) ?? [];
      enemy.pathIndex = 1;
    });
  }

  private calculatePath(
    start: { col: number; row: number },
    end: { col: number; row: number },
    extraBlocked?: { col: number; row: number },
  ): Phaser.Math.Vector2[] | null {
    const key = (col: number, row: number) => `${col},${row}`;
    const blocked = new Set(this.towers.map((tower) => key(tower.col, tower.row)));
    if (extraBlocked) blocked.add(key(extraBlocked.col, extraBlocked.row));

    const queue = [start];
    const visited = new Set([key(start.col, start.row)]);
    const previous = new Map<string, { col: number; row: number }>();
    const directions = [
      { col: 1, row: 0 },
      { col: 0, row: 1 },
      { col: 0, row: -1 },
      { col: -1, row: 0 },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.col === end.col && current.row === end.row) {
        const cells = [current];
        let cursor = current;
        while (key(cursor.col, cursor.row) !== key(start.col, start.row)) {
          cursor = previous.get(key(cursor.col, cursor.row))!;
          cells.push(cursor);
        }
        return cells.reverse().map((cell) => new Phaser.Math.Vector2(GRID_X + cell.col * CELL, GRID_Y + cell.row * CELL));
      }

      for (const direction of directions) {
        const next = { col: current.col + direction.col, row: current.row + direction.row };
        const nextKey = key(next.col, next.row);
        if (next.col < 0 || next.col >= GRID_COLS || next.row < 0 || next.row >= GRID_ROWS) continue;
        if (blocked.has(nextKey) || visited.has(nextKey)) continue;
        visited.add(nextKey);
        previous.set(nextKey, current);
        queue.push(next);
      }
    }
    return null;
  }

  private gameOver(): void {
    this.waveActive = false;
    this.setStartButtonEnabled(false);
    const overlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x020617, 0.78);
    const title = this.add.text(WIDTH / 2, HEIGHT / 2 - 45, "LE CŒUR EST TOMBÉ", {
      fontFamily: "Arial",
      fontSize: "42px",
      color: "#fb7185",
      fontStyle: "bold",
    }).setOrigin(0.5);
    const retry = this.makeButton(WIDTH / 2, HEIGHT / 2 + 38, 190, 48, "RECOMMENCER", 0x0284c7, () => this.scene.restart());
    overlay.setDepth(20);
    title.setDepth(21);
    retry.setDepth(21);
  }

  private updateHud(message: string): void {
    this.hpText?.setText(`INTÉGRITÉ ${this.baseHp}`);
    this.waveText?.setText(`VAGUE ${this.wave}`);
    this.statusText?.setText(message);
  }

  private setStartButtonEnabled(enabled: boolean): void {
    this.startButton.setAlpha(enabled ? 1 : 0.45);
    const hitArea = this.startButton.input;
    if (hitArea) hitArea.enabled = enabled;
  }

  private makeButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    color: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, width, height, color, 0.9).setStrokeStyle(1, 0x7dd3fc, 0.65);
    const text = this.add.text(0, 0, label, {
      fontFamily: "Arial",
      fontSize: "15px",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5);
    container.add([bg, text]);
    container.setSize(width, height).setInteractive({ useHandCursor: true });
    container.on("pointerover", () => bg.setFillStyle(color, 1));
    container.on("pointerout", () => bg.setFillStyle(color, 0.9));
    container.on("pointerdown", onClick);
    return container;
  }

  private hudStyle(color = "#e2e8f0"): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: "Arial", fontSize: "16px", color, fontStyle: "bold" };
  }

  private labelStyle(color: number): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: "Arial",
      fontSize: "13px",
      color: `#${color.toString(16).padStart(6, "0")}`,
      fontStyle: "bold",
      letterSpacing: 2,
    };
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: "#020617",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: { antialias: true, pixelArt: false },
  scene: DefenseScene,
});
