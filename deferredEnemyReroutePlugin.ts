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
      const engagedBlockingPlant = this.towers.find((tower) =>
        isEnemyMovementBlocked(
          enemy.body.x,
          enemy.body.y,
          target.x,
          target.y,
          [tower],
          halfPlant,
        ),
      );

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
