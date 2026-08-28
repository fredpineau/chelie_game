import type { Plugin } from "vite";

export function fixSimplifiedHomeLayering(): Plugin {
  return {
    name: "fix-simplified-home-layering",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts") || !code.includes('  private showPermanentGreenhouse(): void {')) return null;

      let transformed = code;
      const cardsAnchor = '    const masteryKinds = Object.keys(TOWERS) as TowerKind[];';
      transformed = transformed.replace(
        cardsAnchor,
        '    greenhouse.add([veil, panel, title, balance, explanation, rewardHint, costCurve]);\n\n' + cardsAnchor,
      );
      transformed = transformed.replace(
        '    greenhouse.add([veil, panel, title, balance, explanation, rewardHint, costCurve, close]);',
        '    greenhouse.add(close);',
      );
      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
