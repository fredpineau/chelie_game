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
type TowerKind = "harpoon" | "flak" | "pulse" | "cryo" | "tesla" | "railgun" | "nova";
type TowerEffect = "standard" | "slow" | "splash";

type Enemy = {
  body: Phaser.GameObjects.Container;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  speed: number;
  healthBar: Phaser.GameObjects.Rectangle;
  healthBarWidth: number;
  path: Phaser.Math.Vector2[];
  pathIndex: number;
  isBoss: boolean;
  coreDamage: number;
  energyReward: number;
  slowedUntil: number;
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
  level: number;
  levelBadge: Phaser.GameObjects.Text;
};

type TowerDefinition = {
  name: string;
  icon: string;
  color: number;
  target: "air" | "sea" | "all";
  cost: number;
  damage: number;
  range: number;
  fireDelay: number;
  effect: TowerEffect;
  unlockLevel: number;
};

type LevelDefinition = {
  name: string;
  code: string;
  waves: number | null;
  healthMultiplier: number;
  speedMultiplier: number;
  swarmBonus: number;
};

const TOWERS: Record<TowerKind, TowerDefinition> = {
  harpoon: { name: "Harpon", icon: "H", color: 0x38bdf8, target: "sea", cost: 5, damage: 18, range: 210, fireDelay: 780, effect: "standard", unlockLevel: 0 },
  flak: { name: "Flak", icon: "F", color: 0xf97316, target: "air", cost: 10, damage: 16, range: 220, fireDelay: 500, effect: "standard", unlockLevel: 0 },
  pulse: { name: "Pulse", icon: "P", color: 0x8b5cf6, target: "all", cost: 20, damage: 14, range: 230, fireDelay: 650, effect: "standard", unlockLevel: 1 },
  cryo: { name: "Cryo", icon: "C", color: 0x67e8f9, target: "all", cost: 30, damage: 8, range: 205, fireDelay: 900, effect: "slow", unlockLevel: 2 },
  tesla: { name: "Tesla", icon: "T", color: 0xfacc15, target: "all", cost: 45, damage: 12, range: 190, fireDelay: 280, effect: "standard", unlockLevel: 3 },
  railgun: { name: "Railgun", icon: "R", color: 0xe2e8f0, target: "all", cost: 70, damage: 55, range: 310, fireDelay: 1600, effect: "standard", unlockLevel: 4 },
  nova: { name: "Nova", icon: "N", color: 0xfb7185, target: "all", cost: 100, damage: 28, range: 230, fireDelay: 1250, effect: "splash", unlockLevel: 5 },
};

const MAX_TOWER_LEVEL = 5;
const UPGRADE_COSTS = [0, 30, 60, 100, 160];

const LEVELS: LevelDefinition[] = [
  { name: "Premier contact", code: "SECTEUR 01", waves: 10, healthMultiplier: 0.85, speedMultiplier: 0.9, swarmBonus: 0 },
  { name: "Courants hostiles", code: "SECTEUR 02", waves: 15, healthMultiplier: 1, speedMultiplier: 1, swarmBonus: 1 },
  { name: "Ciel fracturé", code: "SECTEUR 03", waves: 20, healthMultiplier: 1.15, speedMultiplier: 1.08, swarmBonus: 2 },
  { name: "Zone abyssale", code: "SECTEUR 04", waves: 25, healthMultiplier: 1.35, speedMultiplier: 1.15, swarmBonus: 3 },
  { name: "Dernier rempart", code: "SECTEUR 05", waves: 30, healthMultiplier: 1.6, speedMultiplier: 1.22, swarmBonus: 4 },
  { name: "Protocole infini", code: "MODE ∞", waves: null, healthMultiplier: 1.75, speedMultiplier: 1.25, swarmBonus: 5 },
];

class DefenseScene extends Phaser.Scene {
  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private baseHp = 20;
  private energy = 100;
  private wave = 0;
  private enemiesToSpawn = 0;
  private spawnedThisWave = 0;
  private waveActive = false;
  private selectedTower: TowerKind = "harpoon";
  private nextSpawnAt = 0;
  private levelIndex = 0;
  private levelStarted = false;
  private requestedLevelIndex: number | null = null;
  private hpText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private energyText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private startButton!: Phaser.GameObjects.Container;
  private towerButtons = new Map<TowerKind, Phaser.GameObjects.Container>();

  constructor() {
    super("defense");
  }

  init(data: { levelIndex?: number }): void {
    this.requestedLevelIndex = data.levelIndex ?? null;
  }

