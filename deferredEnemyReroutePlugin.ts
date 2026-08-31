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

const REPLACEMENTS: Replacement[] = [
  { label: "import", anchor: IMPORT_ANCHOR, replacement: IMPORT_REPLACEMENT },
  { label: "field", anchor: FIELD_ANCHOR, replacement: FIELD_REPLACEMENT },
  { label: "followPath", anchor: FOLLOW_PATH_ANCHOR, replacement: FOLLOW_PATH_REPLACEMENT },
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
