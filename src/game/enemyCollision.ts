import Phaser from "phaser";

export type PlantLike = {
  body: {
    x: number;
    y: number;
  };
};

export function isEnemyInsidePlant(
  x: number,
  y: number,
  towers: readonly PlantLike[],
  halfPlant: number,
): boolean {
  return towers.some((tower) =>
    Math.abs(x - tower.body.x) < halfPlant
    && Math.abs(y - tower.body.y) < halfPlant,
  );
}

/**
 * Returns true when the proposed movement would enter/cross a plant.
 * During a controlled retreat, an enemy that is already inside a newly placed
 * plant may keep following its historical path until it leaves that plant.
 */
export function isEnemyMovementBlocked(
  currentX: number,
  currentY: number,
  nextX: number,
  nextY: number,
  towers: readonly PlantLike[],
  halfPlant: number,
  allowRetreatFromInside = false,
): boolean {
  const movement = new Phaser.Geom.Line(currentX, currentY, nextX, nextY);

  return towers.some((tower) => {
    const rect = new Phaser.Geom.Rectangle(
      tower.body.x - halfPlant,
      tower.body.y - halfPlant,
      halfPlant * 2,
      halfPlant * 2,
    );
    const currentInside = Math.abs(currentX - tower.body.x) < halfPlant
      && Math.abs(currentY - tower.body.y) < halfPlant;
    const nextInside = Math.abs(nextX - tower.body.x) < halfPlant
      && Math.abs(nextY - tower.body.y) < halfPlant;

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
