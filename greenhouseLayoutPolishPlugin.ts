import type { Plugin } from "vite";

export function polishGreenhouseLayout(): Plugin {
  return {
    name: "polish-greenhouse-layout",
    enforce: "post",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      let transformed = code;

      transformed = transformed.replace(
        'const panel = this.add.rectangle(WIDTH / 2, HEIGHT / 2 + 18, 650, 920, 0x245d68, 0.995)',
        'const panel = this.add.rectangle(WIDTH / 2, HEIGHT / 2 + 34, 650, 920, 0x245d68, 0.995)',
      );
      transformed = transformed.replace('WIDTH / 2, 168, "SERRE PERMANENTE"', 'WIDTH / 2, 184, "SERRE PERMANENTE"');

      // Garde la ligne RÉSERVE lisible et centrée.
      transformed = transformed.replace(
        /`RÉSERVE\s*·\s*💧\s*\$\{this\.wateringCans\}`/,
        '`RÉSERVE    ·    💧 ${this.wateringCans}`',
      );
      transformed = transformed.replace('WIDTH / 2, 223, `RÉSERVE', 'WIDTH / 2, 241, `RÉSERVE');

      // Ajoute un vrai espace vertical sous RÉSERVE puis décale tout le contenu
      // inférieur du même montant afin de conserver les espacements du bloc.
      transformed = transformed.replace('WIDTH / 2, 315,\n      "Les gouttes améliorent', 'WIDTH / 2, 360,\n      "Les gouttes améliorent');
      transformed = transformed.replace('fontFamily: "Arial", fontSize: "22px", color: "#edf8f7"', 'fontFamily: "Arial", fontSize: "24px", color: "#edf8f7"');

      transformed = transformed.replace('WIDTH / 2, 405,\n      "1re réussite', 'WIDTH / 2, 460,\n      "1re réussite');

      // Applique la couleur cyan claire de la ligne RÉSERVE à toute la ligne
      // « 1re réussite… » afin que le changement soit réellement visible et
      // indépendant des transformations précédentes.
      transformed = transformed.replace(
        /(const rewardHint = this\.add\.text\([\s\S]*?\{\s*\n\s*fontFamily: "Arial", fontSize: ")[^"]+("\s*, color: ")[^"]+("\s*, fontStyle: "bold")/,
        '$124px$2#bff5fb$3',
      );

      transformed = transformed.replace('WIDTH / 2, 458, "COÛTS PAR PLANTE', 'WIDTH / 2, 520, "COÛTS PAR PLANTE');
      transformed = transformed.replace('fontFamily: "Arial", fontSize: "18px", color: "#ffe7a3"', 'fontFamily: "Arial", fontSize: "19px", color: "#ffe7a3"');
      transformed = transformed.replace('const y = 598 + row * 190;', 'const y = 660 + row * 190;');
      transformed = transformed.replace('const name = this.add.text(42, -46, TOWERS[kind].name.toUpperCase()', 'const name = this.add.text(30, -46, TOWERS[kind].name.toUpperCase()');
      transformed = transformed.replace('const level = this.add.text(42, -10, `NIV. ${mastery}/5`', 'const level = this.add.text(24, -10, `NIV. ${mastery}/5`');
      transformed = transformed.replace('const action = this.makeButton(42, 45, 186, 44, actionLabel', 'const action = this.makeButton(24, 45, 202, 44, actionLabel');
      transformed = transformed.replace('const close = this.makeButton(WIDTH / 2, 1035, 300, 58, "FERMER"', 'const close = this.makeButton(WIDTH / 2, 1094, 300, 58, "FERMER"');

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
