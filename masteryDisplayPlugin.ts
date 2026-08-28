import type { Plugin } from "vite";

export function clearMasteryDisplay(): Plugin {
  return {
    name: "clear-mastery-display",
    enforce: "post",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      let transformed = code;

      transformed = transformed.replace(
        '    this.add.text(homeCenterX, 994, "Touchez une plante pour l\'arroser durablement", {',
        '    this.add.text(homeCenterX, 994, "Chaque plante : 15 → 30 → 60 → 100 → 150 💧", {',
      );

      transformed = transformed.replace(
        '      const costText = this.add.text(0, 55, cost === null ? "MAX" : `💧 ${cost}`, {\n        fontFamily: "Arial",\n        fontSize: "21px",\n        color: cost === null ? "#ffe89a" : this.wateringCans >= cost ? "#e6fbff" : "#86aeb3",\n        fontStyle: "bold",\n        stroke: "#173943",\n        strokeThickness: 2,\n      }).setOrigin(0.5);',
        '      const masteryLabel = cost === null\n        ? `NIV. ${mastery}/5\\nMAX`\n        : `NIV. ${mastery}/5 → ${mastery + 1}/5\\nPROCHAIN · 💧 ${cost}`;\n      const costText = this.add.text(0, 55, masteryLabel, {\n        fontFamily: "Arial",\n        fontSize: "16px",\n        color: cost === null ? "#ffe89a" : this.wateringCans >= cost ? "#e6fbff" : "#86aeb3",\n        fontStyle: "bold",\n        align: "center",\n        lineSpacing: 3,\n        stroke: "#173943",\n        strokeThickness: 2,\n      }).setOrigin(0.5);',
      );

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
