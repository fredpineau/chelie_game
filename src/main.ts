import Phaser from "phaser";
import "./style.css";

class HomeScene extends Phaser.Scene {
  constructor() {
    super("home");
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 30, "Bienvenue dans mon jeu", {
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
        fontSize: "58px",
        color: "#ffffff",
        align: "center",
        fontStyle: "bold",
        wordWrap: { width: Math.min(width - 48, 760) },
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 55, "L’aventure commence bientôt…", {
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
        fontSize: "24px",
        color: "#cbd5e1",
        align: "center",
      })
      .setOrigin(0.5);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: 1280,
  height: 720,
  backgroundColor: "#111827",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: HomeScene,
});
