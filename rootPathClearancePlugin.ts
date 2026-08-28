import type { Plugin } from "vite";

export function relaxRootPathClearance(): Plugin {
  return {
    name: "relax-root-path-clearance",
    enforce: "post",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      // Les racines restent interdites pour la pose d'une plante. Ici on retire
      // uniquement la marge invisible de 5 px utilisée par le pathfinding.
      // Cette marge pouvait faire croire qu'un corridor encore visible était fermé.
      const transformed = code.replaceAll(
        "const clearance = root.radius + 5;",
        "const clearance = root.radius;",
      );

      if (transformed === code) return null;
      return { code: transformed, map: null };
    },
  };
}
