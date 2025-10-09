import { Scene } from 'phaser';
import { AssetLoadingState, AssetInfo, AssetType } from '../types/AssetTypes';

export interface SpriteSheetConfig {
  key: string;
  textureUrl: string;
  atlasUrl: string;
  category: 'characters' | 'mobs';
}

export interface SpriteSheetLoadResult {
  success: boolean;
  key: string;
  error?: string;
  frameCount?: number;
}

export interface AnimationConfig {
  key: string;
  frames: string[];
  frameRate: number;
  repeat: number;
}

export class SpriteSheetManager {
  private scene: Scene;
  private loadedSpritesheets: Map<string, boolean> = new Map();
  private spritesheetConfigs: Map<string, SpriteSheetConfig> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
    this.initializeSpritesheetConfigs();
  }

  /**
   * Initialize all available spritesheet configurations
   */
  private initializeSpritesheetConfigs(): void {
    // Character spritesheets (texture-0 to texture-99 have JSON files)
    for (let i = 0; i <= 99; i++) {
      const key = `char-texture-${i}`;
      this.spritesheetConfigs.set(key, {
        key,
        textureUrl: `spritesheets/characters/texture-${i}.png`,
        atlasUrl: `spritesheets/characters/texture-${i}.json`,
        category: 'characters'
      });
    }

    // Mob spritesheets (texture-0 to texture-9 have JSON files)
    for (let i = 0; i <= 9; i++) {
      const key = `mob-texture-${i}`;
      this.spritesheetConfigs.set(key, {
        key,
        textureUrl: `spritesheets/mobs/texture-${i}.png`,
        atlasUrl: `spritesheets/mobs/texture-${i}.json`,
        category: 'mobs'
      });
    }
  }

  /**
   * Load a specific spritesheet by key (synchronous for Phaser preload)
   */
  public loadSpritesheet(key: string): SpriteSheetLoadResult {
    const config = this.spritesheetConfigs.get(key);
    if (!config) {
      return {
        success: false,
        key,
        error: `Spritesheet config not found for key: ${key}`
      };
    }

    if (this.loadedSpritesheets.get(key)) {
      return {
        success: true,
        key,
        frameCount: this.getFrameCount(key)
      };
    }

    try {
      // Load the texture atlas using Phaser's loader
      this.scene.load.atlas(key, config.textureUrl, config.atlasUrl);
      this.loadedSpritesheets.set(key, true);
      
      return {
        success: true,
        key,
        frameCount: 0 // Will be available after loading completes
      };

    } catch (error) {
      return {
        success: false,
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Load multiple spritesheets
   */
  public loadSpritesheets(keys: string[]): SpriteSheetLoadResult[] {
    return keys.map(key => this.loadSpritesheet(key));
  }

  /**
   * Load all character spritesheets
   */
  public loadAllCharacterSpritesheets(): SpriteSheetLoadResult[] {
    const characterKeys = Array.from(this.spritesheetConfigs.keys())
      .filter(key => this.spritesheetConfigs.get(key)?.category === 'characters');
    return this.loadSpritesheets(characterKeys);
  }

  /**
   * Load all mob spritesheets
   */
  public loadAllMobSpritesheets(): SpriteSheetLoadResult[] {
    const mobKeys = Array.from(this.spritesheetConfigs.keys())
      .filter(key => this.spritesheetConfigs.get(key)?.category === 'mobs');
    return this.loadSpritesheets(mobKeys);
  }

  /**
   * Load essential spritesheets for immediate gameplay
   */
  public loadEssentialSpritesheets(): SpriteSheetLoadResult[] {
    // Load the first few character and mob spritesheets for immediate use
    const essentialKeys = [
      'char-texture-0', 'char-texture-1', 'char-texture-2',
      'mob-texture-0', 'mob-texture-1', 'mob-texture-2'
    ];
    return this.loadSpritesheets(essentialKeys);
  }

  /**
   * Create animations from a loaded spritesheet
   */
  public createAnimationsFromSpritesheet(spritesheetKey: string, animations: AnimationConfig[]): void {
    if (!this.loadedSpritesheets.get(spritesheetKey)) {
      console.warn(`Spritesheet ${spritesheetKey} not loaded. Cannot create animations.`);
      return;
    }

    animations.forEach(animConfig => {
      if (this.scene.anims.exists(animConfig.key)) {
        console.warn(`Animation ${animConfig.key} already exists. Skipping.`);
        return;
      }

      this.scene.anims.create({
        key: animConfig.key,
        frames: this.scene.anims.generateFrameNames(spritesheetKey, {
          prefix: '',
          suffix: '',
          frames: animConfig.frames
        }),
        frameRate: animConfig.frameRate,
        repeat: animConfig.repeat
      });
    });
  }

  /**
   * Get frame count for a loaded spritesheet
   */
  private getFrameCount(key: string): number {
    const texture = this.scene.textures.get(key);
    if (texture && texture.frames) {
      return Object.keys(texture.frames).length - 1; // Subtract 1 for __BASE frame
    }
    return 0;
  }

  /**
   * Check if a spritesheet is loaded
   */
  public isSpritesheetLoaded(key: string): boolean {
    return this.loadedSpritesheets.get(key) || false;
  }

  /**
   * Get all available spritesheet keys by category
   */
  public getSpritesheetKeys(category?: 'characters' | 'mobs'): string[] {
    if (!category) {
      return Array.from(this.spritesheetConfigs.keys());
    }
    
    return Array.from(this.spritesheetConfigs.keys())
      .filter(key => this.spritesheetConfigs.get(key)?.category === category);
  }

  /**
   * Get spritesheet configuration
   */
  public getSpritesheetConfig(key: string): SpriteSheetConfig | undefined {
    return this.spritesheetConfigs.get(key);
  }

  /**
   * Validate that a spritesheet atlas is properly loaded
   */
  public validateSpritesheetAtlas(key: string): boolean {
    if (!this.loadedSpritesheets.get(key)) {
      return false;
    }

    const texture = this.scene.textures.get(key);
    return texture && texture.source && texture.source.length > 0;
  }

  /**
   * Get all frame names from a loaded spritesheet
   */
  public getFrameNames(key: string): string[] {
    if (!this.loadedSpritesheets.get(key)) {
      return [];
    }

    const texture = this.scene.textures.get(key);
    if (texture && texture.frames) {
      return Object.keys(texture.frames).filter(frameName => frameName !== '__BASE');
    }
    return [];
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.loadedSpritesheets.clear();
    this.spritesheetConfigs.clear();
  }
}