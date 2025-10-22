import { Game as MainGame } from './scenes/Game';
import { AUTO, Game, Types } from 'phaser';

// Full-window configuration
const config: Types.Core.GameConfig = {
  type: AUTO,
  width: window.innerWidth,      // full browser width
  height: window.innerHeight,    // full browser height
  pixelArt: true,                // crisp pixel rendering
  roundPixels: true,
  backgroundColor: '#000000',    // black background
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x:0, y: 0 },
      debug: true,               // shows collision boxes
    },
  },
  scene: [MainGame],
};

// Export StartGame function (so index.ts can call StartGame('game-container'))
const StartGame = (parent: string) => {
  const game = new Game({ ...config, parent });

  // Keep full window size when browser resizes
  window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
  });

  return game;
};

export default StartGame;