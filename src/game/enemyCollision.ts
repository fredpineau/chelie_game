import Phaser from "phaser";

export type PlantLike = {
  body: {
    x: number;
    y: number;
  };
};

/**
 * Returns true when the proposed movement would enter/cross a plant.
 * If the enemy is already inside a newly placed plant, only movement that
 * strictly increases its distance from that plant is allowed so it can escape
 * instead of remaining trapped underneath it.
 */
export function isEnemyMovementBlocked(
  currentX: number,
  currentY: number,
  nextX: number,
  nextY: number,
  towers: readonly PlantLike[],
  halfPlant: number,
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
