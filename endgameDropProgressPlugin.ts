import type { Plugin } from "vite";

export function endgameDropProgress(): Plugin {
  return {
    name: "endgame-drop-progress",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const oldLine = '      const maxDrops = level.waves === null ? null : level.waves * 2 + Math.floor(level.waves / 5);';
      const newLines = [
        '      const bossIntervalForDrops = index === 13 || index === 14 ? 4 : 5;',
        '      const maxDrops = level.waves === null ? null : level.waves * 2 + Math.floor(level.waves / bossIntervalForDrops);',
      ].join("\n");

      if (!code.includes(oldLine)) return null;
      return { code: code.replace(oldLine, newLines), map: null };
    },
  };
}
