import type { Plugin } from "vite";

/** Pure display-only wave counter: VAGUE 1/20, or VAGUE 1/∞ in infinite mode. */
export function waveCounterDisplay(): Plugin {
  return {
    name: "wave-counter-display",
    enforce: "post",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      let transformed = code;

      transformed = transformed.replace(
        'this.waveText = this.createCompactHudBadge(360, statsY, 212, "VAGUE 1", 0x58322e, "#f4d7c9");',
        'this.waveText = this.createCompactHudBadge(360, statsY, 212, `VAGUE 1/${LEVELS[this.levelIndex].waves ?? "∞"}`, 0x58322e, "#f4d7c9");',
      );

      transformed = transformed.replace(
        '    this.waveText?.setText(`VAGUE ${Math.max(1, this.wave)}`);',
        '    this.waveText?.setText(`VAGUE ${Math.max(1, this.wave)}/${this.getActiveLevel().waves ?? "∞"}`);',
      );

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
