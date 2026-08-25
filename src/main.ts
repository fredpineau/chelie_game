import Phaser from "phaser";
import "./style.css";

const WIDTH = 1280;
const HEIGHT = 720;
const CELL = 52;
const GRID_X = 230;
const GRID_Y = 142;
const GRID_COLS = 20;
const GRID_ROWS = 10;
const MAP_CENTER_X = GRID_X + ((GRID_COLS - 1) * CELL) / 2;
const MAP_CENTER_Y = GRID_Y + ((GRID_ROWS - 1) * CELL) / 2;
const TOP_ENTRY_COL = Math.floor(GRID_COLS / 2);
const BOTTOM_ENTRY_COL = 0;
const TOP_ENTRY_ROW = 0;
const BOTTOM_ENTRY_ROW = 5;
const TOP_EXIT_COL = GRID_COLS - 1;
const TOP_EXIT_ROW = 5;
const BOTTOM_EXIT_COL = Math.floor(GRID_COLS / 2);
const BOTTOM_EXIT_ROW = GRID_ROWS - 1;

type EnemyKind = "air" | "sea";
type EnemyTrait = "normal" | "armored" | "swift" | "regenerator";
type TargetPriority = "first" | "strong" | "weak";
type ExitId = "right" | "bottom";
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
  harpoon: { name: "Dionée", icon: "D", color: 0x66845b, target: "sea", cost: 5, damage: 18, range: 210, fireDelay: 780, effect: "standard", unlockLevel: 0 },
  flak: { name: "Sarracénie", icon: "S", color: 0x9a5938, target: "air", cost: 10, damage: 16, range: 220, fireDelay: 500, effect: "standard", unlockLevel: 0 },
  pulse: { name: "Drosera", icon: "R", color: 0x8d596d, target: "all", cost: 20, damage: 14, range: 230, fireDelay: 650, effect: "standard", unlockLevel: 1 },
  cryo: { name: "Népenthès", icon: "N", color: 0x5f898c, target: "all", cost: 30, damage: 8, range: 205, fireDelay: 900, effect: "slow", unlockLevel: 2 },
  tesla: { name: "Orchidée arc", icon: "O", color: 0x9f894b, target: "all", cost: 45, damage: 12, range: 190, fireDelay: 280, effect: "standard", unlockLevel: 3 },
  railgun: { name: "Épineuse", icon: "E", color: 0x718448, target: "all", cost: 70, damage: 55, range: 310, fireDelay: 1600, effect: "standard", unlockLevel: 4 },
  nova: { name: "Rafflesia", icon: "F", color: 0x873d3b, target: "all", cost: 100, damage: 28, range: 230, fireDelay: 1250, effect: "splash", unlockLevel: 5 },
};

const MAX_TOWER_LEVEL = 5;
const UPGRADE_COSTS = [0, 30, 60, 100, 160];

const LEVELS: LevelDefinition[] = [
  { name: "Marais affamé", code: "BIOME 01", waves: 10, healthMultiplier: 1.15, speedMultiplier: 0.98, swarmBonus: 2 },
  { name: "Canopée hostile", code: "BIOME 02", waves: 15, healthMultiplier: 1.4, speedMultiplier: 1.08, swarmBonus: 4 },
  { name: "Serre écarlate", code: "BIOME 03", waves: 20, healthMultiplier: 1.7, speedMultiplier: 1.17, swarmBonus: 6 },
  { name: "Tourbière noire", code: "BIOME 04", waves: 25, healthMultiplier: 2.05, speedMultiplier: 1.25, swarmBonus: 8 },
  { name: "Jardin primordial", code: "BIOME 05", waves: 30, healthMultiplier: 2.45, speedMultiplier: 1.32, swarmBonus: 10 },
  { name: "Floraison éternelle", code: "MODE ∞", waves: null, healthMultiplier: 2.8, speedMultiplier: 1.38, swarmBonus: 12 },
];

