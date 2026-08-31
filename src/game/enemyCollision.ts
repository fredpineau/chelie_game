import Phaser from "phaser";

export type PlantLike = {
  body: {
    x: number;
    y: number;
  };
};

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

    return currentInside || nextInside || Phaser.Geom.Intersects.LineToRectangle(movement, rect);
  });
}
