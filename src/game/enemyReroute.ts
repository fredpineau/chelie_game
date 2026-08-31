export type RoutePoint = { x: number; y: number };
export type PlantPosition = { body: { x: number; y: number } };

export type GridGeometry = {
  cell: number;
  originX: number;
  originY: number;
  columns: number;
  rows: number;
  plantHalfSize: number;
};

export type SafeGridWaypoint = {
  pathIndex: number;
  col: number;
  row: number;
  x: number;
  y: number;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * Returns previous path waypoints that are exact grid points and are not inside
 * a plant. The order is preserved from nearest previous waypoint to oldest.
 * Route selection remains the caller's responsibility.
 */
export function getPreviousSafeGridWaypoints(
  path: readonly RoutePoint[],
  pathIndex: number,
  plants: readonly PlantPosition[],
  geometry: GridGeometry,
  gridToWorld: (col: number, row: number) => RoutePoint,
): SafeGridWaypoint[] {
  const result: SafeGridWaypoint[] = [];
  const startIndex = Math.min(pathIndex - 1, path.length - 1);

  for (let index = startIndex; index >= 0; index -= 1) {
    const waypoint = path[index];
    const row = clamp(
      Math.round((waypoint.y - geometry.originY) / geometry.cell),
      0,
      geometry.rows - 1,
    );
    const col = clamp(
      Math.round((waypoint.x - geometry.originX) / geometry.cell),
      0,
      geometry.columns - 1,
    );
    const world = gridToWorld(col, row);
    const dx = waypoint.x - world.x;
    const dy = waypoint.y - world.y;
    if ((dx * dx) + (dy * dy) > 4) continue;

    const blocked = plants.some((plant) =>
      Math.abs(world.x - plant.body.x) < geometry.plantHalfSize
      && Math.abs(world.y - plant.body.y) < geometry.plantHalfSize,
    );
    if (blocked) continue;

    result.push({ pathIndex: index, col, row, x: world.x, y: world.y });
  }

  return result;
}
