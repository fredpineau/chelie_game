import Phaser from "phaser";
import "./style.css";

const WIDTH = 720;
const HEIGHT = 1280;
const CELL = 29;
const GRID_X = 55;
const GRID_Y = 116;
const GRID_COLS = 22;
const GRID_ROWS = 30;
const PLANT_FRAME_SIZE = CELL + 14;
const PLANT_HALF_STEP = PLANT_FRAME_SIZE / 2;
const MAP_CENTER_X = GRID_X + ((GRID_COLS - 1) * CELL) / 2;
const MAP_CENTER_Y = GRID_Y + ((GRID_ROWS - 1) * CELL) / 2;
const TOP_ENTRY_COL = Math.floor(GRID_COLS / 2);
const BOTTOM_ENTRY_COL = 0;
const TOP_ENTRY_ROW = 0;
const BOTTOM_ENTRY_ROW = Math.floor((GRID_ROWS - 1) / 2);
const TOP_EXIT_COL = GRID_COLS - 1;
const TOP_EXIT_ROW = Math.floor((GRID_ROWS - 1) / 2);
const BOTTOM_EXIT_COL = Math.floor((GRID_COLS - 1) / 2);
const BOTTOM_EXIT_ROW = GRID_ROWS - 1;
const GATE_OUTSET = 18;

type EnemyKind = "air" | "sea";
type EnemyTrait = "normal" | "armored" | "swift" | "regenerator";
type TargetPriority = "first" | "strong" | "weak";
type ExitId = "right" | "bottom";
type TrapJawPair = {
  leftJaw: Phaser.GameObjects.Container;
  rightJaw: Phaser.GameObjects.Container;
  leftX: number;
  rightX: number;
  y: number;
  leftRotation: number;
  rightRotation: number;
};
type TowerKind = "harpoon" | "flak" | "pulse" | "cryo";
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
  exitCol: number;
  exitRow: number;
  exitX: number;
  exitY: number;
  trait: EnemyTrait;
  armor: number;
  regeneration: number;
  exitId: ExitId;
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
  investedCost: number;
  priority: TargetPriority;
  isUpgrading: boolean;
  upgradeReadyAt: number;
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
  harpoon: { name: "Dionée", icon: "D", color: 0x66845b, target: "sea", cost: 5, damage: 24, range: 205, fireDelay: 820, effect: "standard", unlockLevel: 0 },
  flak: { name: "Sarracénie", icon: "S", color: 0x9a5938, target: "air", cost: 10, damage: 16, range: 250, fireDelay: 520, effect: "standard", unlockLevel: 0 },
  pulse: { name: "Drosera", icon: "R", color: 0x8d596d, target: "all", cost: 20, damage: 11, range: 220, fireDelay: 700, effect: "standard", unlockLevel: 0 },
  cryo: { name: "Népenthès", icon: "N", color: 0x5f898c, target: "all", cost: 30, damage: 8, range: 190, fireDelay: 1050, effect: "slow", unlockLevel: 0 },
};

const TOWER_EVOLUTIONS: Record<TowerKind, [string, string, string]> = {
  harpoon: ["Dionée", "Dionée vorace", "Dionée titan"],
  flak: ["Sarracénie", "Sarracénie chasseuse", "Sarracénie céleste"],
  pulse: ["Drosera", "Drosera pourpre", "Drosera écarlate"],
  cryo: ["Népenthès", "Népenthès brumeuse", "Népenthès polaire"],
};

const MAX_TOWER_LEVEL = 5;
const UPGRADE_COSTS = [0, 40, 100, 220, 450];
const UPGRADE_DURATIONS = [0, 3_000, 7_000, 14_000, 25_000];
const MASTERY_COSTS = [100, 200, 300, 400, 500];
const TEMP_LEVEL_COLORS = [0x7a3038, 0x315d86, 0x3f7049, 0x644a7e, 0x8a7435];

const LEVELS: LevelDefinition[] = [
  { name: "Marais affamé", code: "BIOME 01", waves: 10, healthMultiplier: 1.15, speedMultiplier: 0.98, swarmBonus: 2 },
  { name: "Canopée hostile", code: "BIOME 02", waves: 15, healthMultiplier: 1.4, speedMultiplier: 1.08, swarmBonus: 4 },
  { name: "Serre écarlate", code: "BIOME 03", waves: 20, healthMultiplier: 1.7, speedMultiplier: 1.17, swarmBonus: 6 },
  { name: "Tourbière noire", code: "BIOME 04", waves: 25, healthMultiplier: 2.05, speedMultiplier: 1.25, swarmBonus: 8 },
  { name: "Jardin primordial", code: "BIOME 05", waves: 30, healthMultiplier: 2.45, speedMultiplier: 1.32, swarmBonus: 10 },
  { name: "Fosse des spores", code: "BIOME 06", waves: 35, healthMultiplier: 2.9, speedMultiplier: 1.38, swarmBonus: 12 },
  { name: "Delta vorace", code: "BIOME 07", waves: 40, healthMultiplier: 3.4, speedMultiplier: 1.44, swarmBonus: 14 },
  { name: "Crypte chlorophylle", code: "BIOME 08", waves: 45, healthMultiplier: 4, speedMultiplier: 1.5, swarmBonus: 16 },
  { name: "Cime parasitaire", code: "BIOME 09", waves: 50, healthMultiplier: 4.7, speedMultiplier: 1.57, swarmBonus: 18 },
  { name: "Nécropole florale", code: "BIOME 10", waves: 55, healthMultiplier: 5.5, speedMultiplier: 1.64, swarmBonus: 20 },
  { name: "Tourbière souveraine", code: "BIOME 11", waves: 60, healthMultiplier: 6.4, speedMultiplier: 1.72, swarmBonus: 23 },
  { name: "Floraison éternelle", code: "MODE INFINI", waves: null, healthMultiplier: 7.2, speedMultiplier: 1.8, swarmBonus: 26 },
];

class DefenseScene extends Phaser.Scene {
  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private baseHp = 20;
  private energy = 60;
  private wateringCans = 0;
  private plantMastery: Record<TowerKind, number> = { harpoon: 0, flak: 0, pulse: 0, cryo: 0 };
  private wave = 0;
  private enemiesToSpawn = 0;
  private spawnedThisWave = 0;
  private waveActive = false;
  private selectedTower: TowerKind | null = null;
  private nextSpawnAt = 0;
  private nextWaveAt = 0;
  private levelIndex = 0;
  private levelStarted = false;
  private requestedLevelIndex: number | null = null;
  private selectionPage = 0;
  private infiniteNightmare = false;
  private waveEntryTop = true;
  private waveExitId: ExitId = "right";
  private waveRouteGuide = { col: Math.floor(GRID_COLS / 2), row: Math.floor(GRID_ROWS / 2) };
  private hpText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private energyText!: Phaser.GameObjects.Text;
  private shearText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private startButton!: Phaser.GameObjects.Container;
  private menuOverlay?: Phaser.GameObjects.Container;
  private menuOpen = false;
  private menuOpenedAt = 0;
  private towerButtons = new Map<TowerKind, Phaser.GameObjects.Container[]>();
  private towerActionPanel?: Phaser.GameObjects.Container;
  private towerSelectionGlow?: Phaser.GameObjects.Rectangle;
  private towerRangeIndicator?: Phaser.GameObjects.Arc;
  private exitTraps = new Map<ExitId, TrapJawPair[]>();

  constructor() {
    super("defense");
  }

  init(data: { levelIndex?: number; home?: boolean; selectionPage?: number; infiniteNightmare?: boolean } = {}): void {
    this.requestedLevelIndex = data.home ? null : data.levelIndex ?? null;
    this.selectionPage = Phaser.Math.Clamp(data.selectionPage ?? 0, 0, 1);
    this.infiniteNightmare = data.infiniteNightmare ?? false;
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
    if (!this.levelStarted || this.baseHp <= 0 || this.menuOpen) return;

    this.updateAutoWave(time);
    this.spawnWaveEnemies(time);
    this.moveEnemies(time, delta);
    this.fireTowers(time);
    this.updateTowerUpgrades(time);

    if (this.waveActive && this.spawnedThisWave >= this.enemiesToSpawn && this.enemies.length === 0) {
      this.waveActive = false;
      const earnsWateringCan = this.levelIndex !== LEVELS.length - 1 || this.wave % 5 === 0;
      if (earnsWateringCan) {
        this.wateringCans += 1;
        this.savePermanentProgress();
        this.showWateringCanReward();
      }
      const level = LEVELS[this.levelIndex];
      if (level.waves !== null && this.wave >= level.waves) {
        this.completeLevel();
      } else {
        this.updateHud(`Vague ${this.wave} digérée — biome protégé`);
        this.setStartButtonEnabled(true);
        this.scheduleNextWave(10_000);
      }
    }
  }

  private resetState(): void {
    this.enemies = [];
    this.towers = [];
    this.baseHp = 20;
    this.energy = 60;
    this.loadPermanentProgress();
    this.wave = 0;
    this.enemiesToSpawn = 0;
    this.spawnedThisWave = 0;
    this.waveActive = false;
    this.levelStarted = false;
    this.nextSpawnAt = 0;
    this.nextWaveAt = 0;
    this.selectedTower = null;
    this.waveEntryTop = true;
    this.waveExitId = "right";
    this.waveRouteGuide = { col: Math.floor(GRID_COLS / 2), row: Math.floor(GRID_ROWS / 2) };
    this.towerButtons.clear();
    this.exitTraps.clear();
    this.menuOpen = false;
    this.menuOpenedAt = 0;
    this.menuOverlay = undefined;
  }

  private drawWorld(): void {
    const background = this.add.graphics();
    background.fillGradientStyle(0xc8bb94, 0xd8cba5, 0xb9ad88, 0xcdbf98, 1);
    background.fillRect(0, 0, WIDTH, HEIGHT);

    this.createMarshAtmosphere();
    this.drawMapBoundary();
    this.createCommandDeck();

    this.createGates();
  }

  private drawMapBoundary(): void {
    const boundary = this.add.graphics();
    const left = GRID_X - CELL / 2;
    const top = GRID_Y - CELL / 2;
    const width = GRID_COLS * CELL;
    const height = GRID_ROWS * CELL;
    boundary.lineStyle(4, 0x397f86, 0.82);
    boundary.strokeRoundedRect(left, top, width, height, 18);
    boundary.lineStyle(1, 0xd5f1ee, 0.38);
    boundary.strokeRoundedRect(left + 5, top + 5, width - 10, height - 10, 14);
  }

  private gridToWorldX(col: number, row: number): number {
    void row;
    return GRID_X + col * CELL;
  }

  private gridToWorldY(row: number): number {
    return GRID_Y + row * CELL;
  }

  private createCommandDeck(): void {
    const deckTop = HEIGHT - 270;
    const deck = this.add.graphics();
    deck.fillGradientStyle(0x58a8ad, 0x58a8ad, 0x2f7782, 0x2f7782, 0.96);
    deck.fillRect(0, deckTop, WIDTH, HEIGHT - deckTop);
    deck.lineStyle(3, 0xb9d8df, 0.9);
    deck.beginPath();
    deck.moveTo(0, deckTop);
    deck.lineTo(WIDTH, deckTop);
    deck.strokePath();
    deck.lineStyle(1, 0xe8f6f8, 0.3);
    deck.beginPath();
    deck.moveTo(0, deckTop + 6);
    deck.lineTo(WIDTH, deckTop + 6);
    deck.strokePath();
  }

