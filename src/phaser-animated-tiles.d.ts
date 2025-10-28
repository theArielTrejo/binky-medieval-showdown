// File is needed to declare the phaser animation package because the original package is in js
// It needs to be able to be read in ts
declare module 'phaser-animated-tiles' {
  import Phaser from 'phaser';
  export default class AnimatedTiles {
    constructor(scene: Phaser.Scene);
    init(map: Phaser.Tilemaps.Tilemap): void;
    updateAnimatedTiles(): void;
    destroy(): void;
  }
}