  create(): void {
    this.resetState();
    if (this.requestedLevelIndex !== null) {
      this.levelIndex = Phaser.Math.Clamp(this.requestedLevelIndex, 0, LEVELS.length - 1);
    }
    this.drawWorld();
    this.createHud();
    this.createTowerPalette();
    this.createPlacementZone();
    this.setStartButtonEnabled(false);
    if (this.requestedLevelIndex !== null) {
      this.beginLevel(this.requestedLevelIndex);
    } else {
      this.showLevelSelection();
    }
  }

  update(time: number, delta: number): void {
    if (!this.levelStarted || this.baseHp <= 0) return;

    this.spawnWaveEnemies(time);
    this.moveEnemies(time, delta);
    this.fireTowers(time);

    if (this.waveActive && this.spawnedThisWave >= this.enemiesToSpawn && this.enemies.length === 0) {
      this.waveActive = false;
      const level = LEVELS[this.levelIndex];
      if (level.waves !== null && this.wave >= level.waves) {
        this.completeLevel();
      } else {
        this.updateHud(`Vague ${this.wave} neutralisée — secteur sécurisé`);
        this.setStartButtonEnabled(true);
      }
    }
  }

  private resetState(): void {
    this.enemies = [];
    this.towers = [];
    this.baseHp = 20;
    this.energy = 100;
    this.wave = 0;
    this.enemiesToSpawn = 0;
    this.spawnedThisWave = 0;
    this.waveActive = false;
    this.levelStarted = false;
    this.nextSpawnAt = 0;
    this.selectedTower = "harpoon";
    this.towerButtons.clear();
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

    this.add.text(224, 108, "PÉRIMÈTRE DE CONFINEMENT", this.labelStyle(0x94a3b8));
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

    this.levelText = this.add.text(270, 35, "SECTEUR --", this.hudStyle("#94a3b8"));
    this.waveText = this.add.text(440, 35, "VAGUE 0", this.hudStyle());
    this.hpText = this.add.text(600, 35, "INTÉGRITÉ 20", this.hudStyle("#f87171"));
    this.energyText = this.add.text(790, 35, "PIÈCES 100", this.hudStyle("#facc15"));
    this.statusText = this.add.text(WIDTH / 2, 93, "", {
      fontFamily: "Arial",
      fontSize: "15px",
      color: "#cbd5e1",
    }).setOrigin(0.5);

    this.startButton = this.makeButton(WIDTH - 178, 48, 150, 42, "LANCER", 0x0284c7, () => this.startWave());
  }

  private showLevelSelection(): void {
    const unlocked = this.getUnlockedLevel();
    const overlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x02040a, 0.9)
      .setDepth(30)
      .setInteractive();
    const panel = this.add.rectangle(WIDTH / 2, HEIGHT / 2 + 12, 820, 510, 0x090e18, 0.98)
      .setStrokeStyle(1, 0x475569, 0.9)
      .setDepth(31);
    this.add.text(WIDTH / 2, 150, "SÉLECTION DU SECTEUR", {
      fontFamily: "Arial",
      fontSize: "30px",
      color: "#f8fafc",
      fontStyle: "bold",
      letterSpacing: 3,
    }).setOrigin(0.5).setDepth(32);
    this.add.text(WIDTH / 2, 193, "Terminez un secteur pour déverrouiller le suivant", {
      fontFamily: "Arial",
      fontSize: "14px",
      color: "#94a3b8",
    }).setOrigin(0.5).setDepth(32);

    LEVELS.forEach((level, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 400 + col * 240;
      const y = 285 + row * 120;
      const available = index <= unlocked;
      const waveLabel = level.waves === null ? "SURVIE SANS LIMITE" : `${level.waves} VAGUES`;

      if (available) {
        const button = this.makeButton(x, y, 210, 78, `${level.code}\n${level.name.toUpperCase()}`, index === LEVELS.length - 1 ? 0x7c3aed : 0x1e3a5f, () => {
          this.scene.restart({ levelIndex: index });
        });
        button.setDepth(32);
        this.add.text(x, y + 52, waveLabel, {
          fontFamily: "Arial",
          fontSize: "10px",
          color: "#64748b",
          letterSpacing: 1,
        }).setOrigin(0.5).setDepth(32);
      } else {
        this.add.rectangle(x, y, 210, 78, 0x111827, 0.7).setStrokeStyle(1, 0x334155).setDepth(32);
        this.add.text(x, y - 6, "VERROUILLÉ", {
          fontFamily: "Arial",
          fontSize: "15px",
          color: "#475569",
          fontStyle: "bold",
          letterSpacing: 2,
        }).setOrigin(0.5).setDepth(33);
        this.add.text(x, y + 22, level.code, {
          fontFamily: "Arial",
          fontSize: "11px",
          color: "#334155",
        }).setOrigin(0.5).setDepth(33);
      }
    });

