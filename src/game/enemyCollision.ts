import Phaser from "phaser";

export type PlantLike = {
  body: {
    x: number;
    y: number;
  };
};

export function isPointInsidePlant(
  x: number,
  y: number,
  plant: PlantLike,
  halfPlant: number,
): boolean {
  return Math.abs(x - plant.body.x) < halfPlant
    && Math.abs(y - plant.body.y) < halfPlant;
}

export function isEnemyInsidePlant(
  x: number,
  y: number,
  towers: readonly PlantLike[],
  halfPlant: number,
): boolean {
  return towers.some((tower) => isPointInsidePlant(x, y, tower, halfPlant));
}

/**
 * Returns true when the proposed movement would enter/cross a plant.
 * During a controlled retreat, an enemy that is already inside a newly placed
 * plant may keep following its historical path until it leaves that plant.
 * ignoredPlants are used only for the exact plants that were placed on an
 * already-engaged enemy segment; every other plant remains strictly blocking.
 */
export function isEnemyMovementBlocked(
  currentX: number,
  currentY: number,
  nextX: number,
  nextY: number,
  towers: readonly PlantLike[],
  halfPlant: number,
  allowRetreatFromInside = false,
  ignoredPlants: readonly PlantLike[] = [],
): boolean {
  const movement = new Phaser.Geom.Line(currentX, currentY, nextX, nextY);

  return towers.some((tower) => {
    if (ignoredPlants.includes(tower)) return false;

    const rect = new Phaser.Geom.Rectangle(
      tower.body.x - halfPlant,
      tower.body.y - halfPlant,
      halfPlant * 2,
      halfPlant * 2,
    );
    const currentInside = isPointInsidePlant(currentX, currentY, tower, halfPlant);
    const nextInside = isPointInsidePlant(nextX, nextY, tower, halfPlant);

    if (currentInside && allowRetreatFromInside) return false;

    if (currentInside) {
      const currentDx = currentX - tower.body.x;
      const currentDy = currentY - tower.body.y;
      const nextDx = nextX - tower.body.x;
      const nextDy = nextY - tower.body.y;
      const currentDistance = (currentDx * currentDx) + (currentDy * currentDy);
      const nextDistance = (nextDx * nextDx) + (nextDy * nextDy);

      return nextInside && nextDistance <= currentDistance;
    }

    return nextInside || Phaser.Geom.Intersects.LineToRectangle(movement, rect);
  });
}
