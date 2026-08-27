import Phaser from "phaser";

type Placement = { x: number; y: number };
type RuntimeTower = { body: { x: number; y: number } };
type PlacementResult = { allowed: boolean; reason: string };
type RuntimeDefenseScene = Phaser.Scene & {
  towers: RuntimeTower[];
  checkTowerPlacement: (placement: Placement, kind: string) => PlacementResult;
  __chelieStaggeredPlacementPatch?: boolean;
};

const PLANT_FRAME_SIZE = 43;
const PLANT_HALF_STEP = PLANT_FRAME_SIZE / 2;

function installStaggeredPlacementPatch(): boolean {
  const games = (Phaser as unknown as { GAMES?: Phaser.Game[] }).GAMES ?? [];
  const game = games[0];
  if (!game) return false;

  let scene: RuntimeDefenseScene | undefined;
  try {
    scene = game.scene.getScene("defense") as RuntimeDefenseScene | undefined;
  } catch {
    return false;
  }

  if (!scene || typeof scene.checkTowerPlacement !== "function") return false;
  if (scene.__chelieStaggeredPlacementPatch) return true;

  const originalCheck = scene.checkTowerPlacement;

  scene.checkTowerPlacement = function (placement: Placement, kind: string): PlacementResult {
    const realTowers = this.towers;
    const occupied = realTowers.some((tower) => {
      const deltaX = Math.abs(tower.body.x - placement.x);
      const deltaY = Math.abs(tower.body.y - placement.y);
      const axisTolerance = PLANT_HALF_STEP * 0.75;
      const fullSpacing = PLANT_FRAME_SIZE - 1;

      // Un demi-pas sur un seul axe ferait réellement chevaucher deux plantes.
      // Un demi-pas sur les deux axes correspond en revanche au quinconce voulu
      // et doit être possible aussi bien vers la droite que vers la gauche.
      const tooCloseOnSameColumn = deltaX < axisTolerance && deltaY < fullSpacing;
      const tooCloseOnSameRow = deltaY < axisTolerance && deltaX < fullSpacing;
      return tooCloseOnSameColumn || tooCloseOnSameRow;
    });

    // La méthode d'origine contient déjà toutes les validations de terrain,
    // d'argent et surtout de chemin. On ne remplace que son premier test
    // d'occupation afin de conserver exactement le pathfinding existant.
    const towersForCheck = new Proxy(realTowers, {
      get(target, property, receiver) {
        if (property === "some") return () => occupied;
        const value = Reflect.get(target, property, receiver);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });

    this.towers = towersForCheck;
    try {
      return originalCheck.call(this, placement, kind);
    } finally {
      this.towers = realTowers;
    }
  };

  scene.__chelieStaggeredPlacementPatch = true;
  return true;
}

if (!installStaggeredPlacementPatch()) {
  const timer = window.setInterval(() => {
    if (installStaggeredPlacementPatch()) window.clearInterval(timer);
  }, 50);
  window.setTimeout(() => window.clearInterval(timer), 5000);
}