    overlay.on("pointerdown", () => undefined);
    panel.setInteractive().on("pointerdown", () => undefined);
  }

  private beginLevel(index: number): void {
    this.levelIndex = Phaser.Math.Clamp(index, 0, LEVELS.length - 1);
    this.levelStarted = true;
    this.levelText.setText(LEVELS[this.levelIndex].code);
    this.setStartButtonEnabled(true);
    this.updateHud(`${LEVELS[this.levelIndex].name} — préparez votre dispositif`);
  }

  private completeLevel(): void {
    this.levelStarted = false;
    this.setStartButtonEnabled(false);
    const nextIndex = Math.min(this.levelIndex + 1, LEVELS.length - 1);
    this.saveUnlockedLevel(nextIndex);

    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x02040a, 0.84).setDepth(30).setInteractive();
    this.add.text(WIDTH / 2, HEIGHT / 2 - 100, "SECTEUR SÉCURISÉ", {
      fontFamily: "Arial",
      fontSize: "38px",
      color: "#4ade80",
      fontStyle: "bold",
      letterSpacing: 3,
    }).setOrigin(0.5).setDepth(31);
    this.add.text(WIDTH / 2, HEIGHT / 2 - 48, `${LEVELS[this.levelIndex].name} terminé`, {
      fontFamily: "Arial",
      fontSize: "17px",
      color: "#cbd5e1",
    }).setOrigin(0.5).setDepth(31);

    const nextLabel = this.levelIndex === LEVELS.length - 2 ? "DÉBLOQUER LE MODE INFINI" : "SECTEUR SUIVANT";
    this.makeButton(WIDTH / 2, HEIGHT / 2 + 35, 280, 52, nextLabel, 0x166534, () => {
      this.scene.restart({ levelIndex: nextIndex });
    }).setDepth(31);
    this.makeButton(WIDTH / 2, HEIGHT / 2 + 105, 220, 44, "CHOIX DU SECTEUR", 0x334155, () => {
      this.scene.restart();
    }).setDepth(31);
  }

  private getUnlockedLevel(): number {
    try {
      return Phaser.Math.Clamp(Number(localStorage.getItem("chelie-unlocked-level") ?? 0), 0, LEVELS.length - 1);
    } catch {
      return 0;
    }
  }

  private saveUnlockedLevel(index: number): void {
    try {
      localStorage.setItem("chelie-unlocked-level", String(Math.max(this.getUnlockedLevel(), index)));
    } catch {
      // La progression reste disponible pour la session si le stockage est désactivé.
    }
  }

  private createTowerPalette(): void {
    const x = 112;
    const startY = 160;

    this.add.text(x, startY - 34, "ARSENAL", this.labelStyle(0xe2e8f0)).setOrigin(0.5);

    (Object.keys(TOWERS) as TowerKind[]).forEach((kind, index) => {
      const definition = TOWERS[kind];
      const available = this.levelIndex >= definition.unlockLevel;
      const y = startY + index * 76;
      const button = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, 170, 62, 0x071426, 0.92)
        .setStrokeStyle(2, available && kind === this.selectedTower ? definition.color : 0x334155, 1);
      const icon = this.add.circle(-57, 0, 19, definition.color, available ? 0.2 : 0.06).setStrokeStyle(2, available ? definition.color : 0x334155);
      const iconText = this.add.text(-55, -2, definition.icon, {
        fontFamily: "Arial",
        fontSize: "19px",
        color: available ? `#${definition.color.toString(16).padStart(6, "0")}` : "#475569",
      }).setOrigin(0.5);
      const title = this.add.text(-26, -17, definition.name.toUpperCase(), {
        fontFamily: "Arial",
        fontSize: "13px",
        color: available ? "#f8fafc" : "#64748b",
        fontStyle: "bold",
      });
      const targetLabel = definition.target === "sea" ? "CIBLE MARINE" : definition.target === "air" ? "CIBLE AÉRIENNE" : "CIBLE UNIVERSELLE";
      const detail = available ? `${definition.cost} PIÈCES  •  ${targetLabel}` : `DÉBLOCAGE : ${LEVELS[definition.unlockLevel].code}`;
      const target = this.add.text(-26, 7, detail, {
        fontFamily: "Arial",
        fontSize: "9px",
        color: "#64748b",
      });
      button.add([bg, icon, iconText, title, target]);
      button.setSize(170, 62).setInteractive({ useHandCursor: true });
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
    if (this.levelIndex < TOWERS[kind].unlockLevel) {
      this.updateHud(`${TOWERS[kind].name} sera débloqué dans ${LEVELS[TOWERS[kind].unlockLevel].code}`);
      return;
    }
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
    if (this.energy < definition.cost) {
      this.updateHud(`${definition.name} coûte ${definition.cost} pièces — solde insuffisant`);
      return;
    }
    if (!this.calculatePath({ col: 0, row: ENTRY_ROW }, { col: GRID_COLS - 1, row: ENTRY_ROW }, { col, row })) {
      this.updateHud("Il faut toujours laisser un chemin jusqu’au cœur");
      this.cameras.main.shake(120, 0.002);
      return;
    }

    this.energy -= definition.cost;
    const towerBody = this.add.container(towerX, towerY);

    const base = this.add.circle(0, 8, 28, 0x071426).setStrokeStyle(3, definition.color, 0.8);
    const turret = this.add.rectangle(0, -3, 17, 34, definition.color, 0.92).setRounded(6);
    const core = this.add.circle(0, -7, 8, 0xffffff, 0.85);
    const levelBadge = this.add.text(21, 21, "1", {
      fontFamily: "Arial",
      fontSize: "11px",
      color: "#ffffff",
      backgroundColor: "#0f172a",
      padding: { x: 4, y: 2 },
      fontStyle: "bold",
    }).setOrigin(0.5);
    towerBody.add([base, turret, core, levelBadge]);

    const tower: Tower = {
      body: towerBody,
      kind: this.selectedTower,
      range: definition.range,
      damage: definition.damage,
      fireDelay: definition.fireDelay,
      lastShot: 0,
      col,
      row,
      level: 1,
      levelBadge,
    };
    towerBody.setSize(CELL - 4, CELL - 4).setInteractive({ useHandCursor: true });
    towerBody.on("pointerdown", (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
      this.upgradeTower(tower);
    });
    this.towers.push(tower);
    this.recalculateSeaPaths();
    this.updateHud(`${definition.name} déployé pour ${definition.cost} pièces — touchez-la pour l’améliorer`);
  }

  private startWave(): void {
    if (!this.levelStarted || this.waveActive || this.baseHp <= 0) return;
    const level = LEVELS[this.levelIndex];
    if (level.waves !== null && this.wave >= level.waves) return;
    this.wave += 1;
    this.enemiesToSpawn = 5 + this.wave * 2 + level.swarmBonus;
    this.spawnedThisWave = 0;
    this.waveActive = true;
    this.nextSpawnAt = 0;
    this.setStartButtonEnabled(false);
    this.updateHud(this.isBossWave() ? `ALERTE — boss détecté dans la vague ${this.wave}` : `Vague ${this.wave} en approche`);
  }

  private spawnWaveEnemies(time: number): void {
    if (!this.waveActive || this.spawnedThisWave >= this.enemiesToSpawn || time < this.nextSpawnAt) return;

    const kind: EnemyKind = (this.spawnedThisWave + this.wave) % 2 === 0 ? "air" : "sea";
    const y = Phaser.Math.Between(150, HEIGHT - 55);
    const isBoss = this.isBossWave() && this.spawnedThisWave === 0;
    this.spawnEnemy(kind, y, isBoss);
    this.spawnedThisWave += 1;
    this.nextSpawnAt = time + Math.max(400, 1150 - this.wave * 45 - this.levelIndex * 35);
  }

  private spawnEnemy(kind: EnemyKind, y: number, isBoss = false): void {
    const color = isBoss ? 0xdc2626 : kind === "air" ? 0xfb7185 : 0x22d3ee;
    const spawnY = kind === "sea" ? GRID_Y + ENTRY_ROW * CELL : y;
    const container = this.add.container(GRID_X, spawnY);
    const scale = isBoss ? 1.55 : 1;
    const shadow = this.add.ellipse(0, 15, 54 * scale, 14 * scale, 0x020617, 0.45);
    const creature = kind === "air"
      ? this.add.triangle(0, 0, -25 * scale, 12 * scale, 0, -18 * scale, 25 * scale, 12 * scale, color, 0.95)
      : this.add.ellipse(0, 0, 54 * scale, 30 * scale, color, 0.92);
    creature.setStrokeStyle(isBoss ? 3 : 2, isBoss ? 0xfca5a5 : 0xffffff, isBoss ? 0.9 : 0.35);
    const eye = this.add.circle(12 * scale, -4 * scale, isBoss ? 5 : 3, 0xffffff);
    const healthBarWidth = isBoss ? 82 : 48;
    const healthY = isBoss ? -45 : -28;
    const healthBg = this.add.rectangle(0, healthY, healthBarWidth, isBoss ? 8 : 5, 0x020617, 0.9);
    const healthBar = this.add.rectangle(-healthBarWidth / 2, healthY, healthBarWidth, isBoss ? 8 : 5, color).setOrigin(0, 0.5);
    const bossLabel = isBoss ? this.add.text(0, healthY - 15, "BOSS", {
      fontFamily: "Arial",
      fontSize: "10px",
      color: "#fecaca",
      fontStyle: "bold",
      letterSpacing: 2,
    }).setOrigin(0.5) : null;
    container.add(bossLabel ? [shadow, creature, eye, healthBg, healthBar, bossLabel] : [shadow, creature, eye, healthBg, healthBar]);

    const level = LEVELS[this.levelIndex];
    const hp = Math.round((48 + this.wave * 12) * level.healthMultiplier * (isBoss ? 8 : 1));
    this.enemies.push({
      body: container,
      kind,
      hp,
      maxHp: hp,
      speed: (38 + this.wave * 2.5) * level.speedMultiplier * (isBoss ? 0.62 : 1),
      healthBar,
      healthBarWidth,
      path: kind === "sea" ? this.calculatePath(
        { col: 0, row: ENTRY_ROW },
        { col: GRID_COLS - 1, row: ENTRY_ROW },
      ) ?? [] : [],
      pathIndex: 1,
      isBoss,
      coreDamage: isBoss ? 5 : 1,
      energyReward: isBoss ? 80 + this.wave * 4 : 8 + Math.ceil(this.wave / 3),
      slowedUntil: 0,
    });
  }

  private moveEnemies(time: number, delta: number): void {
    const baseX = WIDTH - 150;
    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = this.enemies[index];
      const speed = enemy.speed * (time < enemy.slowedUntil ? 0.55 : 1);
      if (enemy.kind === "air") {
        enemy.body.x += speed * (delta / 1000);
        enemy.body.y += Math.sin((enemy.body.x + index * 20) / 55) * 0.16;
      } else {
        this.followPath(enemy, delta, speed);
      }

      if (enemy.body.x >= baseX) {
        enemy.body.destroy();
        this.enemies.splice(index, 1);
        this.baseHp = Math.max(0, this.baseHp - enemy.coreDamage);
        this.cameras.main.shake(180, 0.005);
        this.updateHud(this.baseHp > 0 ? "Le noyau est touché !" : "Défaite — intégrité critique");
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
          this.applyTowerHit(tower, target, definition);
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

  private applyTowerHit(tower: Tower, target: Enemy, definition: TowerDefinition): void {
    const impactX = target.body.x;
    const impactY = target.body.y;

    if (definition.effect === "slow") {
      target.slowedUntil = Math.max(target.slowedUntil, this.time.now + 2200);
    }
    if (definition.effect === "splash") {
      const victims = this.enemies.filter((enemy) =>
        enemy !== target && Phaser.Math.Distance.Between(impactX, impactY, enemy.body.x, enemy.body.y) <= 90,
      );
      victims.forEach((enemy) => this.damageEnemy(enemy, Math.round(tower.damage * 0.55), definition.color));
    }

    this.damageEnemy(target, tower.damage, definition.color);
  }

  private damageEnemy(enemy: Enemy, damage: number, color: number): void {
    if (!enemy.body.active) return;
    enemy.hp -= damage;
    enemy.healthBar.width = enemy.healthBarWidth * Math.max(0, enemy.hp / enemy.maxHp);
    this.createImpact(enemy.body.x, enemy.body.y, color);
    if (enemy.hp <= 0) this.destroyEnemy(enemy);
  }

  private destroyEnemy(enemy: Enemy): void {
    const index = this.enemies.indexOf(enemy);
    if (index === -1) return;
    this.energy += enemy.energyReward;
    this.showEnergyReward(enemy.body.x, enemy.body.y, enemy.energyReward, enemy.isBoss);
    enemy.body.destroy();
    this.enemies.splice(index, 1);
    this.updateHud(enemy.isBoss
      ? `Boss ${enemy.kind === "air" ? "aérien" : "marin"} neutralisé`
      : `${enemy.kind === "air" ? "Créature aérienne" : "Monstre marin"} neutralisé`);
  }

  private upgradeTower(tower: Tower): void {
    const definition = TOWERS[tower.kind];
    if (tower.level >= MAX_TOWER_LEVEL) {
      this.updateHud(`${definition.name} au niveau maximal`);
      this.createUpgradePulse(tower, 0x4ade80);
      return;
    }

    const cost = UPGRADE_COSTS[tower.level];
    if (this.energy < cost) {
      this.updateHud(`Amélioration niveau ${tower.level + 1} : ${cost} pièces requises`);
      this.createUpgradePulse(tower, 0xef4444);
      return;
    }

    this.energy -= cost;
    tower.level += 1;
    tower.damage = Math.round(tower.damage * 1.35);
    tower.range += 16;
    tower.fireDelay = Math.max(260, Math.round(tower.fireDelay * 0.88));
    tower.levelBadge.setText(String(tower.level));

    const turret = tower.body.getAt(1) as Phaser.GameObjects.Rectangle;
    turret.setScale(1 + (tower.level - 1) * 0.08);
    this.createUpgradePulse(tower, definition.color);
    this.updateHud(`${definition.name} niveau ${tower.level} — puissance augmentée`);
  }

  private showEnergyReward(x: number, y: number, amount: number, isBoss: boolean): void {
    const text = this.add.text(x, y - 35, `+${amount} ◈`, {
      fontFamily: "Arial",
      fontSize: isBoss ? "18px" : "13px",
      color: isBoss ? "#fde047" : "#facc15",
      fontStyle: "bold",
    }).setOrigin(0.5);
    this.tweens.add({
      targets: text,
      y: y - 70,
      alpha: 0,
      duration: 750,
      ease: "Cubic.easeOut",
      onComplete: () => text.destroy(),
    });
  }

  private createUpgradePulse(tower: Tower, color: number): void {
    const pulse = this.add.circle(tower.body.x, tower.body.y, 28, color, 0.12).setStrokeStyle(3, color, 0.9);
    this.tweens.add({
      targets: pulse,
      scale: 2,
      alpha: 0,
      duration: 350,
      onComplete: () => pulse.destroy(),
    });
  }

  private isBossWave(): boolean {
    return this.wave > 0 && this.wave % 5 === 0;
  }

  private createImpact(x: number, y: number, color: number): void {
    const impact = this.add.circle(x, y, 8, color, 0.65);
    this.tweens.add({ targets: impact, scale: 2.4, alpha: 0, duration: 180, onComplete: () => impact.destroy() });
  }

  private followPath(enemy: Enemy, delta: number, speed: number): void {
    const target = enemy.path[enemy.pathIndex];
    if (!target) {
      enemy.body.x += speed * (delta / 1000);
      return;
    }

    const distance = Phaser.Math.Distance.Between(enemy.body.x, enemy.body.y, target.x, target.y);
    const step = speed * (delta / 1000);
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
    this.levelStarted = false;
    this.setStartButtonEnabled(false);
    const overlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x020617, 0.78);
    const title = this.add.text(WIDTH / 2, HEIGHT / 2 - 70, "RUPTURE DU NOYAU", {
      fontFamily: "Arial",
      fontSize: "42px",
      color: "#fb7185",
      fontStyle: "bold",
    }).setOrigin(0.5);
    const retry = this.makeButton(WIDTH / 2, HEIGHT / 2 + 15, 210, 48, "RECOMMENCER", 0x0284c7, () => this.scene.restart({ levelIndex: this.levelIndex }));
    const menu = this.makeButton(WIDTH / 2, HEIGHT / 2 + 78, 210, 42, "CHOIX DU SECTEUR", 0x334155, () => this.scene.restart());
    overlay.setDepth(20);
    title.setDepth(21);
    retry.setDepth(21);
    menu.setDepth(21);
  }

  private updateHud(message: string): void {
    this.hpText?.setText(`INTÉGRITÉ ${this.baseHp}`);
    this.energyText?.setText(`PIÈCES ${this.energy}`);
    const level = LEVELS[this.levelIndex];
    this.waveText?.setText(level.waves === null ? `VAGUE ${this.wave} / ∞` : `VAGUE ${this.wave} / ${level.waves}`);
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