  private createMarshAtmosphere(): void {
    const sunX = 58;
    const sunY = 58;
    const sunHalo = this.add.circle(sunX, sunY, 50, 0xf6d98b, 0.1);
    const sun = this.add.circle(sunX, sunY, 27, 0xf1cf78, 0.86).setStrokeStyle(2, 0xffe5a6, 0.55);
    const sunRays = this.add.graphics();
    sunRays.lineStyle(2, 0xf8dda0, 0.32);
    for (let ray = 0; ray < 12; ray += 1) {
      const angle = (Math.PI * 2 * ray) / 12;
      sunRays.beginPath();
      sunRays.moveTo(sunX + Math.cos(angle) * 36, sunY + Math.sin(angle) * 36);
      sunRays.lineTo(sunX + Math.cos(angle) * 46, sunY + Math.sin(angle) * 46);
      sunRays.strokePath();
    }
    this.tweens.add({ targets: sunHalo, scale: 1.16, alpha: 0.05, yoyo: true, repeat: -1, duration: 2800 });
    this.tweens.add({ targets: sun, alpha: 0.72, yoyo: true, repeat: -1, duration: 2200 });

    const terrain = this.add.graphics();
    terrain.fillStyle(0x8f8060, 0.24);
    terrain.fillEllipse(470, 245, 390, 180);
    terrain.fillEllipse(925, 500, 520, 230);
    terrain.fillStyle(0x72a9a9, 0.38);
    terrain.fillEllipse(730, 360, 610, 300);
    terrain.fillStyle(0xa9cec1, 0.28);
    terrain.fillEllipse(660, 330, 450, 170);
    terrain.fillEllipse(1030, 235, 310, 130);
    terrain.fillStyle(0x928363, 0.22);
    terrain.fillEllipse(330, 690, 610, 380);
    terrain.fillStyle(0x78aeae, 0.34);
    terrain.fillEllipse(390, 745, 520, 300);
    terrain.fillStyle(0xb0d1c6, 0.24);
    terrain.fillEllipse(250, 850, 350, 150);

    const waterSheen = this.add.graphics();
    waterSheen.lineStyle(2, 0xd1e2dc, 0.27);
    [
      { x: 420, y: 225, width: 180 },
      { x: 690, y: 410, width: 250 },
      { x: 980, y: 295, width: 190 },
      { x: 865, y: 555, width: 280 },
    ].forEach(({ x, y, width }) => {
      waterSheen.strokeEllipse(x, y, width, 22);
      waterSheen.strokeEllipse(x + 28, y + 17, width * 0.62, 13);
    });

    const roots = this.add.graphics();
    roots.lineStyle(7, 0x080b09, 0.7);
    roots.beginPath();
    roots.moveTo(210, 630);
    roots.lineTo(300, 580);
    roots.lineTo(350, 605);
    roots.lineTo(430, 555);
    roots.strokePath();
    roots.beginPath();
    roots.moveTo(1260, 155);
    roots.lineTo(1175, 205);
    roots.lineTo(1115, 180);
    roots.lineTo(1040, 225);
    roots.strokePath();
    roots.lineStyle(3, 0x283528, 0.55);
    roots.beginPath();
    roots.moveTo(300, 580);
    roots.lineTo(278, 532);
    roots.moveTo(350, 605);
    roots.lineTo(382, 645);
    roots.moveTo(1175, 205);
    roots.lineTo(1190, 148);
    roots.moveTo(1115, 180);
    roots.lineTo(1082, 137);
    roots.strokePath();

    const reedClusters = [
      { x: 255, y: 530 },
      { x: 445, y: 165 },
      { x: 1010, y: 595 },
      { x: 1195, y: 470 },
    ];
    reedClusters.forEach(({ x, y }, clusterIndex) => {
      for (let reed = 0; reed < 5; reed += 1) {
        const offset = (reed - 2) * 8;
        const height = 30 + ((reed + clusterIndex) % 3) * 11;
        const stem = this.add.line(0, 0, x + offset, y, x + offset + (reed % 2 === 0 ? -5 : 5), y - height, 0x42533b, 0.7)
          .setOrigin(0, 0)
          .setLineWidth(2);
        const seed = this.add.ellipse(x + offset + (reed % 2 === 0 ? -5 : 5), y - height, 5, 13, 0x171a13, 0.8);
        this.tweens.add({ targets: [stem, seed], angle: reed % 2 === 0 ? 1.2 : -1.2, yoyo: true, repeat: -1, duration: 1900 + reed * 170 });
      }
    });

    [
      { x: 375, y: 330, scale: 1 },
      { x: 805, y: 215, scale: 0.75 },
      { x: 1080, y: 470, scale: 1.15 },
    ].forEach(({ x, y, scale }, index) => {
      const mist = this.add.ellipse(x, y, 240 * scale, 42 * scale, 0xa7c4bc, 0.035);
      this.tweens.add({
        targets: mist,
        x: x + (index % 2 === 0 ? 55 : -55),
        alpha: 0.085,
        yoyo: true,
        repeat: -1,
        duration: 6500 + index * 900,
      });
    });

    [
      { x: 520, y: 575 },
      { x: 770, y: 175 },
      { x: 1125, y: 365 },
    ].forEach(({ x, y }, index) => {
      const spore = this.add.circle(x, y, 2, 0x9fbf8f, 0.25);
      this.tweens.add({ targets: spore, y: y - 28, alpha: 0, yoyo: true, repeat: -1, duration: 2400 + index * 500 });
    });
  }

  private createGates(): void {
    this.createCreatureGate(this.gridToWorldX(TOP_ENTRY_COL, TOP_ENTRY_ROW), GRID_Y - CELL / 2 - GATE_OUTSET, "ENTRÉE 1", Math.PI, false);
    this.createCreatureGate(GRID_X - CELL / 2 - GATE_OUTSET, this.gridToWorldY(BOTTOM_ENTRY_ROW), "ENTRÉE 2", -Math.PI / 2, false);
    this.createExitTrap(this.gridToWorldX(TOP_EXIT_COL, TOP_EXIT_ROW) + CELL / 2 + GATE_OUTSET, this.gridToWorldY(TOP_EXIT_ROW), "right", -Math.PI / 2);
    this.createExitTrap(this.gridToWorldX(BOTTOM_EXIT_COL, BOTTOM_EXIT_ROW), this.gridToWorldY(BOTTOM_EXIT_ROW) + CELL / 2 + GATE_OUTSET, "bottom", 0);
  }

  private createExitTrap(x: number, y: number, exitId: ExitId, rotation: number): void {
    const trap = this.add.container(x, y).setRotation(rotation).setScale(0.42);
    const shadow = this.add.ellipse(0, 3, 90, 76, 0x07110b, 0.32);
    const stem = this.add.rectangle(0, 37, 13, 48, 0x31562f).setStrokeStyle(2, 0x1d3820);
    const leftJaw = this.add.container(-17, -5).setRotation(-0.22);
    const rightJaw = this.add.container(17, -5).setRotation(0.22);
    const leftLobe = this.add.ellipse(0, 0, 43, 78, 0x638a51).setStrokeStyle(3, 0x294b31);
    const rightLobe = this.add.ellipse(0, 0, 43, 78, 0x638a51).setStrokeStyle(3, 0x294b31);
    const leftMouth = this.add.ellipse(7, -2, 27, 61, 0x754447, 0.9).setStrokeStyle(2, 0x4b252d);
    const rightMouth = this.add.ellipse(-7, -2, 27, 61, 0x754447, 0.9).setStrokeStyle(2, 0x4b252d);
    const leftMainVein = this.add.line(0, 0, -7, 30, -2, -31, 0xa1b979, 0.48).setLineWidth(2);
    const rightMainVein = this.add.line(0, 0, 7, 30, 2, -31, 0xa1b979, 0.48).setLineWidth(2);
    leftJaw.add([leftLobe, leftMouth, leftMainVein]);
    rightJaw.add([rightLobe, rightMouth, rightMainVein]);

    for (let cilium = -3; cilium <= 3; cilium += 1) {
      const ciliumY = cilium * 9;
      const tipOffset = cilium * -0.7;
      leftJaw.add(this.add.line(0, 0, 16, ciliumY, 29, ciliumY + tipOffset, 0xc0d3a0, 0.92).setLineWidth(1.5));
      rightJaw.add(this.add.line(0, 0, -16, ciliumY, -29, ciliumY + tipOffset, 0xc0d3a0, 0.92).setLineWidth(1.5));
    }
    for (let vein = -2; vein <= 2; vein += 1) {
      const veinY = vein * 11;
      leftJaw.add(this.add.line(0, 0, -1, veinY, 12, veinY - 4, 0xc18a88, 0.28).setLineWidth(1));
      rightJaw.add(this.add.line(0, 0, 1, veinY, -12, veinY - 4, 0xc18a88, 0.28).setLineWidth(1));
    }
    for (let hair = -1; hair <= 1; hair += 1) {
      const hairY = hair * 15;
      leftJaw.add(this.add.line(0, 0, 9, hairY, 14, hairY - 5, 0x331a20, 0.75).setLineWidth(1));
      rightJaw.add(this.add.line(0, 0, -9, hairY, -14, hairY - 5, 0x331a20, 0.75).setLineWidth(1));
    }
    const jawPairs: TrapJawPair[] = [{
      leftJaw,
      rightJaw,
      leftX: -17,
      rightX: 17,
      y: -5,
      leftRotation: -0.22,
      rightRotation: 0.22,
    }];
    const sideJaws: Phaser.GameObjects.Container[] = [];
    [-43, 43].forEach((offsetX, index) => {
      const sideLeftX = offsetX - 11;
      const sideRightX = offsetX + 11;
      const sideY = 15;
      const sideLeft = this.add.container(sideLeftX, sideY).setRotation(-0.28).setScale(0.68);
      const sideRight = this.add.container(sideRightX, sideY).setRotation(0.28).setScale(0.68);
      const sideColor = index === 0 ? 0x75965c : 0x6f9158;
      sideLeft.add([
        this.add.ellipse(0, 0, 40, 70, sideColor).setStrokeStyle(3, 0x294b31),
        this.add.ellipse(7, -2, 25, 54, 0x7c454c, 0.92).setStrokeStyle(2, 0x4b252d),
      ]);
      sideRight.add([
        this.add.ellipse(0, 0, 40, 70, sideColor).setStrokeStyle(3, 0x294b31),
        this.add.ellipse(-7, -2, 25, 54, 0x7c454c, 0.92).setStrokeStyle(2, 0x4b252d),
      ]);
      for (let tooth = -2; tooth <= 2; tooth += 1) {
        const toothY = tooth * 11;
        sideLeft.add(this.add.line(0, 0, 15, toothY, 28, toothY - tooth * 0.7, 0xc7d9a8, 0.95).setLineWidth(1.5));
        sideRight.add(this.add.line(0, 0, -15, toothY, -28, toothY - tooth * 0.7, 0xc7d9a8, 0.95).setLineWidth(1.5));
      }
      sideJaws.push(sideLeft, sideRight);
      jawPairs.push({
        leftJaw: sideLeft,
        rightJaw: sideRight,
        leftX: sideLeftX,
        rightX: sideRightX,
        y: sideY,
        leftRotation: -0.28,
        rightRotation: 0.28,
      });
    });
    trap.add([shadow, stem, ...sideJaws, leftJaw, rightJaw]);
    this.exitTraps.set(exitId, jawPairs);
    this.tweens.add({ targets: [leftLobe, rightLobe], scaleY: 1.025, yoyo: true, repeat: -1, duration: 1450 });
  }

  private snapExitTrap(exitId: ExitId): void {
    const jawPairs = this.exitTraps.get(exitId);
    if (!jawPairs) return;
    jawPairs.forEach((pair, index) => {
      this.tweens.killTweensOf([pair.leftJaw, pair.rightJaw]);
      pair.leftJaw.setPosition(pair.leftX, pair.y).setRotation(pair.leftRotation);
      pair.rightJaw.setPosition(pair.rightX, pair.y).setRotation(pair.rightRotation);
      const centerX = (pair.leftX + pair.rightX) / 2;
      this.tweens.add({
        targets: pair.leftJaw,
        x: centerX - 3,
        rotation: -0.02,
        duration: 90 + index * 18,
        hold: 120,
        yoyo: true,
        ease: "Cubic.easeIn",
      });
      this.tweens.add({
        targets: pair.rightJaw,
        x: centerX + 3,
        rotation: 0.02,
        duration: 90 + index * 18,
        hold: 120,
        yoyo: true,
        ease: "Cubic.easeIn",
      });
    });
  }