class DefenseScene extends Phaser.Scene {
  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private baseHp = 20;
  private energy = 60;
  private wave = 0;
  private enemiesToSpawn = 0;
  private spawnedThisWave = 0;
  private waveActive = false;
  private selectedTower: TowerKind | null = null;
  private nextSpawnAt = 0;
  private nextWaveAt = 0;
  private lastCountdownValue = -1;
  private levelIndex = 0;
  private levelStarted = false;
  private requestedLevelIndex: number | null = null;
  private hpText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private energyText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private autoWaveText!: Phaser.GameObjects.Text;
  private startButton!: Phaser.GameObjects.Container;
  private towerButtons = new Map<TowerKind, Phaser.GameObjects.Container>();
  private towerActionPanel?: Phaser.GameObjects.Container;
  private exitTraps = new Map<ExitId, { leftJaw: Phaser.GameObjects.Container; rightJaw: Phaser.GameObjects.Container }>();

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

    this.updateAutoWave(time);
    this.spawnWaveEnemies(time);
    this.moveEnemies(time, delta);
    this.fireTowers(time);

    if (this.waveActive && this.spawnedThisWave >= this.enemiesToSpawn && this.enemies.length === 0) {
      this.waveActive = false;
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
    this.wave = 0;
    this.enemiesToSpawn = 0;
    this.spawnedThisWave = 0;
    this.waveActive = false;
    this.levelStarted = false;
    this.nextSpawnAt = 0;
    this.nextWaveAt = 0;
    this.lastCountdownValue = -1;
    this.selectedTower = null;
    this.towerButtons.clear();
    this.exitTraps.clear();
  }

  private drawWorld(): void {
    const background = this.add.graphics();
    background.fillGradientStyle(0x8b7b5c, 0xa49470, 0x796b50, 0x91805e, 1);
    background.fillRect(0, 0, WIDTH, HEIGHT);

    this.createMarshAtmosphere();

    this.createGates();
  }

  private createMarshAtmosphere(): void {
    const sunX = 170;
    const sunY = 92;
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
    terrain.fillStyle(0x5f533f, 0.34);
    terrain.fillEllipse(470, 245, 390, 180);
    terrain.fillEllipse(925, 500, 520, 230);
    terrain.fillStyle(0x4f8588, 0.42);
    terrain.fillEllipse(730, 360, 610, 300);
    terrain.fillStyle(0x88b0a5, 0.24);
    terrain.fillEllipse(660, 330, 450, 170);
    terrain.fillEllipse(1030, 235, 310, 130);

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
    this.createCreatureGate(MAP_CENTER_X, GRID_Y - 24, "ENTRÉE 1", Math.PI, false);
    this.createCreatureGate(GRID_X + 40, MAP_CENTER_Y, "ENTRÉE 2", -Math.PI / 2, false);
    this.createExitTrap(Math.min(GRID_X + TOP_EXIT_COL * CELL + 24, WIDTH - 72), MAP_CENTER_Y, "right", -Math.PI / 2);
    this.createExitTrap(MAP_CENTER_X, GRID_Y + BOTTOM_EXIT_ROW * CELL + 24, "bottom", 0);
  }

  private createExitTrap(x: number, y: number, exitId: ExitId, rotation: number): void {
    const trap = this.add.container(x, y).setRotation(rotation);
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
    trap.add([shadow, stem, leftJaw, rightJaw]);
    this.exitTraps.set(exitId, { leftJaw, rightJaw });
    this.tweens.add({ targets: [leftLobe, rightLobe], scaleY: 1.025, yoyo: true, repeat: -1, duration: 1450 });
  }

  private snapExitTrap(exitId: ExitId): void {
    const trap = this.exitTraps.get(exitId);
    if (!trap) return;
    this.tweens.killTweensOf([trap.leftJaw, trap.rightJaw]);
    trap.leftJaw.setPosition(-17, -5).setRotation(-0.22);
    trap.rightJaw.setPosition(17, -5).setRotation(0.22);
    this.tweens.add({
      targets: trap.leftJaw,
      x: -4,
      rotation: -0.02,
      duration: 95,
      hold: 120,
      yoyo: true,
      ease: "Cubic.easeIn",
    });
    this.tweens.add({
      targets: trap.rightJaw,
      x: 4,
      rotation: 0.02,
      duration: 95,
      hold: 120,
      yoyo: true,
      ease: "Cubic.easeIn",
    });
  }

