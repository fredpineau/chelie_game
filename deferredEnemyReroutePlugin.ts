import type { Plugin } from "vite";
import {
  FIELD_ANCHOR,
  FIELD_REPLACEMENT,
  FOLLOW_PATH_ANCHOR,
  FOLLOW_PATH_REPLACEMENT,
  RECALCULATE_ALL_ANCHOR,
  RECALCULATE_ALL_REPLACEMENT,
} from "./enemyRerouteTransform";

/**
 * Applies the enemy reroute transformation to src/main.ts.
 * The runtime logic itself lives in enemyRerouteTransform.ts so this plugin
 * stays small and easy to review.
 */
export function deferredEnemyReroute(): Plugin {
  return {
    name: "deferred-enemy-reroute",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      if (!code.includes(FIELD_ANCHOR)) {
        throw new Error("Deferred reroute field anchor not found.");
      }
      if (!code.includes(FOLLOW_PATH_ANCHOR)) {
        throw new Error("Deferred reroute followPath anchor not found.");
      }
      if (!code.includes(RECALCULATE_ALL_ANCHOR)) {
        throw new Error("Deferred reroute batch anchor not found.");
      }

      let transformed = code.replace(FIELD_ANCHOR, FIELD_REPLACEMENT);
      transformed = transformed.replace(FOLLOW_PATH_ANCHOR, FOLLOW_PATH_REPLACEMENT);
      transformed = transformed.replace(RECALCULATE_ALL_ANCHOR, RECALCULATE_ALL_REPLACEMENT);

      return { code: transformed, map: null };
    },
  };
}