  private createCreatureGate(x: number, y: number, _label: string, rotation: number, _isExit: boolean): void {
    const flower = this.add.container(x, y).setRotation(rotation).setScale(0.42);
    const shadow = this.add.circle(0, 3, 44, 0x17313a, 0.25);
    flower.add(shadow);

    const petals: Phaser.GameObjects.Ellipse[] = [];
    for (let petal = 0; petal < 8; petal += 1) {
      const angle = (Math.PI * 2 * petal) / 8;
      const distance = petal % 2 === 0 ? 29 : 27;
      const shape = this.add.ellipse(
        Math.cos(angle) * distance,
        Math.sin(angle) * distance,
        25,
        petal % 2 === 0 ? 53 : 47,
        petal % 2 === 0 ? 0x86b7c6 : 0x729eaf,
        0.88,
      ).setRotation(angle + Math.PI / 2).setStrokeStyle(2, 0x456f80, 0.75);
      const vein = this.add.line(
        0,
        0,
        Math.cos(angle) * 13,
        Math.sin(angle) * 13,
        Math.cos(angle) * 47,
        Math.sin(angle) * 47,
        0xc2dce2,
        0.3,
      ).setLineWidth(1);
      petals.push(shape);
      flower.add([shape, vein]);
    }

    const rim = this.add.circle(0, 0, 29, 0x547f90, 0.96).setStrokeStyle(3, 0xa7ccd4, 0.75);
    const opening = this.add.circle(0, 0, 21, 0x102d39, 1).setStrokeStyle(2, 0x315d70, 0.9);
    const depth = this.add.circle(0, 0, 11, 0x071a23, 0.95);
    const redHalo = this.add.circle(0, 0, 13, 0xef3340, 0.2);
    const redCore = this.add.circle(0, 0, 9, 0xd52232, 1).setStrokeStyle(2, 0x6f111d, 1);
    const redHighlight = this.add.circle(-3, -3, 2.5, 0xff8b91, 0.85);
    flower.add([rim, opening, depth, redHalo, redCore, redHighlight]);

    this.tweens.add({ targets: petals, scaleY: 1.045, alpha: 0.76, yoyo: true, repeat: -1, duration: 1900 });
    this.tweens.add({ targets: depth, scale: 1.18, alpha: 0.65, yoyo: true, repeat: -1, duration: 1300 });
    this.tweens.add({ targets: redHalo, scale: 1.35, alpha: 0.06, yoyo: true, repeat: -1, duration: 1050 });
    this.tweens.add({ targets: [redCore, redHighlight], scale: 1.12, yoyo: true, repeat: -1, duration: 1050 });
  }

  private createHud(): void {
    this.add.text(WIDTH / 2, 5, "CHELIE", {
      fontFamily: "Arial",
      fontSize: "32px",
      color: "#f8fafc",
      fontStyle: "bold",
      stroke: "#17231d",
      strokeThickness: 5,
      letterSpacing: 7,
    }).setOrigin(0.5, 0);
    this.add.text(WIDTH / 2, 46, "CARNIVORE GARDEN", {
      fontFamily: "Arial",
      fontSize: "19px",
      color: "#f4fbfc",
      fontStyle: "bold",
      stroke: "#183640",
      strokeThickness: 4,
      letterSpacing: 3,
    }).setOrigin(0.5, 0);

    const statsY = HEIGHT - 240;
    this.levelText = this.createCompactHudBadge(120, statsY, 212, "BIOME", 0x315c54, "#d8f2ed");
    this.waveText = this.createCompactHudBadge(360, statsY, 212, "VAGUE 1", 0x58322e, "#f4d7c9");
    this.hpText = this.createCompactHudBadge(600, statsY, 212, "♥ 20/20", 0xb83f52, "#ffd4da");
    this.energyText = this.createCompactHudBadge(650, 24, 120, "◈ 60", 0xd7b84b, "#fff3b0", true);
    this.shearText = this.createCompactHudBadge(650, 76, 120, "💧 0", 0x5fd6e8, "#e9fdff", true);
    this.statusText = this.add.text(0, 0, "").setVisible(false);

    this.makeButton(76, HEIGHT - 50, 126, 64, "MENU", 0x315968, () => this.showGameMenu());
    this.startButton = this.makeButton(WIDTH / 2, HEIGHT - 50, 310, 64, "À L'ATTAQUE", 0x0f766e, () => this.startWave());
  }