  private createCreatureGate(x: number, y: number, _label: string, rotation: number, _isExit: boolean): void {
    const flower = this.add.container(x, y).setRotation(rotation);
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
    this.add.text(28, 24, "CHELIE //", {
      fontFamily: "Arial",
      fontSize: "20px",
      color: "#f8fafc",
      fontStyle: "bold",
      stroke: "#17231d",
      strokeThickness: 3,
      letterSpacing: 4,
    });
    this.add.text(28, 47, "CARNIVORE GARDEN", {
      fontFamily: "Arial",
      fontSize: "11px",
      color: "#d2e2da",
      fontStyle: "bold",
      stroke: "#17231d",
      strokeThickness: 2,
      letterSpacing: 2,
    });

    this.levelText = this.createHudBadge(220, "B", 0x315c54, "BIOME --", "#a7c4bc");
    this.waveText = this.createHudBadge(430, "!", 0x58322e, "MENACE EN ATTENTE", "#d8c0b4");
    this.hpText = this.createHudBadge(900, "♥", 0x5c2929, "VIES 20 / 20", "#d8aaa6");
    this.energyText = this.createHudBadge(1100, "◈", 0x60532c, "PIÈCES 60", "#d8c787");
    this.add.text(940, 68, "N2 30  ·  N3 60  ·  N4 100  ·  N5 160", {
      fontFamily: "Arial",
      fontSize: "10px",
      color: "#e1e8d8",
      fontStyle: "bold",
      stroke: "#17231d",
      strokeThickness: 2,
      letterSpacing: 0.4,
    });
    this.statusText = this.add.text(430, 98, "", {
      fontFamily: "Arial",
      fontSize: "15px",
      color: "#f3f7f3",
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: 570 },
      backgroundColor: "#26352dd9",
      padding: { x: 10, y: 5 },
      stroke: "#101813",
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.startButton = this.makeButton(WIDTH - 88, HEIGHT - 68, 150, 42, "LANCER", 0x0f766e, () => this.startWave());
    this.autoWaveText = this.add.text(WIDTH - 88, HEIGHT - 38, "", {
      fontFamily: "Arial",
      fontSize: "11px",
      color: "#bef264",
      fontStyle: "bold",
      backgroundColor: "#17231de6",
      padding: { x: 6, y: 3 },
      letterSpacing: 1,
    }).setOrigin(0.5);
  }

  private createHudBadge(
    x: number,
    icon: string,
    color: number,
    initialText: string,
    textColor: string,
  ): Phaser.GameObjects.Text {
    const shadow = this.add.circle(x + 2, 46, 29, 0x020706, 0.55);
    const badge = this.add.circle(x, 43, 27, 0x081713, 0.96).setStrokeStyle(2, color, 0.95);
    const symbol = this.add.text(x, 43, icon, {
      fontFamily: "Arial",
      fontSize: "17px",
      color: textColor,
      fontStyle: "bold",
    }).setOrigin(0.5);
    this.tweens.add({ targets: [badge, symbol], scale: 1.04, yoyo: true, repeat: -1, duration: 1900 + x });
    shadow.setDepth(1);
    badge.setDepth(2);
    symbol.setDepth(3);
    return this.add.text(x + 38, 43, initialText, {
      fontFamily: "Arial",
      fontSize: "14px",
      color: textColor,
      fontStyle: "bold",
      letterSpacing: 0.8,
      stroke: "#07110d",
      strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(3);
  }

  private showLevelSelection(): void {
    const unlocked = this.getUnlockedLevel();
    const overlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x02040a, 0.9)
      .setDepth(30)
      .setInteractive();
    const panel = this.add.rectangle(WIDTH / 2, HEIGHT / 2 + 12, 820, 510, 0x090e18, 0.98)
      .setStrokeStyle(1, 0x475569, 0.9)
      .setDepth(31);
    this.add.text(WIDTH / 2, 150, "SÉLECTION DU BIOME", {
      fontFamily: "Arial",
      fontSize: "30px",
      color: "#f8fafc",
      fontStyle: "bold",
      letterSpacing: 3,
    }).setOrigin(0.5).setDepth(32);
    this.add.text(WIDTH / 2, 193, "Protégez un biome pour faire éclore la plante suivante", {
      fontFamily: "Arial",
      fontSize: "14px",
      color: "#cbd5e1",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(32);

    LEVELS.forEach((level, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 400 + col * 240;
      const y = 285 + row * 120;
      const available = index <= unlocked;
      const waveLabel = level.waves === null ? "SURVIE SANS LIMITE" : "MENACE CROISSANTE";

      if (available) {
        const button = this.makeButton(x, y, 210, 78, `${level.code}\n${level.name.toUpperCase()}`, index === LEVELS.length - 1 ? 0x4d7c0f : 0x0f766e, () => {
          this.scene.restart({ levelIndex: index });
        });
        button.setDepth(32);
        this.add.text(x, y + 52, waveLabel, {
          fontFamily: "Arial",
          fontSize: "10px",
          color: "#94a3b8",
          fontStyle: "bold",
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
          fontStyle: "bold",
        }).setOrigin(0.5).setDepth(33);
      }
    });

    overlay.on("pointerdown", () => undefined);
    panel.setInteractive().on("pointerdown", () => undefined);
  }

  private beginLevel(index: number): void {
    this.levelIndex = Phaser.Math.Clamp(index, 0, LEVELS.length - 1);
    this.levelStarted = true;
    this.levelText.setText(LEVELS[this.levelIndex].name.toUpperCase());
    this.setStartButtonEnabled(true);
    this.nextWaveAt = 0;
    this.autoWaveText.setText("PREMIÈRE VAGUE : LANCEMENT MANUEL");
    this.updateHud("");
  }

  private completeLevel(): void {
    this.levelStarted = false;
    this.nextWaveAt = 0;
    this.autoWaveText.setText("");
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

    this.add.rectangle(x, 390, 208, 540, 0x17231d, 0.78)
      .setStrokeStyle(2, 0x667766, 0.72);
    this.add.text(x, startY - 34, "HERBIER", this.labelStyle(0xd9f99d)).setOrigin(0.5);

    (Object.keys(TOWERS) as TowerKind[]).forEach((kind, index) => {
      const definition = TOWERS[kind];
      const available = this.levelIndex >= definition.unlockLevel;
      const y = startY + index * 76;
      const button = this.add.container(x, y);
      const bg = this.add.circle(-57, 0, 28, 0x052e2b, 0.98)
        .setStrokeStyle(2, available && kind === this.selectedTower ? definition.color : 0x28665e, 1);
      const plantPreview = this.createPlantVisual(kind, definition.color)
        .setPosition(-57, 3)
        .setScale(0.67)
        .setAlpha(available ? 1 : 0.25);
      const title = this.add.text(-26, -17, definition.name.toUpperCase(), {
        fontFamily: "Arial",
        fontSize: "14px",
        color: available ? "#f8fafc" : "#64748b",
        fontStyle: "bold",
        stroke: "#08100c",
        strokeThickness: 2,
      });
      const targetLabel = definition.target === "sea" ? "RAMPANTS" : definition.target === "air" ? "VOLANTS" : "TOUS INSECTES";
      const detail = available ? `${definition.cost} PIÈCES  •  ${targetLabel}` : `DÉBLOCAGE : ${LEVELS[definition.unlockLevel].code}`;
      const target = this.add.text(-26, 7, detail, {
        fontFamily: "Arial",
        fontSize: "10px",
        color: available ? "#cbd5e1" : "#8190a5",
        fontStyle: "bold",
        stroke: "#08100c",
        strokeThickness: 2,
      });
      button.add([bg, plantPreview, title, target]);
      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerover", () => bg.setScale(1.08));
      bg.on("pointerout", () => bg.setScale(1));
      bg.on("pointerdown", () => this.selectTower(kind));
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
    this.closeTowerActions();
    this.towerButtons.forEach((button, buttonKind) => {
      const bg = button.getAt(0) as Phaser.GameObjects.Arc;
      bg.setStrokeStyle(2, buttonKind === kind ? TOWERS[buttonKind].color : 0x28665e, 1);
    });
    this.updateHud(`${TOWERS[kind].name} sélectionnée — améliorations : 30 / 60 / 100 / 160 pièces`);
  }

  private placeTower(x: number, y: number): void {
    this.closeTowerActions();
    if (this.selectedTower === null) {
      this.updateHud("Sélectionnez une plante dans l'herbier avant de la poser");
      return;
    }
    const selectedKind = this.selectedTower;
    const definition = TOWERS[selectedKind];
    const col = Phaser.Math.Clamp(Math.round((x - GRID_X) / CELL), 0, GRID_COLS - 1);
    const row = Phaser.Math.Clamp(Math.round((y - GRID_Y) / CELL), 0, GRID_ROWS - 1);
    const towerX = GRID_X + col * CELL;
    const towerY = GRID_Y + row * CELL;

    const distanceToTopEntry = Math.abs(col - TOP_ENTRY_COL) + Math.abs(row - TOP_ENTRY_ROW);
    const distanceToBottomEntry = Math.abs(col - BOTTOM_ENTRY_COL) + Math.abs(row - BOTTOM_ENTRY_ROW);
    const distanceToTopExit = Math.abs(col - TOP_EXIT_COL) + Math.abs(row - TOP_EXIT_ROW);
    const distanceToBottomExit = Math.abs(col - BOTTOM_EXIT_COL) + Math.abs(row - BOTTOM_EXIT_ROW);
    if (distanceToTopEntry <= 1 || distanceToBottomEntry <= 1 || distanceToTopExit <= 1 || distanceToBottomExit <= 1) {
      this.updateHud("Zone de portail protégée — plantez un peu plus loin");
      return;
    }
    if (this.towers.some((tower) => tower.col === col && tower.row === row)) {
      this.updateHud("Cet emplacement est déjà occupé");
      return;
    }
    if (this.enemies.some((enemy) => Phaser.Math.Distance.Between(enemy.body.x, enemy.body.y, towerX, towerY) < CELL * 0.72)) {
      this.updateHud("Un insecte traverse cette zone — attendez qu'il soit passé");
      return;
    }
    if (this.energy < definition.cost) {
      this.updateHud(`${definition.name} coûte ${definition.cost} pièces — solde insuffisant`);
      return;
    }
    const topPath = this.calculatePath(
      { col: TOP_ENTRY_COL, row: TOP_ENTRY_ROW },
      { col: TOP_EXIT_COL, row: TOP_EXIT_ROW },
      { col, row },
    );
    const bottomPath = this.calculatePath(
      { col: BOTTOM_ENTRY_COL, row: BOTTOM_ENTRY_ROW },
      { col: BOTTOM_EXIT_COL, row: BOTTOM_EXIT_ROW },
      { col, row },
    );
    if (!topPath || !bottomPath) {
      this.updateHud("Un chemin doit rester ouvert entre chaque entrée et sa sortie");
      this.cameras.main.shake(120, 0.002);
      return;
    }

    this.energy -= definition.cost;
    const towerBody = this.add.container(towerX, towerY);

    const base = this.add.circle(0, 9, 27, 0x29210f).setStrokeStyle(3, 0x4d7c0f, 0.85);
    const plant = this.createPlantVisual(selectedKind, definition.color);
    const levelBadge = this.add.text(21, 21, "1", {
      fontFamily: "Arial",
      fontSize: "11px",
      color: "#ffffff",
      backgroundColor: "#0f172a",
      padding: { x: 4, y: 2 },
      fontStyle: "bold",
    }).setOrigin(0.5);
    towerBody.add([base, plant, levelBadge]);

    const tower: Tower = {
      body: towerBody,
      kind: selectedKind,
      range: definition.range,
      damage: definition.damage,
      fireDelay: definition.fireDelay,
      lastShot: 0,
      col,
      row,
      level: 1,
      levelBadge,
      investedCost: definition.cost,
      priority: "first",
    };
    towerBody.setSize(CELL - 4, CELL - 4).setInteractive({ useHandCursor: true });
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
    this.towerButtons.forEach((button) => {
      const bg = button.getAt(0) as Phaser.GameObjects.Arc;
      bg.setStrokeStyle(2, 0x28665e, 1);
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
    } else if (kind === "flak" || kind === "cryo") {
      plant.add([
        this.add.ellipse(0, -5, 19, 34, color, 0.95).setStrokeStyle(2, 0x14532d),
        this.add.ellipse(0, -20, 23, 8, kind === "flak" ? 0xfb923c : 0xa5f3fc).setStrokeStyle(2, 0x14532d),
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

  private startWave(): void {
    if (!this.levelStarted || this.waveActive || this.baseHp <= 0) return;
    const level = LEVELS[this.levelIndex];
    if (level.waves !== null && this.wave >= level.waves) return;
    this.wave += 1;
    this.enemiesToSpawn = 6 + this.wave * 3 + level.swarmBonus;
    this.spawnedThisWave = 0;
    this.waveActive = true;
    this.nextSpawnAt = 0;
    this.nextWaveAt = 0;
    this.lastCountdownValue = -1;
    this.autoWaveText.setText("");
    this.setStartButtonEnabled(false);
    const origin = this.isTopWave() ? "NORD" : "OUEST";
    this.updateHud(this.isBossWave()
      ? `ALERTE ${origin} — insecte alpha détecté`
      : `Vague ${this.wave} en approche par le ${origin}`);
  }

  private scheduleNextWave(delay: number): void {
    this.nextWaveAt = this.time.now + delay;
    this.lastCountdownValue = -1;
    this.updateAutoWave(this.time.now);
  }

  private updateAutoWave(time: number): void {
    if (this.waveActive || this.nextWaveAt <= 0 || !this.levelStarted) return;
    const remaining = Math.max(0, Math.ceil((this.nextWaveAt - time) / 1000));
    if (remaining !== this.lastCountdownValue) {
      this.lastCountdownValue = remaining;
      this.autoWaveText.setText(`DÉPART AUTO : ${remaining}s`);
    }
    if (time >= this.nextWaveAt) {
      this.startWave();
    }
  }

  private spawnWaveEnemies(time: number): void {
    if (!this.waveActive || this.spawnedThisWave >= this.enemiesToSpawn || time < this.nextSpawnAt) return;

    let kind: EnemyKind = (this.spawnedThisWave + this.wave) % 2 === 0 ? "air" : "sea";
    if (this.wave >= 3 && this.spawnedThisWave % 4 === 3) {
      const antiAir = this.towers.filter((tower) => TOWERS[tower.kind].target === "air" || TOWERS[tower.kind].target === "all").length;
      const antiGround = this.towers.filter((tower) => TOWERS[tower.kind].target === "sea" || TOWERS[tower.kind].target === "all").length;
      kind = antiAir > antiGround ? "sea" : "air";
    }
    const isBoss = this.isBossWave() && this.spawnedThisWave === 0;
    this.spawnEnemy(kind, isBoss);
    this.spawnedThisWave += 1;
    this.nextSpawnAt = time + Math.max(300, 1050 - this.wave * 50 - this.levelIndex * 40);
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
    const exitRow = this.isTopWave() ? TOP_EXIT_ROW : BOTTOM_EXIT_ROW;
    const exitCol = this.isTopWave() ? TOP_EXIT_COL : BOTTOM_EXIT_COL;
    const exitId: ExitId = this.isTopWave() ? "right" : "bottom";
    const spawnX = this.isTopWave() ? MAP_CENTER_X : GRID_X;
    const spawnY = this.isTopWave() ? GRID_Y : MAP_CENTER_Y;
    const exitX = this.isTopWave() ? GRID_X + TOP_EXIT_COL * CELL : MAP_CENTER_X;
    const exitY = this.isTopWave() ? MAP_CENTER_Y : GRID_Y + BOTTOM_EXIT_ROW * CELL;
    const container = this.add.container(spawnX, spawnY);
    const scale = isBoss ? 1.55 : 1;
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

    const level = LEVELS[this.levelIndex];
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
    const signature = this.wave * 3 + this.spawnedThisWave;
    if (this.wave >= 4 && signature % 9 === 0) return "regenerator";
    if (this.wave >= 3 && signature % 6 === 0) return "swift";
    if (this.wave >= 2 && signature % 5 === 0) return "armored";
    return "normal";
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
      target.slowedUntil = Math.max(target.slowedUntil, this.time.now + 2200);
    }
    if (definition.effect === "splash") {
      const victims = this.enemies.filter((enemy) =>
        enemy !== target && Phaser.Math.Distance.Between(impactX, impactY, enemy.body.x, enemy.body.y) <= 90,
      );
      victims.forEach((enemy) => this.damageEnemy(enemy, Math.round(tower.damage * 0.55), definition.color));
    }

    this.damageEnemy(target, tower.damage, definition.color, tower.kind === "railgun");
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
    tower.investedCost += cost;
    tower.level += 1;
    tower.damage = Math.round(tower.damage * 1.35);
    tower.range += 16;
    tower.fireDelay = Math.max(260, Math.round(tower.fireDelay * 0.88));
    tower.levelBadge.setText(String(tower.level));

    const plant = tower.body.getAt(1) as Phaser.GameObjects.Container;
    plant.setScale(1 + (tower.level - 1) * 0.07);
    this.createUpgradePulse(tower, definition.color);
    const nextCost = tower.level < MAX_TOWER_LEVEL ? UPGRADE_COSTS[tower.level] : null;
    this.updateHud(nextCost === null
      ? `${definition.name} niveau ${tower.level} — niveau maximal atteint`
      : `${definition.name} niveau ${tower.level} — prochain niveau : ${nextCost} pièces`);
  }

  private showTowerActions(tower: Tower): void {
    this.closeTowerActions();
    if (!tower.body.active || !this.towers.includes(tower)) return;

    const definition = TOWERS[tower.kind];
    const refund = Math.floor(tower.investedCost / 2);
    const nextUpgradeCost = tower.level < MAX_TOWER_LEVEL ? UPGRADE_COSTS[tower.level] : null;
    const panelX = Phaser.Math.Clamp(tower.body.x, 330, WIDTH - 185);
    const panelY = Phaser.Math.Clamp(tower.body.y - 104, 155, HEIGHT - 135);
    const panel = this.add.container(panelX, panelY).setDepth(18);
    const background = this.add.rectangle(0, 0, 316, 116, 0x061713, 0.96)
      .setStrokeStyle(1, 0x66806d, 0.8);
    const upgradeLabel = nextUpgradeCost === null ? "NIVEAU MAX" : `AMÉLIORER · ${nextUpgradeCost}`;
    const upgradeButton = this.makeButton(-78, -24, 142, 42, upgradeLabel, 0x315c45, () => {
      if (nextUpgradeCost === null) {
        this.updateHud(`${definition.name} est déjà au niveau maximal`);
        return;
      }
      this.upgradeTower(tower);
      this.showTowerActions(tower);
    });
    const deleteButton = this.makeButton(78, -24, 142, 42, `SUPPRIMER · +${refund}`, 0x6b2926, () => {
      this.removeTower(tower);
    });
    const priorityNames: Record<TargetPriority, string> = { first: "PREMIER", strong: "PLUS FORT", weak: "PLUS FAIBLE" };
    const priorityButton = this.makeButton(0, 31, 298, 34, `CIBLE : ${priorityNames[tower.priority]}`, 0x38483f, () => {
      tower.priority = tower.priority === "first" ? "strong" : tower.priority === "strong" ? "weak" : "first";
      this.showTowerActions(tower);
    });
    panel.add([background, upgradeButton, deleteButton, priorityButton]);
    this.towerActionPanel = panel;
    this.updateHud(`${definition.name} niveau ${tower.level} — valeur investie : ${tower.investedCost} pièces`);
  }

  private removeTower(tower: Tower): void {
    const index = this.towers.indexOf(tower);
    if (index === -1) return;
    const refund = Math.floor(tower.investedCost / 2);
    const name = TOWERS[tower.kind].name;
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
    return this.wave % 2 === 1;
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
    const approximateCol = Phaser.Math.Clamp(Math.round((enemy.body.x - GRID_X) / CELL), 0, GRID_COLS - 1);
    const approximateRow = Phaser.Math.Clamp(Math.round((enemy.body.y - GRID_Y) / CELL), 0, GRID_ROWS - 1);
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
        GRID_X + a.col * CELL,
        GRID_Y + a.row * CELL,
      );
      const distanceB = Phaser.Math.Distance.Squared(
        enemy.body.x,
        enemy.body.y,
        GRID_X + b.col * CELL,
        GRID_Y + b.row * CELL,
      );
      return distanceA - distanceB;
    });

    for (const start of candidates) {
      const path = this.calculatePath(start, { col: enemy.exitCol, row: enemy.exitRow });
      if (!path) continue;
      enemy.path = [
        new Phaser.Math.Vector2(enemy.body.x, enemy.body.y),
        ...path,
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
        return cells.reverse().map((cell) => new Phaser.Math.Vector2(GRID_X + cell.col * CELL, GRID_Y + cell.row * CELL));
      }

      for (const direction of directions) {
        const next = { col: current.col + direction.col, row: current.row + direction.row };
        const nextKey = key(next.col, next.row);
        if (next.col < 0 || next.col >= GRID_COLS || next.row < 0 || next.row >= GRID_ROWS) continue;
        if (blocked.has(nextKey)) continue;

        let scentStrength = 0;
        attractors.forEach((tower) => {
          const distance = Math.abs(next.col - tower.col) + Math.abs(next.row - tower.row);
          if (distance === 1) scentStrength += 0.34;
          else if (distance === 2) scentStrength += 0.14;
          else if (distance === 3) scentStrength += 0.05;
        });
        const movementCost = Math.max(0.38, 1 - scentStrength);
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
    this.autoWaveText.setText("");
    this.setStartButtonEnabled(false);
    const overlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x022c2b, 0.82);
    const title = this.add.text(WIDTH / 2, HEIGHT / 2 - 70, "20 INSECTES SE SONT ÉCHAPPÉS", {
      fontFamily: "Arial",
      fontSize: "42px",
      color: "#fb7185",
      fontStyle: "bold",
    }).setOrigin(0.5);
    const retry = this.makeButton(WIDTH / 2, HEIGHT / 2 + 15, 210, 48, "RECOMMENCER", 0x0f766e, () => this.scene.restart({ levelIndex: this.levelIndex }));
    const menu = this.makeButton(WIDTH / 2, HEIGHT / 2 + 78, 210, 42, "CHOIX DU BIOME", 0x334155, () => this.scene.restart());
    overlay.setDepth(20);
    title.setDepth(21);
    retry.setDepth(21);
    menu.setDepth(21);
  }

  private updateHud(message: string): void {
    this.hpText?.setText(`VIES ${this.baseHp} / 20`);
    this.energyText?.setText(`PIÈCES ${this.energy}`);
    this.waveText?.setText(this.waveActive ? "MENACE ACTIVE" : "MENACE EN ATTENTE");
    this.statusText?.setText(message).setVisible(message.length > 0);
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
      fontSize: "16px",
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
