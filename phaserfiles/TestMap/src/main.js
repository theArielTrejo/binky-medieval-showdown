import Start from "./scenes/GameScence.js";

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  pixelArt: true,      // important for crisp tiles
  roundPixels: true,   // prevents sub-pixel rendering
  physics: {
    default: "arcade",
    arcade: {
      debug: true,   // set to false if you don’t want the purple collision boxes
    }
  },
  scene: [Start],    // we only need GameScence now
};

new Phaser.Game(config);
