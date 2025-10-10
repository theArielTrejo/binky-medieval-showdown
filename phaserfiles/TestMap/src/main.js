import Start from "./scenes/GameScence.js";

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,     // use full window width
  height: window.innerHeight,   // use full window height
  pixelArt: true,      // important for crisp tiles
  roundPixels: true,   // prevents sub-pixel rendering
  physics: {
    default: "arcade",
    arcade: {
      debug: true,   // set to false if you don’t want the purple collision boxes
      gravity: { y: 0 }
    }
  },
  scene: [Start],    // we only need GameScence now
};

new Phaser.Game(config);
