export type RoutePoint = { x: number; y: number };
export type GridPoint = { col: number; row: number };
export type PlantPosition = { body: { x: number; y: number } };

export type GridGeometry = {
  cell: number;
  originX: number;
  originY: number;
  columns: number;
  rows: number;
  plantHalfSize: number;
};

export type SafeGridWaypoint = GridPoint & RoutePoint & {
  pathIndex: number;
};

export type ExitChoice<Id extends string = string> = GridPoint & RoutePoint & {
  id: Id;
};

export type ReroutePlan<Id extends string = string> = {
  waypoint: SafeGridWaypoint;
  exit: ExitChoice<Id>;
  route: RoutePoint[];
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * Returns previous path waypoints that are exact grid points and are not inside
 * a plant. The order is nearest previous waypoint first, then older waypoints.
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

/** Keeps the current exit first while preserving the fallback exit order. */
export function orderExitChoices<Id extends string>(
  preferredId: Id,
  exits: readonly ExitChoice<Id>[],
): ExitChoice<Id>[] {
  return [
    ...exits.filter((exit) => exit.id === preferredId),
    ...exits.filter((exit) => exit.id !== preferredId),
  ];
}

/**
 * Selects the first reachable pair using the exact existing priority:
 * nearest previous safe waypoint first, preferred exit before fallback exit.
 * It does not mutate the enemy or the scene.
 */
export function findFirstReachableReroute<Id extends string>(
  safeWaypoints: readonly SafeGridWaypoint[],
  exits: readonly ExitChoice<Id>[],
  calculatePath: (from: GridPoint, to: GridPoint) => readonly RoutePoint[] | null,
): ReroutePlan<Id> | null {
  for (const waypoint of safeWaypoints) {
    for (const exit of exits) {
      const route = calculatePath(
        { col: waypoint.col, row: waypoint.row },
        { col: exit.col, row: exit.row },
      );
      if (!route) continue;

      return {
        waypoint,
        exit,
        route: [...route],
      };
    }
  }

  return null;
}
