import { Menu } from './scenes/Menu';
import { Game as MainGame } from './scenes/Game';
import { UIScene } from '../ui/UIScene';
import { SkillTreeScene } from './scenes/SkillTreeScene';
import { AUTO, Game, Types, Scale } from 'phaser';
import AnimatedTiles from 'phaser-animated-tiles';

// Full-window configuration
const config: Types.Core.GameConfig = {
  type: AUTO,
  width: 1024,
  height: 768,
  pixelArt: true,                // crisp pixel rendering
  roundPixels: true,
  backgroundColor: '#000000',    // black background
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },
  dom: {
    createContainer: true
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x:0, y: 0 },
      debug: true,               // shows collision boxes
    },
  },
  plugins: {
    scene: [
      {
        key: 'AnimatedTiles',
        plugin: AnimatedTiles,
        mapping: 'animatedTiles'
      }
    ]
  },
  scene: [Menu, MainGame, UIScene, SkillTreeScene],
};

// Export StartGame function (so index.ts can call StartGame('game-container'))
const StartGame = (parent: string) => {
  const game = new Game({ ...config, parent });

  // Scale Manager handles resizing with FIT + CENTER_BOTH
  
  return game;
};

export default StartGame;
