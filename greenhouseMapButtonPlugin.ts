import type { Plugin } from "vite";

export function greenhouseMapButton(): Plugin {
  return {
    name: "greenhouse-map-button",
    enforce: "post",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const anchor = '    pauseButton.on("pointerdown", () => this.showGameMenu());';
      if (!code.includes(anchor)) {
        throw new Error("Pause button anchor not found; greenhouse map button was not applied.");
      }

      let transformed = code.replace(
        "const attackButton = this.add.container(WIDTH / 2 - 25, HEIGHT - 42);",
        "const attackButton = this.add.container(WIDTH / 2, HEIGHT - 42);",
      );

      const greenhouseButton = `

    // Accès rapide à la serre permanente depuis la carte.
    // Ce bloc est volontairement limité au HUD : aucune logique de placement
    // ou de pathfinding n'est modifiée.
    const greenhouseButton = this.add.container(77, HEIGHT - 42);
    const greenhouseShadow = this.add.graphics();
    greenhouseShadow.fillStyle(0x071a20, 0.42);
    greenhouseShadow.fillRoundedRect(-66, -31, 132, 68, 18);
    const greenhouseBackground = this.add.graphics();
    greenhouseBackground.fillStyle(0x315c45, 1);
    greenhouseBackground.fillRoundedRect(-64, -34, 128, 68, 18);
    greenhouseBackground.lineStyle(3, 0x9bd6a8, 1);
    greenhouseBackground.strokeRoundedRect(-64, -34, 128, 68, 18);
    greenhouseBackground.lineStyle(1, 0xe1f7e6, 0.35);
    greenhouseBackground.strokeRoundedRect(-57, -27, 114, 54, 14);
    const greenhouseIcon = this.add.text(-36, 0, "♣", {
      fontFamily: "Arial", fontSize: "24px", color: "#dcfce7", fontStyle: "bold",
    }).setOrigin(0.5);
    const greenhouseText = this.add.text(18, 0, "SERRE", {
      fontFamily: "Arial", fontSize: "17px", color: "#f0fff4", fontStyle: "bold",
      stroke: "#173b28", strokeThickness: 3,
    }).setOrigin(0.5);
    greenhouseButton.add([greenhouseShadow, greenhouseBackground, greenhouseIcon, greenhouseText]);
    greenhouseButton.setSize(144, 76).setInteractive({ useHandCursor: true });
    greenhouseButton.on("pointerover", () => greenhouseButton.setScale(1.04));
    greenhouseButton.on("pointerout", () => greenhouseButton.setScale(1));
    greenhouseButton.on("pointerdown", () => this.showWateringGuide());`;

      transformed = transformed.replace(anchor, anchor + greenhouseButton);
      return { code: transformed, map: null };
    },
  };
}
