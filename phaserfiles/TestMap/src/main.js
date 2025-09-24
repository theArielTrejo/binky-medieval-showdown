import Start from "./scenes/GameScence.js";

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: "arcade",
    arcade: { debug: true }
  },
  scene: [Start]
};

new Phaser.Game(config);
