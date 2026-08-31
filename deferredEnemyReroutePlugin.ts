import type { Plugin } from "vite";
import {
  FIELD_ANCHOR,
  FIELD_REPLACEMENT,
  FOLLOW_PATH_ANCHOR,
  FOLLOW_PATH_REPLACEMENT,
  IMPORT_ANCHOR,
  IMPORT_REPLACEMENT,
  RECALCULATE_ALL_ANCHOR,
  RECALCULATE_ALL_REPLACEMENT,
} from "./enemyRerouteTransform";

type Replacement = {
  label: string;
  anchor: string;
  replacement: string;
};

const REROUTE_BLOCKED_ANCHOR = `    const halfPlant = PLANT_FRAME_SIZE / 2 - 1;
    const blocked = this.towers.some((tower) =>
      Math.abs(gridX - tower.body.x) < halfPlant
      && Math.abs(gridY - tower.body.y) < halfPlant,
    );
    if (blocked) return false;`;

const REROUTE_BLOCKED_REPLACEMENT = `    const blockedCells = this.getBlockedPathCells();
    if (blockedCells.has(col + "," + row)) return false;`;

const PASS_THROUGH_FINISH_ANCHOR = `  private finishPlacementPassThroughAtWaypoint(enemy: Enemy): boolean {
    const plants = this.placementPassThroughPlants.get(enemy);
    if (!plants || plants.length === 0) return false;

    const halfPlant = PLANT_FRAME_SIZE / 2 - 1;
    const remaining = plants.filter((plant) =>
      isPointInsidePlant(enemy.body.x, enemy.body.y, plant, halfPlant),
    );

    if (remaining.length > 0) {
      this.placementPassThroughPlants.set(enemy, remaining);
      return true;
    }

    this.placementPassThroughPlants.delete(enemy);
    if (this.pendingEnemyReroutes.has(enemy) && !this.retreatingEnemyReroutes.has(enemy)) {
      this.rerouteEnemyAtCurrentWaypoint(enemy);
    }
    return true;
  }`;

const PASS_THROUGH_FINISH_REPLACEMENT = `  private finishPlacementPassThroughAtWaypoint(enemy: Enemy): boolean {
    const plants = this.placementPassThroughPlants.get(enemy);
    if (!plants || plants.length === 0) return false;

    const row = Phaser.Math.Clamp(Math.round((enemy.body.y - GRID_Y) / CELL), 0, GRID_ROWS - 1);
    const col = Phaser.Math.Clamp(Math.round((enemy.body.x - GRID_X) / CELL), 0, GRID_COLS - 1);
    const blockedCells = this.getBlockedPathCells();

    // Tant que le waypoint appartient encore à une cellule réellement bloquée,
    // l'ennemi termine seulement le segment déjà engagé vers l'avant.
    if (blockedCells.has(col + "," + row)) return true;

    // Dès qu'un waypoint est réellement libre, l'ancien chemin ne peut être
    // abandonné qu'après obtention d'une nouvelle route valide. Si ce point
    // libre n'est pas encore connecté à une sortie, on garde l'évacuation
    // active et on retente au waypoint suivant au lieu de reprendre
    // silencieusement l'ancien trajet.
    if (this.pendingEnemyReroutes.has(enemy) && !this.retreatingEnemyReroutes.has(enemy)) {
      if (this.rerouteEnemyAtCurrentWaypoint(enemy)) return true;
    }

    return true;
  }`;

const FORWARD_PASS_THROUGH_ANCHOR = `    const movementBlocked = isEnemyMovementBlocked(
      enemy.body.x,
      enemy.body.y,
      nextX,
      nextY,
      this.towers,
      halfPlant,
      this.retreatingEnemyReroutes.has(enemy),
      passThroughPlants,
    );

    if (movementBlocked) {`;

const FORWARD_PASS_THROUGH_REPLACEMENT = `    let movementBlocked = isEnemyMovementBlocked(
      enemy.body.x,
      enemy.body.y,
      nextX,
      nextY,
      this.towers,
      halfPlant,
      this.retreatingEnemyReroutes.has(enemy),
      passThroughPlants,
    );

    if (movementBlocked
      && this.pendingEnemyReroutes.has(enemy)
      && !this.retreatingEnemyReroutes.has(enemy)) {
      // Le passage exceptionnel ne peut concerner que la toute dernière
      // plante posée, jamais une ancienne plante rencontrée plus loin.
      const newestTower = this.towers[this.towers.length - 1];
      const engagedBlockingPlant = newestTower
        && isEnemyMovementBlocked(
          enemy.body.x,
          enemy.body.y,
          target.x,
          target.y,
          [newestTower],
          halfPlant,
        )
        ? newestTower
        : undefined;

      if (engagedBlockingPlant) {
        const blockedByAnotherPlant = isEnemyMovementBlocked(
          enemy.body.x,
          enemy.body.y,
          nextX,
          nextY,
          this.towers.filter((tower) => tower !== engagedBlockingPlant),
          halfPlant,
          false,
          passThroughPlants,
        );

        if (!blockedByAnotherPlant) {
          const currentPlants = this.placementPassThroughPlants.get(enemy) ?? [];
          if (!currentPlants.includes(engagedBlockingPlant)) {
            this.placementPassThroughPlants.set(enemy, [...currentPlants, engagedBlockingPlant]);
          }
          movementBlocked = false;
        }
      }
    }

    if (movementBlocked) {`;

const REPLACEMENTS: Replacement[] = [
  { label: "import", anchor: IMPORT_ANCHOR, replacement: IMPORT_REPLACEMENT },
  { label: "field", anchor: FIELD_ANCHOR, replacement: FIELD_REPLACEMENT },
  { label: "followPath", anchor: FOLLOW_PATH_ANCHOR, replacement: FOLLOW_PATH_REPLACEMENT },
  { label: "reroute-grid-blocked", anchor: REROUTE_BLOCKED_ANCHOR, replacement: REROUTE_BLOCKED_REPLACEMENT },
  { label: "pass-through-finish", anchor: PASS_THROUGH_FINISH_ANCHOR, replacement: PASS_THROUGH_FINISH_REPLACEMENT },
  { label: "forward-pass-through", anchor: FORWARD_PASS_THROUGH_ANCHOR, replacement: FORWARD_PASS_THROUGH_REPLACEMENT },
  { label: "batch", anchor: RECALCULATE_ALL_ANCHOR, replacement: RECALCULATE_ALL_REPLACEMENT },
];

function applyRequiredReplacement(code: string, change: Replacement): string {
  if (!code.includes(change.anchor)) {
    throw new Error(`Deferred reroute ${change.label} anchor not found.`);
  }
  return code.replace(change.anchor, change.replacement);
}

/**
 * Thin compatibility layer while the scene remains in src/main.ts.
 * Runtime navigation rules live in src/game; this file only wires them in.
 */
export function deferredEnemyReroute(): Plugin {
  return {
    name: "deferred-enemy-reroute",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const transformed = REPLACEMENTS.reduce(applyRequiredReplacement, code);
      return { code: transformed, map: null };
    },
  };
}