  private showGameMenu(): void {
    if (this.menuOpen || !this.levelStarted) return;
    this.menuOpen = true;
    this.menuOpenedAt = this.time.now;
    this.closeTowerActions();
    this.setStartButtonEnabled(false);

    const menu = this.add.container(0, 0).setDepth(40);
    const veil = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x071a20, 0.78).setInteractive();
    const panel = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 560, 430, 0x164f59, 0.99)
      .setStrokeStyle(4, 0x8ddce6, 0.94);
    const title = this.add.text(WIDTH / 2, HEIGHT / 2 - 150, "MENU", {
      fontFamily: "Arial",
      fontSize: "36px",
      color: "#f4fbfc",
      fontStyle: "bold",
      stroke: "#173943",
      strokeThickness: 5,
      letterSpacing: 4,
    }).setOrigin(0.5);
    const resume = this.makeButton(WIDTH / 2, HEIGHT / 2 - 62, 330, 58, "REPRENDRE", 0x0f766e, () => this.closeGameMenu());
    const restart = this.makeButton(WIDTH / 2, HEIGHT / 2 + 18, 390, 58, "RECOMMENCER LA PARTIE", 0x6b4f25, () => {
      this.scene.restart({ levelIndex: this.levelIndex, infiniteNightmare: this.infiniteNightmare });
    });
    const home = this.makeButton(WIDTH / 2, HEIGHT / 2 + 98, 330, 58, "ACCUEIL", 0x315968, () => {
      this.goToHome();
    });
    menu.add([veil, panel, title, resume, restart, home]);
    this.menuOverlay = menu;
  }

  private closeGameMenu(): void {
    const pausedDuration = Math.max(0, this.time.now - this.menuOpenedAt);
    if (this.nextSpawnAt > 0) this.nextSpawnAt += pausedDuration;
    if (this.nextWaveAt > 0) this.nextWaveAt += pausedDuration;
    this.towers.forEach((tower) => {
      tower.lastShot += pausedDuration;
      if (tower.isUpgrading) tower.upgradeReadyAt += pausedDuration;
    });
    this.enemies.forEach((enemy) => {
      if (enemy.slowedUntil > 0) enemy.slowedUntil += pausedDuration;
    });
    this.menuOverlay?.destroy(true);
    this.menuOverlay = undefined;
    this.menuOpen = false;
    this.menuOpenedAt = 0;
    this.setStartButtonEnabled(this.levelStarted && !this.waveActive && this.baseHp > 0);
  }

  private goToHome(): void {
    this.requestedLevelIndex = null;
    this.scene.restart({ home: true });
  }

  private createCompactHudBadge(
    x: number,
    y: number,
    width: number,
    initialText: string,
    color: number,
    textColor: string,
    highlighted = false,
  ): Phaser.GameObjects.Text {
    if (!highlighted) {
      this.add.rectangle(x + 2, y + 3, width, 42, 0x071a20, 0.45).setDepth(2);
      this.add.rectangle(x, y, width, 42, 0x0b2630, 0.96)
        .setStrokeStyle(2, color, 0.98)
        .setDepth(3);
    }
    return this.add.text(x, y, initialText, {
      fontFamily: "Arial",
      fontSize: highlighted ? "26px" : "15px",
      color: textColor,
      fontStyle: "bold",
      stroke: "#07110d",
      strokeThickness: highlighted ? 4 : 2,
      shadow: highlighted ? {
        offsetX: 0,
        offsetY: 0,
        color: `#${color.toString(16).padStart(6, "0")}`,
        blur: 10,
        stroke: true,
        fill: true,
      } : undefined,
    }).setOrigin(0.5).setDepth(4);
  }

  private createHudBadge(
    x: number,
    y: number,
    icon: string,
    color: number,
    initialText: string,
    textColor: string,
  ): Phaser.GameObjects.Text {
    const shadow = this.add.circle(x + 2, y + 3, 30, 0x020706, 0.55);
    const badge = this.add.circle(x, y, 28, 0x0b2630, 0.96).setStrokeStyle(2, color, 0.95);
    const symbol = this.add.text(x, y, icon, {
      fontFamily: "Arial",
      fontSize: "27px",
      color: textColor,
      fontStyle: "bold",
    }).setOrigin(0.5);
    this.tweens.add({ targets: [badge, symbol], scale: 1.04, yoyo: true, repeat: -1, duration: 1900 + x });
    shadow.setDepth(1);
    badge.setDepth(2);
    symbol.setDepth(3);
    return this.add.text(x, y + 43, initialText, {
      fontFamily: "Arial",
      fontSize: "18px",
      color: textColor,
      fontStyle: "bold",
      letterSpacing: 0.8,
      stroke: "#07110d",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(3);
  }

  private showLevelSelection(): void {
    const unlocked = this.getUnlockedLevel();
    const overlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x164f59, 0.94)
      .setDepth(30)
      .setInteractive();
    const panel = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 660, 1010, 0x326f77, 0.98)
      .setStrokeStyle(3, 0xb9d8df, 0.85)
      .setDepth(31);
    const glow = this.add.ellipse(WIDTH / 2, 215, 560, 190, 0x71c4c1, 0.16).setDepth(31);
    this.add.circle(92, 188, 50, 0x91d5c3, 0.12).setDepth(31);
    this.add.circle(630, 1070, 72, 0x173f47, 0.22).setDepth(31);
    this.add.text(WIDTH / 2, 164, "CHOISISSEZ VOTRE", {
      fontFamily: "Arial",
      fontSize: "20px",
      color: "#efffff",
      fontStyle: "bold",
      letterSpacing: 4,
      stroke: "#173943",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(32);
    this.add.text(WIDTH / 2, 206, "TOURBIÈRE", {
      fontFamily: "Arial",
      fontSize: "44px",
      color: "#f8fafc",
      fontStyle: "bold",
      stroke: "#173943",
      strokeThickness: 5,
      letterSpacing: 5,
    }).setOrigin(0.5).setDepth(32);
    this.add.text(WIDTH / 2, 252, "Chaque biome renforce la menace", {
      fontFamily: "Arial",
      fontSize: "19px",
      color: "#f0fbfa",
      fontStyle: "bold",
      stroke: "#173943",
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(32);

    const firstPage = this.makeButton(270, 294, 168, 36, "MONDES 1–6", this.selectionPage === 0 ? 0x4d8f82 : 0x294f58, () => {
      this.scene.restart({ home: true, selectionPage: 0 });
    }).setDepth(32);
    const secondPage = this.makeButton(450, 294, 168, 36, "MONDES 7–12", this.selectionPage === 1 ? 0x4d8f82 : 0x294f58, () => {
      this.scene.restart({ home: true, selectionPage: 1 });
    }).setDepth(32);
    if (unlocked < 6) secondPage.setAlpha(0.62);

    const biomeColors = [0x4f8068, 0x477f78, 0x9a555d, 0x475965, 0x6d7849, 0x527060, 0x3f7172, 0x54645f, 0x775361, 0x594c68, 0x4b6051, 0x596337];
    const biomeAccents = [0xa8d5a2, 0x91d4c8, 0xf1a3a9, 0x9eb9c6, 0xc5d58b, 0x9cc8ae, 0x85d4d0, 0xa7c6b7, 0xd6a1b4, 0xb9a4d4, 0x9dc5a7, 0xe0d27d];
    const biomeIcons = ["✦", "⌁", "✹", "◆", "♣", "✧", "≋", "⬟", "✣", "◇", "♠", "∞"];
    const pageStart = this.selectionPage * 6;

    LEVELS.slice(pageStart, pageStart + 6).forEach((level, localIndex) => {
      const index = pageStart + localIndex;
      const col = localIndex % 2;
      const row = Math.floor(localIndex / 2);
      const x = 225 + col * 270;
      const y = 398 + row * 210;
      const isFinalInfinite = index === LEVELS.length - 1;
      const hostsFirstInfinite = index === 5 && unlocked >= 6;
      const available = index <= unlocked;
      const waveLabel = level.waves === null ? "VAGUES INFINIES" : "MENACE CROISSANTE";
      const card = this.add.container(x, y).setDepth(32);
      const background = this.add.graphics();
      background.fillStyle(available ? biomeColors[index] : 0x29464b, available ? 1 : 0.76);
      background.fillRoundedRect(-116, -76, 232, 152, 18);
      background.lineStyle(available ? 3 : 2, available ? biomeAccents[index] : 0x557176, available ? 0.92 : 0.6);
      background.strokeRoundedRect(-116, -76, 232, 152, 18);
      const iconHalo = this.add.circle(0, -39, 29, available ? biomeAccents[index] : 0x496469, available ? 0.24 : 0.16);
      const icon = this.add.text(0, -40, available ? biomeIcons[index] : "×", {
        fontFamily: "Arial",
        fontSize: "29px",
        color: available ? "#f7fbf5" : "#769095",
        fontStyle: "bold",
      }).setOrigin(0.5);
      const code = this.add.text(0, -6, available ? level.code : "VERROUILLÉ", {
        fontFamily: "Arial",
        fontSize: "15px",
        color: available ? "#f2fffb" : "#91aaaf",
        fontStyle: "bold",
        letterSpacing: 2,
        stroke: "#203a35",
        strokeThickness: 2,
      }).setOrigin(0.5);
      const name = this.add.text(0, 22, level.name.toUpperCase(), {
        fontFamily: "Arial",
        fontSize: "20px",
        color: available ? "#ffffff" : "#71888d",
        fontStyle: "bold",
        stroke: available ? "#203a35" : "#253b40",
        strokeThickness: 3,
      }).setOrigin(0.5);
      const threat = this.add.text(0, 53, available ? waveLabel : level.code, {
        fontFamily: "Arial",
        fontSize: "13px",
        color: available ? "#f0fbf5" : "#789399",
        fontStyle: "bold",
        letterSpacing: 1,
        stroke: "#203a35",
        strokeThickness: 2,
      }).setOrigin(0.5);
      card.add([background, iconHalo, icon, code, name, threat]);
      if (available) {
        card.setSize(232, 152).setInteractive({ useHandCursor: true });
        card.on("pointerover", () => card.setScale(1.035));
        card.on("pointerout", () => card.setScale(1));
        card.on("pointerdown", () => this.scene.restart({ levelIndex: index }));
        if (hostsFirstInfinite) {
          const firstInfinite = this.add.text(0, 55, "INFINI ÉVOLUTIF", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#e8feff",
            backgroundColor: "#155e75",
            padding: { x: 11, y: 5 },
            fontStyle: "bold",
            stroke: "#0b3542",
            strokeThickness: 2,
          }).setOrigin(0.5).setInteractive({ useHandCursor: true });
          firstInfinite.on("pointerdown", (
            _pointer: Phaser.Input.Pointer,
            _localX: number,
            _localY: number,
            event: Phaser.Types.Input.EventData,
          ) => {
            event.stopPropagation();
            this.scene.restart({ levelIndex: LEVELS.length - 1 });
          });
          threat.setY(35).setText("MODE CLASSIQUE");
          card.add(firstInfinite);
        }
        if (isFinalInfinite && unlocked >= 11) {
          const nightmare = this.add.text(0, 55, "INFINI CAUCHEMAR", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#ffe4e6",
            backgroundColor: "#7f1d2d",
            padding: { x: 11, y: 5 },
            fontStyle: "bold",
            stroke: "#3f0c16",
            strokeThickness: 2,
          }).setOrigin(0.5).setInteractive({ useHandCursor: true });
          nightmare.on("pointerdown", (
            _pointer: Phaser.Input.Pointer,
            _localX: number,
            _localY: number,
            event: Phaser.Types.Input.EventData,
          ) => {
            event.stopPropagation();
            this.scene.restart({ levelIndex: index, infiniteNightmare: true });
          });
          threat.setY(35).setText("INFINI NORMAL");
          card.add(nightmare);
        }
      }
    });

    this.add.text(WIDTH / 2, 958, `SERRE PERMANENTE  ·  ${this.wateringCans} ARROSOIR${this.wateringCans > 1 ? "S" : ""}`, {
      fontFamily: "Arial",
      fontSize: "21px",
      color: "#effdfb",
      fontStyle: "bold",
      stroke: "#173943",
      strokeThickness: 3,
      letterSpacing: 1.2,
    }).setOrigin(0.5).setDepth(32);
    this.add.text(WIDTH / 2, 986, "Touchez une plante pour l'arroser durablement", {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#efffff",
      fontStyle: "bold",
      stroke: "#173943",
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(32);

    const masteryKinds = Object.keys(TOWERS) as TowerKind[];
    masteryKinds.forEach((kind, index) => {
      const mastery = this.plantMastery[kind];
      const cost = mastery < MASTERY_COSTS.length ? MASTERY_COSTS[mastery] : null;
      const x = 90 + index * 180;
      const button = this.add.container(x, 1040).setDepth(32);
      const bg = this.add.circle(0, 0, 45, 0x173f47, 0.98)
        .setStrokeStyle(3, mastery >= MASTERY_COSTS.length ? 0xf0d77a : 0x8ddce6, 0.95);
      const plant = this.createPlantVisual(kind, TOWERS[kind].color).setScale(0.78).setPosition(0, -3);
      const costText = this.add.text(0, 55, cost === null ? "MAX" : `💧 ${cost}`, {
        fontFamily: "Arial",
        fontSize: "18px",
        color: cost === null ? "#ffe89a" : this.wateringCans >= cost ? "#e6fbff" : "#86aeb3",
        fontStyle: "bold",
        stroke: "#173943",
        strokeThickness: 2,
      }).setOrigin(0.5);
      button.add([bg, plant, costText]);
      for (let dot = 0; dot < MASTERY_COSTS.length; dot += 1) {
        button.add(this.add.circle(-24 + dot * 12, 36, 4, dot < mastery ? 0xf0d77a : 0x557d82, 1));
      }
      button.setSize(105, 130).setInteractive({ useHandCursor: true });
      button.on("pointerover", () => bg.setScale(1.07));
      button.on("pointerout", () => bg.setScale(1));
      button.on("pointerdown", () => this.upgradePlantMastery(kind));
    });

    this.makeButton(WIDTH / 2, 1124, 290, 36, "GUIDE DES ARROSOIRS", 0x245d68, () => {
      this.showWateringGuide();
    }).setDepth(33);

    overlay.on("pointerdown", () => undefined);
    panel.setInteractive().on("pointerdown", () => undefined);
    this.tweens.add({ targets: glow, alpha: 0.08, scale: 1.08, yoyo: true, repeat: -1, duration: 2400 });
  }

  private showWateringGuide(): void {
    const guide = this.add.container(0, 0).setDepth(50);
    const veil = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x071a20, 0.9).setInteractive();
    const panel = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 640, 1040, 0x245d68, 0.995)
      .setStrokeStyle(4, 0x8ddce6, 0.96);
    const title = this.add.text(WIDTH / 2, 155, "GUIDE DES ARROSOIRS", {
      fontFamily: "Arial",
      fontSize: "30px",
      color: "#effdff",
      fontStyle: "bold",
      stroke: "#12353d",
      strokeThickness: 5,
      letterSpacing: 2,
    }).setOrigin(0.5);
    const balance = this.add.text(WIDTH / 2, 205, `VOTRE RÉSERVE  💧 ${this.wateringCans}`, {
      fontFamily: "Arial",
      fontSize: "20px",
      color: "#bff5fb",
      fontStyle: "bold",
      stroke: "#12353d",
      strokeThickness: 3,
    }).setOrigin(0.5);
    const explanation = this.add.text(WIDTH / 2, 275,
      "Les arrosoirs améliorent définitivement une famille de plantes.\nLe bonus reste actif dans tous les mondes et toutes les parties.", {
        fontFamily: "Arial",
        fontSize: "17px",
        color: "#edf8f7",
        fontStyle: "bold",
        align: "center",
        lineSpacing: 9,
        wordWrap: { width: 550 },
      }).setOrigin(0.5);
    const rewards = this.add.text(86, 350,
      "COMMENT EN GAGNER\n\n• Mondes classiques : 1 après chaque vague\n• Mode infini : 1 toutes les 5 vagues\n• Les arrosoirs sont conservés après une défaite", {
        fontFamily: "Arial",
        fontSize: "17px",
        color: "#d9f4f2",
        fontStyle: "bold",
        lineSpacing: 8,
      });
    const levelsTitle = this.add.text(WIDTH / 2, 515, "NIVEAUX PERMANENTS", {
      fontFamily: "Arial",
      fontSize: "21px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#12353d",
      strokeThickness: 3,
      letterSpacing: 1,
    }).setOrigin(0.5);

    const rows: Phaser.GameObjects.GameObject[] = [];
    MASTERY_COSTS.forEach((cost, index) => {
      const level = index + 1;
      const y = 570 + index * 65;
      const rowBg = this.add.rectangle(WIDTH / 2, y, 540, 50, index % 2 === 0 ? 0x184b55 : 0x1d535c, 0.95)
        .setStrokeStyle(1, 0x70bec6, 0.45);
      const rowText = this.add.text(WIDTH / 2, y,
        `NIVEAU ${level}   💧 ${cost}   ·   +${level * 12}% dégâts   +${level * 6} portée   −${level * 4}% délai`, {
          fontFamily: "Arial",
          fontSize: "15px",
          color: "#effdff",
          fontStyle: "bold",
        }).setOrigin(0.5);
      rows.push(rowBg, rowText);
    });
    const total = this.add.text(WIDTH / 2, 915,
      "1 500 gouttes pour maximiser une plante · 6 000 pour les quatre", {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#ffe7a3",
        fontStyle: "bold",
        stroke: "#3d3520",
        strokeThickness: 2,
      }).setOrigin(0.5);
    const distinction = this.add.text(WIDTH / 2, 965,
      "Les pièces améliorent seulement les plantes de la partie en cours.", {
        fontFamily: "Arial",
        fontSize: "15px",
        color: "#cfe9e7",
        fontStyle: "bold",
      }).setOrigin(0.5);
    const close = this.makeButton(WIDTH / 2, 1050, 240, 54, "FERMER", 0x0f766e, () => guide.destroy(true));
    guide.add([veil, panel, title, balance, explanation, rewards, levelsTitle, ...rows, total, distinction, close]);
  }

  private beginLevel(index: number): void {
    this.levelIndex = Phaser.Math.Clamp(index, 0, LEVELS.length - 1);
    this.levelStarted = true;
    this.levelText.setText(this.infiniteNightmare ? "INFINI CAUCHEMAR" : LEVELS[this.levelIndex].name.toUpperCase());
    this.setStartButtonEnabled(true);
    this.nextWaveAt = 0;
    this.updateHud("");
  }

  private getActiveLevel(): LevelDefinition {
    const level = LEVELS[this.levelIndex];
    if (this.levelIndex !== LEVELS.length - 1) return level;
    const bestWorld = Phaser.Math.Clamp(this.getUnlockedLevel(), 6, LEVELS.length - 2);
    const reference = LEVELS[bestWorld];
    const nightmareMultiplier = this.infiniteNightmare ? 1.55 : 1.08;
    return {
      ...level,
      healthMultiplier: reference.healthMultiplier * nightmareMultiplier,
      speedMultiplier: reference.speedMultiplier * (this.infiniteNightmare ? 1.16 : 1.04),
      swarmBonus: reference.swarmBonus + (this.infiniteNightmare ? 9 : 3),
    };
  }

  private completeLevel(): void {
    this.levelStarted = false;
    this.nextWaveAt = 0;
    this.setStartButtonEnabled(false);
    const nextIndex = Math.min(this.levelIndex + 1, LEVELS.length - 1);
    this.saveUnlockedLevel(nextIndex);

    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x02040a, 0.84).setDepth(30).setInteractive();
    this.add.text(WIDTH / 2, HEIGHT / 2 - 100, "BIOME PROTÉGÉ", {
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
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(31);

    const nextLabel = this.levelIndex === LEVELS.length - 2 ? "DÉBLOQUER LA FLORAISON INFINIE" : "BIOME SUIVANT";
    this.makeButton(WIDTH / 2, HEIGHT / 2 + 35, 280, 52, nextLabel, 0x166534, () => {
      this.scene.restart({ levelIndex: nextIndex });
    }).setDepth(31);
    this.makeButton(WIDTH / 2, HEIGHT / 2 + 105, 220, 44, "CHOIX DU BIOME", 0x334155, () => {
      this.goToHome();
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

  private loadPermanentProgress(): void {
    try {
      this.wateringCans = Math.max(0, Number(localStorage.getItem("chelie-watering-cans") ?? 0));
      const stored = JSON.parse(localStorage.getItem("chelie-plant-mastery") ?? "{}") as Partial<Record<TowerKind, number>>;
      (Object.keys(TOWERS) as TowerKind[]).forEach((kind) => {
        this.plantMastery[kind] = Phaser.Math.Clamp(Number(stored[kind] ?? 0), 0, MASTERY_COSTS.length);
      });
    } catch {
      this.wateringCans = 0;
      this.plantMastery = { harpoon: 0, flak: 0, pulse: 0, cryo: 0 };
    }
  }

  private savePermanentProgress(): void {
    try {
      localStorage.setItem("chelie-watering-cans", String(this.wateringCans));
      localStorage.setItem("chelie-plant-mastery", JSON.stringify(this.plantMastery));
    } catch {
      // La progression reste disponible pour la session si le stockage est désactivé.
    }
  }

  private upgradePlantMastery(kind: TowerKind): void {
    const mastery = this.plantMastery[kind];
    if (mastery >= MASTERY_COSTS.length) return;
    const cost = MASTERY_COSTS[mastery];
    if (this.wateringCans < cost) {
      this.cameras.main.shake(110, 0.0015);
      return;
    }
    this.wateringCans -= cost;
    this.plantMastery[kind] += 1;
    this.savePermanentProgress();
    this.goToHome();
  }

  private createTowerPalette(): void {
    const dockY = HEIGHT - 138;
    const kinds = Object.keys(TOWERS) as TowerKind[];
    const positions = [90, 270, 450, 630];
    kinds.forEach((kind, index) => {
      this.createTowerPaletteButton(kind, positions[index], dockY);
    });
  }

  private createTowerPaletteButton(kind: TowerKind, x: number, y: number): Phaser.GameObjects.Container {
      const definition = TOWERS[kind];
      const available = this.levelIndex >= definition.unlockLevel;
      const button = this.add.container(x, y);
      const bg = this.add.circle(0, 0, 41, 0x052e2b, 0.98)
        .setStrokeStyle(2, available && kind === this.selectedTower ? definition.color : 0x28665e, 1);
      const plantPreview = this.createPlantVisual(kind, definition.color)
        .setPosition(0, 3)
        .setScale(0.88)
        .setAlpha(available ? 1 : 0.25);
      const title = this.add.text(0, -51, definition.name.toUpperCase(), {
        fontFamily: "Arial",
        fontSize: "18px",
        color: available ? "#f8fafc" : "#64748b",
        fontStyle: "bold",
        stroke: "#08100c",
        strokeThickness: 2,
      }).setOrigin(0.5);
      const targetLabel = definition.target === "sea" ? "SOL" : definition.target === "air" ? "AIR" : "TOUS";
      const detail = available ? `${definition.cost} ◈ · ${targetLabel}` : LEVELS[definition.unlockLevel].code;
      const target = this.add.text(0, 43, detail, {
        fontFamily: "Arial",
        fontSize: "17px",
        color: available ? "#cbd5e1" : "#8190a5",
        fontStyle: "bold",
        stroke: "#08100c",
        strokeThickness: 2,
      }).setOrigin(0.5);
      button.add([bg, plantPreview, title, target]);
      button.setSize(100, 104).setInteractive({ useHandCursor: true });
      button.on("pointerover", () => bg.setScale(1.08));
      button.on("pointerout", () => bg.setScale(1));
      button.on("pointerdown", () => this.selectTower(kind));
      const buttons = this.towerButtons.get(kind) ?? [];
      buttons.push(button);
      this.towerButtons.set(kind, buttons);
      return button;
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
    this.closeTowerActions();
    this.towerButtons.forEach((buttons, buttonKind) => {
      buttons.forEach((button) => {
        const bg = button.getAt(0) as Phaser.GameObjects.Arc;
        bg.setStrokeStyle(2, buttonKind === kind ? TOWERS[buttonKind].color : 0x28665e, 1);
      });
    });
    this.updateHud(`${TOWERS[kind].name} sélectionnée — améliorations : ${UPGRADE_COSTS.slice(1).join(" / ")} pièces`);
  }

  private placeTower(x: number, y: number): void {
    this.closeTowerActions();
    if (this.selectedTower === null) {
      this.updateHud("Sélectionnez une plante dans l'herbier avant de la poser");
      return;
    }
    const selectedKind = this.selectedTower;
    const definition = TOWERS[selectedKind];
    const mapSpanX = (GRID_COLS - 1) * CELL;
    const mapSpanY = (GRID_ROWS - 1) * CELL;
    const placementHalfCol = Phaser.Math.Clamp(
      Math.round((x - GRID_X) / PLANT_HALF_STEP),
      0,
      Math.floor(mapSpanX / PLANT_HALF_STEP),
    );
    const placementRow = Phaser.Math.Clamp(
      Math.round((y - GRID_Y) / PLANT_FRAME_SIZE),
      0,
      Math.floor(mapSpanY / PLANT_FRAME_SIZE),
    );
    const towerX = GRID_X + placementHalfCol * PLANT_HALF_STEP;
    const towerY = GRID_Y + placementRow * PLANT_FRAME_SIZE;
    const col = Phaser.Math.Clamp(Math.round((towerX - GRID_X) / CELL), 0, GRID_COLS - 1);
    const row = Phaser.Math.Clamp(Math.round((towerY - GRID_Y) / CELL), 0, GRID_ROWS - 1);

    if (this.towers.some((tower) =>
      Math.abs(tower.body.x - towerX) < PLANT_FRAME_SIZE - 1
      && Math.abs(tower.body.y - towerY) < PLANT_FRAME_SIZE - 1,
    )) {
      this.updateHud("Cet emplacement est déjà occupé");
      return;
    }
    if (this.enemies.some((enemy) => Phaser.Math.Distance.Between(enemy.body.x, enemy.body.y, towerX, towerY) < PLANT_FRAME_SIZE * 0.68)) {
      this.updateHud("Un insecte traverse cette zone — attendez qu'il soit passé");
      return;
    }
    if (this.energy < definition.cost) {
      this.updateHud(`${definition.name} coûte ${definition.cost} pièces — solde insuffisant`);
      return;
    }
    const atLeastOneRouteOpen = this.getRouteOptions().some((route) =>
      this.calculatePath(route.entry, route.destination, { col, row }) !== null,
    );
    if (!atLeastOneRouteOpen) {
      this.updateHud("Cette plante fermerait toutes les issues aux insectes");
      this.cameras.main.shake(120, 0.002);
      return;
    }

    this.energy -= definition.cost;
    const towerBody = this.add.container(towerX, towerY);

    const base = this.add.rectangle(0, 0, PLANT_FRAME_SIZE, PLANT_FRAME_SIZE, TEMP_LEVEL_COLORS[0])
      .setStrokeStyle(3, 0x4d7c0f, 0.95);
    const initialPlantScale = selectedKind === "flak" ? 0.62 : 0.72;
    const plant = this.createPlantVisual(selectedKind, definition.color).setPosition(0, 1).setScale(initialPlantScale);
    const levelBadge = this.add.text(10, 10, "", {
      fontFamily: "Arial",
      fontSize: "10px",
      color: "#ffffff",
      backgroundColor: "#173f49",
      padding: { x: 3, y: 2 },
      fontStyle: "bold",
      stroke: "#071a20",
      strokeThickness: 2,
    }).setOrigin(0.5).setVisible(false);
    towerBody.add([base, plant, levelBadge]);

    const tower: Tower = {
      body: towerBody,
      kind: selectedKind,
      range: definition.range + this.plantMastery[selectedKind] * 6,
      damage: Math.round(definition.damage * (1 + this.plantMastery[selectedKind] * 0.12)),
      fireDelay: Math.max(260, Math.round(definition.fireDelay * (1 - this.plantMastery[selectedKind] * 0.04))),
      lastShot: 0,
      col,
      row,
      level: 1,
      levelBadge,
      investedCost: definition.cost,
      priority: "first",
      isUpgrading: false,
      upgradeReadyAt: 0,
    };
    towerBody.setSize(PLANT_FRAME_SIZE, PLANT_FRAME_SIZE).setInteractive({ useHandCursor: true });
    towerBody.on("pointerdown", (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
      this.showTowerActions(tower);
    });
    this.towers.push(tower);
    this.recalculateEnemyPaths();
    this.selectedTower = null;
    this.towerButtons.forEach((buttons) => {
      buttons.forEach((button) => {
        const bg = button.getAt(0) as Phaser.GameObjects.Arc;
        bg.setStrokeStyle(2, 0x28665e, 1);
      });
    });
    this.updateHud(`${definition.name} posée — sélection annulée pour éviter une pose accidentelle`);
  }

  private createPlantVisual(kind: TowerKind, color: number): Phaser.GameObjects.Container {
    const plant = this.add.container(0, -4);
    const stem = this.add.rectangle(0, 8, 7, 30, 0x4d7c0f).setRounded(4);
    const leafLeft = this.add.ellipse(-10, 13, 22, 9, 0x65a30d).setRotation(-0.45);
    const leafRight = this.add.ellipse(10, 13, 22, 9, 0x65a30d).setRotation(0.45);
    plant.add([stem, leafLeft, leafRight]);

    if (kind === "harpoon") {
      plant.add([
        this.add.ellipse(-7, -8, 25, 15, color).setRotation(0.5).setStrokeStyle(2, 0x166534),
        this.add.ellipse(7, -8, 25, 15, color).setRotation(-0.5).setStrokeStyle(2, 0x166534),
        this.add.circle(0, -8, 5, 0x9f1239),
      ]);
    } else if (kind === "flak") {
      const rearTrumpet = this.add.ellipse(-10, -2, 16, 37, 0xd9e2d1, 0.98)
        .setRotation(-0.18)
        .setStrokeStyle(2, 0x8fa68b);
      const rearMouth = this.add.ellipse(-13, -21, 21, 9, 0xf4f1df)
        .setRotation(-0.18)
        .setStrokeStyle(2, 0x8e3942);
      const mainTrumpet = this.add.ellipse(5, -6, 21, 48, 0xf1efdf, 1)
        .setRotation(0.08)
        .setStrokeStyle(2, 0x91a78e);
      const mainMouth = this.add.ellipse(7, -31, 28, 11, 0xfffbea)
        .setRotation(0.08)
        .setStrokeStyle(3, 0x943943);
      const hood = this.add.ellipse(10, -36, 29, 15, 0xe8ead8, 1)
        .setRotation(-0.2)
        .setStrokeStyle(2, 0x8e3942);
      plant.add([rearTrumpet, rearMouth, mainTrumpet, mainMouth, hood]);
      [
        [-1, 15, 4, -27],
        [5, 16, 8, -27],
        [10, 12, 11, -26],
        [-14, 13, -13, -17],
      ].forEach(([x1, y1, x2, y2]) => {
        plant.add(this.add.line(0, 0, x1, y1, x2, y2, 0xa84650, 0.72).setLineWidth(1.2));
      });
      plant.add(this.add.ellipse(7, -31, 15, 5, 0x6f1f2a, 0.88).setRotation(0.08));
    } else if (kind === "cryo") {
      plant.add([
        this.add.ellipse(0, -5, 19, 34, color, 0.95).setStrokeStyle(2, 0x14532d),
        this.add.ellipse(0, -20, 23, 8, 0xa5f3fc).setStrokeStyle(2, 0x14532d),
      ]);
    } else if (kind === "pulse") {
      for (let angle = 0; angle < 360; angle += 45) {
        const rad = Phaser.Math.DegToRad(angle);
        plant.add(this.add.circle(Math.cos(rad) * 14, -7 + Math.sin(rad) * 14, 4, color).setStrokeStyle(1, 0xfbcfe8));
      }
      plant.add(this.add.circle(0, -7, 9, 0xbe185d));
    } else if (kind === "tesla") {
      for (let angle = 0; angle < 360; angle += 60) {
        const rad = Phaser.Math.DegToRad(angle);
        plant.add(this.add.ellipse(Math.cos(rad) * 10, -8 + Math.sin(rad) * 10, 9, 21, color).setRotation(rad));
      }
      plant.add(this.add.circle(0, -8, 8, 0xffffff, 0.9));
    } else if (kind === "railgun") {
      plant.add([
        this.add.triangle(0, -12, -11, 12, 0, -24, 11, 12, color).setStrokeStyle(2, 0x365314),
        this.add.triangle(-12, 0, -8, 7, -20, 1, -8, -4, 0x84cc16),
        this.add.triangle(12, 0, 8, 7, 20, 1, 8, -4, 0x84cc16),
      ]);
    } else {
      for (let angle = 0; angle < 360; angle += 72) {
        const rad = Phaser.Math.DegToRad(angle);
        plant.add(this.add.ellipse(Math.cos(rad) * 12, -7 + Math.sin(rad) * 12, 20, 30, color).setRotation(rad + Math.PI / 2).setStrokeStyle(2, 0x7f1d1d));
      }
      plant.add(this.add.circle(0, -7, 10, 0x713f12).setStrokeStyle(2, 0xfbbf24));
    }
    return plant;
  }

  private getTowerName(tower: Tower): string {
    const stage = tower.level >= 5 ? 2 : tower.level >= 3 ? 1 : 0;
    return TOWER_EVOLUTIONS[tower.kind][stage];
  }

  private evolveTowerVisual(tower: Tower): void {
    const plant = tower.body.getAt(1) as Phaser.GameObjects.Container;
    const color = TOWERS[tower.kind].color;
    if (tower.level === 3) {
      plant.add([
        this.add.ellipse(-18, 5, 18, 8, 0x3f6212, 0.95).setRotation(-0.5),
        this.add.ellipse(18, 5, 18, 8, 0x3f6212, 0.95).setRotation(0.5),
        this.add.circle(0, -8, 22, color, 0.12).setStrokeStyle(2, color, 0.72),
      ]);
    }
    if (tower.level === 5) {
      for (let angle = 0; angle < 360; angle += 60) {
        const rad = Phaser.Math.DegToRad(angle);
        plant.add(this.add.triangle(
          Math.cos(rad) * 25,
          -8 + Math.sin(rad) * 25,
          -4, 5, 0, -9, 4, 5,
          color,
          0.95,
        ).setRotation(rad + Math.PI / 2));
      }
      plant.add(this.add.circle(0, -8, 28, color, 0.08).setStrokeStyle(3, 0xf4d35e, 0.85));
    }
  }

  private startWave(): void {
    if (!this.levelStarted || this.waveActive || this.baseHp <= 0) return;
    const level = this.getActiveLevel();
    if (level.waves !== null && this.wave >= level.waves) return;
    this.wave += 1;
    this.selectWaveRoute();
    this.enemiesToSpawn = 6 + this.wave * 3 + level.swarmBonus;
    this.spawnedThisWave = 0;
    this.waveActive = true;
    this.nextSpawnAt = 0;
    this.nextWaveAt = 0;
    this.setStartButtonEnabled(false);
    const origin = this.isTopWave() ? "NORD" : "OUEST";
    this.updateHud(this.isBossWave()
      ? `ALERTE ${origin} — insecte alpha détecté`
      : `Vague ${this.wave} en approche par le ${origin}`);
  }

  private scheduleNextWave(delay: number): void {
    this.nextWaveAt = this.time.now + delay;
    this.updateAutoWave(this.time.now);
  }

  private updateAutoWave(time: number): void {
    if (this.waveActive || this.nextWaveAt <= 0 || !this.levelStarted) return;
    if (time >= this.nextWaveAt) {
      this.startWave();
    }
  }

  private spawnWaveEnemies(time: number): void {
    if (!this.waveActive || this.spawnedThisWave >= this.enemiesToSpawn || time < this.nextSpawnAt) return;

    const profile = this.getWaveProfile();
    let kind: EnemyKind;
    if (profile === 0) kind = this.spawnedThisWave % 5 === 4 ? "air" : "sea";
    else if (profile === 1) kind = this.spawnedThisWave % 5 === 4 ? "sea" : "air";
    else kind = (this.spawnedThisWave + this.wave) % 2 === 0 ? "air" : "sea";

    const isBoss = this.isBossWave() && this.spawnedThisWave === 0;
    this.spawnEnemy(kind, isBoss);
    this.spawnedThisWave += 1;
    const profileSpeed = profile === 3 ? 0.62 : profile === 1 ? 0.82 : 1;
    this.nextSpawnAt = time + Math.max(260, (1050 - this.wave * 50 - this.levelIndex * 40) * profileSpeed);
  }

  private spawnEnemy(kind: EnemyKind, isBoss = false): void {
    const trait = this.getEnemyTrait(isBoss);
    const color = isBoss ? 0x6f211d
      : trait === "armored" ? 0x3c4140
        : trait === "swift" ? 0x6b5839
          : trait === "regenerator" ? 0x485c3d
            : kind === "air" ? 0x625747 : 0x3f5d59;
    const entryRow = this.isTopWave() ? TOP_ENTRY_ROW : BOTTOM_ENTRY_ROW;
    const entryCol = this.isTopWave() ? TOP_ENTRY_COL : BOTTOM_ENTRY_COL;
    const exitRow = this.waveExitId === "right" ? TOP_EXIT_ROW : BOTTOM_EXIT_ROW;
    const exitCol = this.waveExitId === "right" ? TOP_EXIT_COL : BOTTOM_EXIT_COL;
    const exitId: ExitId = this.waveExitId;
    const spawnX = this.isTopWave()
      ? this.gridToWorldX(TOP_ENTRY_COL, TOP_ENTRY_ROW)
      : this.gridToWorldX(BOTTOM_ENTRY_COL, BOTTOM_ENTRY_ROW);
    const spawnY = this.isTopWave() ? this.gridToWorldY(TOP_ENTRY_ROW) : this.gridToWorldY(BOTTOM_ENTRY_ROW);
    const exitX = this.waveExitId === "right"
      ? this.gridToWorldX(TOP_EXIT_COL, TOP_EXIT_ROW)
      : this.gridToWorldX(BOTTOM_EXIT_COL, BOTTOM_EXIT_ROW);
    const exitY = this.waveExitId === "right" ? this.gridToWorldY(TOP_EXIT_ROW) : this.gridToWorldY(BOTTOM_EXIT_ROW);
    const container = this.add.container(spawnX, spawnY);
    const scale = isBoss ? 1.15 : 0.72;
    const shadow = this.add.ellipse(0, 17, 58 * scale, 12 * scale, 0x010403, 0.62);
    const insectParts: Phaser.GameObjects.GameObject[] = [shadow];
    if (kind === "air") {
      const leftWing = this.add.triangle(-15 * scale, -3 * scale, -3, 7, -31, -2, -8, -19, 0x8a9487, 0.28)
        .setStrokeStyle(1, 0x303832, 0.7);
      const rightWing = this.add.triangle(15 * scale, -3 * scale, 3, 7, 31, -2, 8, -19, 0x8a9487, 0.28)
        .setStrokeStyle(1, 0x303832, 0.7);
      const abdomen = this.add.ellipse(0, 5 * scale, 14 * scale, 39 * scale, color).setStrokeStyle(2, 0x171612, 0.95);
      const abdomenRidge = this.add.rectangle(0, 7 * scale, 3 * scale, 31 * scale, 0x171612, 0.8);
      const thorax = this.add.ellipse(0, -10 * scale, 18 * scale, 20 * scale, 0x26251f).setStrokeStyle(2, 0x11110e);
      const head = this.add.triangle(0, -23 * scale, -8, 7, 0, -8, 8, 7, 0x171713);
      const leftAntenna = this.add.line(0, 0, -4 * scale, -27 * scale, -13 * scale, -36 * scale, 0x12130f).setLineWidth(2);
      const rightAntenna = this.add.line(0, 0, 4 * scale, -27 * scale, 13 * scale, -36 * scale, 0x12130f).setLineWidth(2);
      const leftVein = this.add.line(0, 0, -7 * scale, -6 * scale, -28 * scale, -4 * scale, 0x303832, 0.55).setLineWidth(1);
      const rightVein = this.add.line(0, 0, 7 * scale, -6 * scale, 28 * scale, -4 * scale, 0x303832, 0.55).setLineWidth(1);
      insectParts.push(leftWing, rightWing, leftVein, rightVein, abdomen, abdomenRidge, thorax, head, leftAntenna, rightAntenna);
      this.tweens.add({ targets: leftWing, angle: -7, yoyo: true, repeat: -1, duration: 85 });
      this.tweens.add({ targets: rightWing, angle: 7, yoyo: true, repeat: -1, duration: 85 });
    } else {
      for (let leg = -2; leg <= 2; leg += 1) {
        const offsetY = leg * 6 * scale;
        insectParts.push(this.add.line(0, 0, -12 * scale, offsetY, -31 * scale, offsetY + leg * 3, 0x11120f, 0.95).setLineWidth(3));
        insectParts.push(this.add.line(0, 0, 12 * scale, offsetY, 31 * scale, offsetY + leg * 3, 0x11120f, 0.95).setLineWidth(3));
      }
      const abdomen = this.add.ellipse(-7 * scale, 0, 39 * scale, 28 * scale, color).setStrokeStyle(isBoss ? 3 : 2, 0x151612, 0.95);
      const shellLeft = this.add.arc(-10 * scale, 0, 17 * scale, 95, 265, false, 0x344b47).setStrokeStyle(1, 0x171916);
      const shellRight = this.add.arc(-4 * scale, 0, 17 * scale, -85, 85, false, 0x2d413e).setStrokeStyle(1, 0x171916);
      const thorax = this.add.ellipse(14 * scale, 0, 21 * scale, 25 * scale, 0x242620).setStrokeStyle(2, 0x11120f);
      const head = this.add.triangle(27 * scale, 0, -8, -9, 11, 0, -8, 9, 0x171815);
      const upperMandible = this.add.triangle(39 * scale, -5 * scale, -8, -3, 7, 0, -7, 6, 0x090a08).setRotation(-0.25);
      const lowerMandible = this.add.triangle(39 * scale, 5 * scale, -8, 3, 7, 0, -7, -6, 0x090a08).setRotation(0.25);
      insectParts.push(abdomen, shellLeft, shellRight, thorax, head, upperMandible, lowerMandible);
    }
    const eye = this.add.circle(kind === "air" ? 3 * scale : 29 * scale, -3 * scale, isBoss ? 3 : 1.5, 0x991b1b, 0.8);
    insectParts.push(eye);
    const healthBarWidth = isBoss ? 82 : 48;
    const healthY = isBoss ? -45 : -28;
    const healthBg = this.add.rectangle(0, healthY, healthBarWidth, isBoss ? 8 : 5, 0x020617, 0.9);
    const healthBar = this.add.rectangle(-healthBarWidth / 2, healthY, healthBarWidth, isBoss ? 8 : 5, color).setOrigin(0, 0.5);
    const bossLabel = isBoss ? this.add.text(0, healthY - 15, "ALPHA", {
      fontFamily: "Arial",
      fontSize: "10px",
      color: "#fecaca",
      fontStyle: "bold",
      letterSpacing: 2,
    }).setOrigin(0.5) : null;
    const traitNames: Record<EnemyTrait, string> = {
      normal: "",
      armored: "CARAPACE",
      swift: "VIF",
      regenerator: "RÉGÉN.",
    };
    const traitLabel = !isBoss && trait !== "normal" ? this.add.text(0, healthY - 12, traitNames[trait], {
      fontFamily: "Arial",
      fontSize: "8px",
      color: trait === "armored" ? "#cbd5d1" : trait === "swift" ? "#d6c49b" : "#b7cba7",
      fontStyle: "bold",
      letterSpacing: 1,
    }).setOrigin(0.5) : null;
    container.add([...insectParts, healthBg, healthBar, ...(bossLabel ? [bossLabel] : []), ...(traitLabel ? [traitLabel] : [])]);

    const level = this.getActiveLevel();
    const traitHealthMultiplier = trait === "swift" ? 0.78 : trait === "armored" ? 1.28 : 1;
    const hp = Math.round((56 + this.wave * 16 + this.levelIndex * 10) * level.healthMultiplier * (isBoss ? 10 : 1) * traitHealthMultiplier);
    this.enemies.push({
      body: container,
      kind,
      hp,
      maxHp: hp,
      speed: (40 + this.wave * 2.8) * level.speedMultiplier * (isBoss ? 0.64 : trait === "swift" ? 1.42 : 1),
      healthBar,
      healthBarWidth,
      path: [
        new Phaser.Math.Vector2(spawnX, spawnY),
        ...(this.calculatePath(
          { col: entryCol, row: entryRow },
          { col: exitCol, row: exitRow },
        ) ?? []),
        new Phaser.Math.Vector2(exitX, exitY),
      ],
      pathIndex: 1,
      isBoss,
      coreDamage: 1,
      energyReward: isBoss ? 80 + this.wave * 4 : 8 + Math.ceil(this.wave / 3),
      slowedUntil: 0,
      exitCol,
      exitRow,
      exitX,
      exitY,
      trait,
      armor: trait === "armored" ? (isBoss ? 0.3 : 0.38) : 0,
      regeneration: trait === "regenerator" ? 0.018 : 0,
      exitId,
    });
  }

  private getEnemyTrait(isBoss: boolean): EnemyTrait {
    if (isBoss) return "armored";
    const profile = this.getWaveProfile();
    if (profile === 0) return this.spawnedThisWave % 3 === 2 ? "normal" : "armored";
    if (profile === 1) return this.spawnedThisWave % 3 === 2 ? "normal" : "swift";
    if (profile === 2 && this.wave >= 3) return this.spawnedThisWave % 4 === 3 ? "regenerator" : "normal";
    if (profile === 3) return this.spawnedThisWave % 2 === 0 ? "swift" : "normal";
    return "normal";
  }

  private getWaveProfile(): number {
    return (this.wave - 1 + this.levelIndex) % 4;
  }

  private moveEnemies(time: number, delta: number): void {
    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = this.enemies[index];
      const exitX = enemy.exitX;
      const exitY = enemy.exitY;
      const speed = enemy.speed * (time < enemy.slowedUntil ? 0.55 : 1);
      if (enemy.regeneration > 0 && enemy.hp > 0 && enemy.hp < enemy.maxHp) {
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * enemy.regeneration * (delta / 1000));
        enemy.healthBar.width = enemy.healthBarWidth * (enemy.hp / enemy.maxHp);
      }
      this.followPath(enemy, delta, speed);

      if (Phaser.Math.Distance.Between(enemy.body.x, enemy.body.y, exitX, exitY) <= 4) {
        this.snapExitTrap(enemy.exitId);
        enemy.body.destroy();
        this.enemies.splice(index, 1);
        this.baseHp = Math.max(0, this.baseHp - enemy.coreDamage);
        this.cameras.main.shake(180, 0.005);
        const escaped = 20 - this.baseHp;
        this.updateHud(this.baseHp > 0
          ? `Insecte échappé : ${escaped} / 20`
          : "20 insectes se sont échappés — recommencez le biome");
        if (this.baseHp === 0) this.gameOver();
      }
    }
  }

  private fireTowers(time: number): void {
    for (const tower of this.towers) {
      if (tower.isUpgrading) continue;
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
    const targets = this.enemies
      .filter((enemy) => definition.target === "all" || definition.target === enemy.kind)
      .filter((enemy) => Phaser.Math.Distance.Between(tower.body.x, tower.body.y, enemy.body.x, enemy.body.y) <= tower.range);
    if (tower.priority === "strong") return targets.sort((a, b) => b.hp - a.hp)[0];
    if (tower.priority === "weak") return targets.sort((a, b) => a.hp - b.hp)[0];
    return targets.sort((a, b) => {
      const remainingA = a.path.length - a.pathIndex;
      const remainingB = b.path.length - b.pathIndex;
      return remainingA - remainingB;
    })[0];
  }

  private applyTowerHit(tower: Tower, target: Enemy, definition: TowerDefinition): void {
    const impactX = target.body.x;
    const impactY = target.body.y;

    if (definition.effect === "slow") {
      target.slowedUntil = Math.max(target.slowedUntil, this.time.now + (tower.level >= 5 ? 4200 : 2200));
    }
    if (definition.effect === "splash" || (tower.level >= 5 && (tower.kind === "flak" || tower.kind === "pulse"))) {
      const victims = this.enemies.filter((enemy) =>
        enemy !== target
        && (definition.target === "all" || definition.target === enemy.kind)
        && Phaser.Math.Distance.Between(impactX, impactY, enemy.body.x, enemy.body.y) <= 90,
      );
      victims.forEach((enemy) => this.damageEnemy(enemy, Math.round(tower.damage * 0.55), definition.color));
    }

    let directDamage = tower.damage;
    if (tower.kind === "harpoon" && target.trait === "armored") directDamage = Math.round(directDamage * 1.4);
    if (tower.kind === "flak" && target.trait === "swift") directDamage = Math.round(directDamage * 1.35);
    this.damageEnemy(target, directDamage, definition.color, tower.level >= 5 && tower.kind === "harpoon");
  }

  private damageEnemy(enemy: Enemy, damage: number, color: number, ignoresArmor = false): void {
    if (!enemy.body.active) return;
    const effectiveDamage = ignoresArmor ? damage : Math.max(1, Math.round(damage * (1 - enemy.armor)));
    enemy.hp -= effectiveDamage;
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
      ? `Insecte alpha ${enemy.kind === "air" ? "volant" : "rampant"} digéré`
      : `${enemy.kind === "air" ? "Insecte volant" : "Insecte rampant"} digéré`);
  }

  private showWateringCanReward(): void {
    const reward = this.add.text(WIDTH / 2, HEIGHT - 292, "+1 ARROSOIR  💧", {
      fontFamily: "Arial",
      fontSize: "22px",
      color: "#dffaff",
      fontStyle: "bold",
      stroke: "#164e63",
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(25);
    this.tweens.add({
      targets: reward,
      y: reward.y - 52,
      alpha: 0,
      duration: 1450,
      ease: "Cubic.easeOut",
      onComplete: () => reward.destroy(),
    });
    this.updateHud("");
  }

  private upgradeTower(tower: Tower): void {
    if (tower.isUpgrading) return;
    if (tower.level >= MAX_TOWER_LEVEL) {
      this.updateHud(`${this.getTowerName(tower)} au niveau maximal`);
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
    tower.investedCost += cost;
    tower.isUpgrading = true;
    tower.upgradeReadyAt = this.time.now + UPGRADE_DURATIONS[tower.level];
    tower.levelBadge.setText(`${Math.ceil(UPGRADE_DURATIONS[tower.level] / 1000)}s`).setVisible(true);
    this.createUpgradePulse(tower, TOWERS[tower.kind].color);
    this.updateHud("");
  }

  private updateTowerUpgrades(time: number): void {
    this.towers.forEach((tower) => {
      if (!tower.isUpgrading) return;
      const remaining = Math.max(0, tower.upgradeReadyAt - time);
      tower.levelBadge.setText(`${Math.ceil(remaining / 1000)}s`);
      const plant = tower.body.getAt(1) as Phaser.GameObjects.Container;
      plant.setAlpha(0.68 + Math.sin(time / 180) * 0.22);
      if (remaining <= 0) this.completeTowerUpgrade(tower);
    });
  }

  private completeTowerUpgrade(tower: Tower): void {
    if (!tower.isUpgrading || !tower.body.active) return;
    const definition = TOWERS[tower.kind];
    tower.isUpgrading = false;
    tower.upgradeReadyAt = 0;
    tower.level += 1;
    tower.damage = Math.round(tower.damage * 1.35);
    tower.range += 16;
    tower.fireDelay = Math.max(260, Math.round(tower.fireDelay * 0.88));
    tower.levelBadge.setText("").setVisible(false);
    const base = tower.body.getAt(0) as Phaser.GameObjects.Rectangle;
    base.setFillStyle(TEMP_LEVEL_COLORS[tower.level - 1], 1);
    base.setStrokeStyle(tower.level >= 5 ? 3 : 2, tower.level >= 5 ? 0xf4d35e : definition.color, 0.95);

    const plant = tower.body.getAt(1) as Phaser.GameObjects.Container;
    const plantScale = tower.kind === "flak"
      ? 0.62 + (tower.level - 1) * 0.02
      : 0.72 + (tower.level - 1) * 0.04;
    plant.setAlpha(1).setScale(plantScale);
    this.evolveTowerVisual(tower);
    this.createUpgradePulse(tower, definition.color);
    const nextCost = tower.level < MAX_TOWER_LEVEL ? UPGRADE_COSTS[tower.level] : null;
    const evolvedName = this.getTowerName(tower);
    this.updateHud(nextCost === null
      ? `${evolvedName} niveau ${tower.level} — forme ultime atteinte`
      : `${evolvedName} niveau ${tower.level} — prochain niveau : ${nextCost} pièces`);
  }

  private showTowerActions(tower: Tower): void {
    this.closeTowerActions();
    if (!tower.body.active || !this.towers.includes(tower)) return;

    this.towerRangeIndicator = this.add.circle(
      tower.body.x,
      tower.body.y,
      tower.range,
      TOWERS[tower.kind].color,
      0.08,
    ).setStrokeStyle(3, TOWERS[tower.kind].color, 0.72).setDepth(10);
    const highlightSize = PLANT_FRAME_SIZE + 4;
    this.towerSelectionGlow = this.add.rectangle(tower.body.x, tower.body.y, highlightSize, highlightSize, 0xfff2a8, 0.12)
      .setStrokeStyle(4, 0xffe36e, 1)
      .setDepth(12);
    this.tweens.add({
      targets: this.towerSelectionGlow,
      alpha: 0.42,
      scale: 1.08,
      yoyo: true,
      repeat: -1,
      duration: 620,
      ease: "Sine.easeInOut",
    });

    const definition = TOWERS[tower.kind];
    const refund = Math.floor(tower.investedCost / 2);
    const nextUpgradeCost = tower.level < MAX_TOWER_LEVEL ? UPGRADE_COSTS[tower.level] : null;
    const panelX = WIDTH / 2;
    const panelY = HEIGHT - 115;
    const panel = this.add.container(panelX, panelY).setDepth(18);
    const background = this.add.rectangle(0, 0, 680, 210, 0x163f49, 0.985)
      .setStrokeStyle(3, 0x94cbd0, 0.92)
      .setInteractive();
    const towerTitle = this.add.text(0, -82, `${this.getTowerName(tower).toUpperCase()} · NIVEAU ${tower.level}/${MAX_TOWER_LEVEL}`, {
      fontFamily: "Arial",
      fontSize: "19px",
      color: "#f4faf6",
      fontStyle: "bold",
      stroke: "#08120d",
      strokeThickness: 3,
    }).setOrigin(0.5);
    const progressDots = Array.from({ length: MAX_TOWER_LEVEL }, (_unused, index) => this.add.circle(
      -48 + index * 24,
      -56,
      6,
      index < tower.level ? definition.color : 0x263c34,
      1,
    ).setStrokeStyle(2, index < tower.level ? 0xdde9d7 : 0x52645c, 0.85));
    const remainingSeconds = tower.isUpgrading ? Math.ceil((tower.upgradeReadyAt - this.time.now) / 1000) : 0;
    const upgradeLabel = tower.isUpgrading
      ? `ÉVOLUTION · ${Math.max(1, remainingSeconds)}s`
      : nextUpgradeCost === null ? "NIVEAU MAX" : `AMÉLIORER · ${nextUpgradeCost}`;
    const upgradeButton = this.makeButton(-220, -8, 200, 54, upgradeLabel, 0x315c45, () => {
      if (tower.isUpgrading) return;
      if (nextUpgradeCost === null) {
        this.updateHud(`${this.getTowerName(tower)} est déjà au niveau maximal`);
        return;
      }
      this.upgradeTower(tower);
      this.showTowerActions(tower);
    });
    const deleteButton = this.makeButton(0, -8, 200, 54, `SUPPRIMER · +${refund}`, 0x6b2926, () => {
      this.removeTower(tower);
    });
    const closeButton = this.makeButton(220, -8, 200, 54, "FERMER", 0x386774, () => {
      this.closeTowerActions();
    });
    const priorityNames: Record<TargetPriority, string> = { first: "PROCHE SORTIE", strong: "ROBUSTE", weak: "PLUS FAIBLE" };
    const priorityButton = this.makeButton(0, 61, 640, 48, `CIBLE : ${priorityNames[tower.priority]}`, 0x38483f, () => {
      tower.priority = tower.priority === "first" ? "strong" : tower.priority === "strong" ? "weak" : "first";
      this.showTowerActions(tower);
    });
    panel.add([background, towerTitle, ...progressDots, upgradeButton, deleteButton, closeButton, priorityButton]);
    this.towerActionPanel = panel;
    this.updateHud(`${this.getTowerName(tower)} niveau ${tower.level} — valeur investie : ${tower.investedCost} pièces`);
  }

  private removeTower(tower: Tower): void {
    const index = this.towers.indexOf(tower);
    if (index === -1) return;
    const refund = Math.floor(tower.investedCost / 2);
    const name = this.getTowerName(tower);
    this.energy += refund;
    tower.body.destroy();
    this.towers.splice(index, 1);
    this.closeTowerActions();
    this.recalculateEnemyPaths();
    this.updateHud(`${name} supprimée — ${refund} pièces récupérées`);
  }

  private closeTowerActions(): void {
    this.towerActionPanel?.destroy(true);
    this.towerActionPanel = undefined;
    if (this.towerSelectionGlow) {
      this.tweens.killTweensOf(this.towerSelectionGlow);
      this.towerSelectionGlow.destroy();
      this.towerSelectionGlow = undefined;
    }
    this.towerRangeIndicator?.destroy();
    this.towerRangeIndicator = undefined;
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

  private isTopWave(): boolean {
    return this.waveEntryTop;
  }

  private getRouteOptions(): Array<{
    top: boolean;
    exit: ExitId;
    entry: { col: number; row: number };
    destination: { col: number; row: number };
    guide: { col: number; row: number };
  }> {
    return [
      { top: true, exit: "right", entry: { col: TOP_ENTRY_COL, row: TOP_ENTRY_ROW }, destination: { col: TOP_EXIT_COL, row: TOP_EXIT_ROW }, guide: { col: 6, row: 8 } },
      { top: false, exit: "bottom", entry: { col: BOTTOM_ENTRY_COL, row: BOTTOM_ENTRY_ROW }, destination: { col: BOTTOM_EXIT_COL, row: BOTTOM_EXIT_ROW }, guide: { col: 14, row: 18 } },
      { top: true, exit: "bottom", entry: { col: TOP_ENTRY_COL, row: TOP_ENTRY_ROW }, destination: { col: BOTTOM_EXIT_COL, row: BOTTOM_EXIT_ROW }, guide: { col: 4, row: 18 } },
      { top: false, exit: "right", entry: { col: BOTTOM_ENTRY_COL, row: BOTTOM_ENTRY_ROW }, destination: { col: TOP_EXIT_COL, row: TOP_EXIT_ROW }, guide: { col: 16, row: 8 } },
    ];
  }

  private selectWaveRoute(): void {
    const routes = this.getRouteOptions().filter((route) => this.calculatePath(route.entry, route.destination) !== null);
    if (routes.length === 0) return;
    const route = routes[(this.wave - 1 + this.levelIndex) % routes.length];
    this.waveEntryTop = route.top;
    this.waveExitId = route.exit;
    this.waveRouteGuide = route.guide;
  }

  private createImpact(x: number, y: number, color: number): void {
    const impact = this.add.circle(x, y, 8, color, 0.65);
    this.tweens.add({ targets: impact, scale: 2.4, alpha: 0, duration: 180, onComplete: () => impact.destroy() });
  }

  private followPath(enemy: Enemy, delta: number, speed: number): void {
    const target = enemy.path[enemy.pathIndex];
    if (!target) {
      this.recalculateEnemyPath(enemy);
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

  private recalculateEnemyPaths(): void {
    this.enemies.forEach((enemy) => this.recalculateEnemyPath(enemy));
  }

  private recalculateEnemyPath(enemy: Enemy): void {
    const approximateRow = Phaser.Math.Clamp(Math.round((enemy.body.y - GRID_Y) / CELL), 0, GRID_ROWS - 1);
    const approximateCol = Phaser.Math.Clamp(Math.round((enemy.body.x - GRID_X) / CELL), 0, GRID_COLS - 1);
    const blocked = new Set(this.towers.map((tower) => `${tower.col},${tower.row}`));
    const candidates: { col: number; row: number }[] = [];

    for (let radius = 0; radius <= 2; radius += 1) {
      for (let rowOffset = -radius; rowOffset <= radius; rowOffset += 1) {
        for (let colOffset = -radius; colOffset <= radius; colOffset += 1) {
          const col = approximateCol + colOffset;
          const row = approximateRow + rowOffset;
          if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) continue;
          if (blocked.has(`${col},${row}`)) continue;
          candidates.push({ col, row });
        }
      }
      if (candidates.length > 0) break;
    }

    candidates.sort((a, b) => {
      const distanceA = Phaser.Math.Distance.Squared(
        enemy.body.x,
        enemy.body.y,
        this.gridToWorldX(a.col, a.row),
        this.gridToWorldY(a.row),
      );
      const distanceB = Phaser.Math.Distance.Squared(
        enemy.body.x,
        enemy.body.y,
        this.gridToWorldX(b.col, b.row),
        this.gridToWorldY(b.row),
      );
      return distanceA - distanceB;
    });

    const exits: Array<{ id: ExitId; col: number; row: number; x: number; y: number }> = [
      { id: "right" as ExitId, col: TOP_EXIT_COL, row: TOP_EXIT_ROW, x: this.gridToWorldX(TOP_EXIT_COL, TOP_EXIT_ROW), y: this.gridToWorldY(TOP_EXIT_ROW) },
      { id: "bottom" as ExitId, col: BOTTOM_EXIT_COL, row: BOTTOM_EXIT_ROW, x: this.gridToWorldX(BOTTOM_EXIT_COL, BOTTOM_EXIT_ROW), y: this.gridToWorldY(BOTTOM_EXIT_ROW) },
    ].filter((exit) => !blocked.has(`${exit.col},${exit.row}`));

    let bestRoute: { path: Phaser.Math.Vector2[]; exit: typeof exits[number] } | null = null;
    for (const start of candidates) {
      for (const exit of exits) {
        const path = this.calculatePath(start, { col: exit.col, row: exit.row });
        if (!path || (bestRoute && path.length >= bestRoute.path.length)) continue;
        bestRoute = { path, exit };
      }
    }

    if (bestRoute) {
      enemy.exitId = bestRoute.exit.id;
      enemy.exitCol = bestRoute.exit.col;
      enemy.exitRow = bestRoute.exit.row;
      enemy.exitX = bestRoute.exit.x;
      enemy.exitY = bestRoute.exit.y;
      enemy.path = [
        new Phaser.Math.Vector2(enemy.body.x, enemy.body.y),
        ...bestRoute.path,
        new Phaser.Math.Vector2(enemy.exitX, enemy.exitY),
      ];
      enemy.pathIndex = 1;
      return;
    }

    enemy.path = [];
    enemy.pathIndex = 0;
  }

  private calculatePath(
    start: { col: number; row: number },
    end: { col: number; row: number },
    extraBlocked?: { col: number; row: number },
  ): Phaser.Math.Vector2[] | null {
    const key = (col: number, row: number) => `${col},${row}`;
    const blocked = new Set(this.towers.map((tower) => key(tower.col, tower.row)));
    if (extraBlocked) blocked.add(key(extraBlocked.col, extraBlocked.row));
    if (blocked.has(key(start.col, start.row)) || blocked.has(key(end.col, end.row))) return null;

    const frontier = [start];
    const costs = new Map<string, number>([[key(start.col, start.row), 0]]);
    const previous = new Map<string, { col: number; row: number }>();
    const directions = [
      { col: 1, row: 0 },
      { col: 0, row: 1 },
      { col: 0, row: -1 },
      { col: -1, row: 0 },
    ];

    const attractors = this.towers.map((tower) => ({ col: tower.col, row: tower.row }));
    if (extraBlocked) attractors.push(extraBlocked);

    while (frontier.length > 0) {
      frontier.sort((a, b) => (costs.get(key(a.col, a.row)) ?? Infinity) - (costs.get(key(b.col, b.row)) ?? Infinity));
      const current = frontier.shift()!;
      if (current.col === end.col && current.row === end.row) {
        const cells = [current];
        let cursor = current;
        while (key(cursor.col, cursor.row) !== key(start.col, start.row)) {
          cursor = previous.get(key(cursor.col, cursor.row))!;
          cells.push(cursor);
        }
        return cells.reverse().map((cell) => new Phaser.Math.Vector2(this.gridToWorldX(cell.col, cell.row), this.gridToWorldY(cell.row)));
      }

      for (const direction of directions) {
        const next = { col: current.col + direction.col, row: current.row + direction.row };
        const nextKey = key(next.col, next.row);
        if (next.col < 0 || next.col >= GRID_COLS || next.row < 0 || next.row >= GRID_ROWS) continue;
        if (blocked.has(nextKey)) continue;

        let scentStrength = 0;
        attractors.forEach((tower) => {
          const distance = Math.abs(next.col - tower.col) + Math.abs(next.row - tower.row);
          if (distance <= 2) scentStrength += 0.34;
          else if (distance <= 4) scentStrength += 0.14;
          else if (distance <= 6) scentStrength += 0.05;
        });
        const guideDistance = Math.abs(next.col - this.waveRouteGuide.col) + Math.abs(next.row - this.waveRouteGuide.row);
        const routeAttraction = Math.max(0, 0.24 - guideDistance * 0.0175);
        const movementCost = Math.max(0.34, 1 - scentStrength - routeAttraction);
        const newCost = (costs.get(key(current.col, current.row)) ?? 0) + movementCost;
        if (newCost >= (costs.get(nextKey) ?? Infinity)) continue;
        costs.set(nextKey, newCost);
        previous.set(nextKey, current);
        if (!frontier.some((cell) => cell.col === next.col && cell.row === next.row)) frontier.push(next);
      }
    }
    return null;
  }

  private gameOver(): void {
    this.waveActive = false;
    this.levelStarted = false;
    this.nextWaveAt = 0;
    this.setStartButtonEnabled(false);
    const overlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x022c2b, 0.82);
    const title = this.add.text(WIDTH / 2, HEIGHT / 2 - 70, "20 INSECTES SE SONT ÉCHAPPÉS", {
      fontFamily: "Arial",
      fontSize: "42px",
      color: "#fb7185",
      fontStyle: "bold",
    }).setOrigin(0.5);
    const retry = this.makeButton(WIDTH / 2, HEIGHT / 2 + 15, 390, 52, "RECOMMENCER LA PARTIE", 0x0f766e, () => this.scene.restart({
      levelIndex: this.levelIndex,
      infiniteNightmare: this.infiniteNightmare,
    }));
    const menu = this.makeButton(WIDTH / 2, HEIGHT / 2 + 78, 210, 42, "CHOIX DU BIOME", 0x334155, () => this.goToHome());
    overlay.setDepth(20);
    title.setDepth(21);
    retry.setDepth(21);
    menu.setDepth(21);
  }

  private updateHud(_message: string): void {
    this.hpText?.setText(`♥ ${this.baseHp}/20`);
    this.energyText?.setText(`◈ ${this.energy}`);
    this.waveText?.setText(`VAGUE ${Math.max(1, this.wave)}`);
    this.shearText?.setText(`💧 ${this.wateringCans}`);
    this.statusText?.setText("").setVisible(false);
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
    const bg = this.add.rectangle(0, 0, width, height, color, 0.9).setStrokeStyle(1, 0x71867a, 0.65);
    const text = this.add.text(0, 0, label, {
      fontFamily: "Arial",
      fontSize: "22px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#111a15",
      strokeThickness: 2,
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
      fontSize: "14px",
      color: `#${color.toString(16).padStart(6, "0")}`,
      fontStyle: "bold",
      letterSpacing: 2,
      stroke: "#08100c",
      strokeThickness: 2,
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
