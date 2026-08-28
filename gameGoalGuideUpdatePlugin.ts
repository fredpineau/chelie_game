import type { Plugin } from "vite";

export function updateGameGoalGuide(): Plugin {
  return {
    name: "update-game-goal-guide",
    enforce: "post",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      let transformed = code;

      transformed = transformed.replace(
        '      "GOUTTES PERMANENTES",\n      "Dans les biomes, chaque récompense de vague ne peut être obtenue qu’une fois : revenir permet seulement de gagner les bonus parfaits encore manquants. Le mode infini reste une source renouvelable de gouttes.",',
        '      "GOUTTES ET SERRE",\n      "Une vague réussie rapporte 1 💧 la première fois, jusqu’à 2 💧 si elle est parfaite et jusqu’à 3 💧 pour un boss parfait. Les bonus déjà gagnés dans les mondes finis ne sont pas redonnés. Le bouton SERRE sur la map permet de dépenser ces gouttes pour améliorer définitivement chaque famille de plantes (15 → 30 → 60 → 100 → 150 💧). Le mode infini reste une source renouvelable de gouttes.",',
      );

      transformed = transformed.replace(
        '      "Affrontez des insectes terrestres, volants, rapides, blindés, régénérateurs et des boss Alpha. Racines, tourbe, spores, glu, parasites et zones fertiles modifient votre stratégie.",',
        '      "Affrontez des insectes terrestres, volants, rapides, blindés, régénérateurs et des boss Alpha. Racines, spores, glu, parasites et zones fertiles modifient votre stratégie. Dans les mondes avancés, les traits ennemis se combinent davantage.",',
      );

      transformed = transformed.replace(
        '      "Traversez 11 biomes classiques de plus en plus difficiles, améliorez durablement les quatre plantes, puis survivez le plus longtemps possible dans les modes infinis.",',
        '      "Traversez 15 mondes de difficulté croissante. Les derniers biomes introduisent des essaims hybrides, des Alphas plus fréquents et des ennemis plus dangereux. Renforcez durablement vos quatre familles de plantes dans la Serre permanente, puis tentez de survivre le plus longtemps possible dans les modes infinis.",',
      );

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
