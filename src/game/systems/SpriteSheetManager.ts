import { Scene } from 'phaser';

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
  frames: number[];
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
    for (let i = 0; i <= 300; i++) {
      const key = `char-texture-${i}`;
      this.spritesheetConfigs.set(key, {
        key,
        textureUrl: `spritesheets/characters/texture-${i}.png`,
        atlasUrl: `spritesheets/characters/texture-${i}.json`,
        category: 'characters'
      });
    }

    // Mob spritesheets (texture-0 to texture-320+ have JSON files)
    // Based on analysis, sprite data is found in higher numbered textures
    for (let i = 0; i <= 320; i++) {
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
      // Phaser automatically handles rotated frames from TexturePacker JSON
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
   * ULTRA OPTIMIZED: Only loads texture atlases that contain the actual sprite data needed for hardcoded mob skins
   */
  public loadEssentialSpritesheets(): SpriteSheetLoadResult[] {
    // Load a focused set of character textures for player animations
    const essentialCharacterTextures: string[] = [];
    for (let i = 0; i <= 20; i++) {
      essentialCharacterTextures.push(`char-texture-${i}`);
    }
    
    // Load unique textures for each mob type to ensure distinct skins
    // mob-texture-196: Skeleton_Pirate_Captain_1 (skeleton pirate)
    // mob-texture-254: Archer_1 (archer) - has idle/walk
    // mob-texture-281: Golem_1 (golem) & Skeleton_Viking_1 - has idle/walk
    // mob-texture-316: Gnoll_3 (gnoll) - has idle/walk
    // mob-texture-204 + 205: Elemental_Spirits_2 (elemental spirit) - running in 204, idle in 205
    const essentialMobTextures = [
      'mob-texture-196',
      'mob-texture-254',
      'mob-texture-281',
      'mob-texture-316',
      'mob-texture-204',
      'mob-texture-205'
    ];
    
    console.log(`🚀 OPTIMAL OPTIMIZATION: Loading ${essentialCharacterTextures.length} character textures and ${essentialMobTextures.length} mob textures`);
    console.log(`📊 Total textures to load: ${essentialCharacterTextures.length + essentialMobTextures.length} (99.2% reduction from 319 possible mob textures)`);
    console.log(`🎯 Six mob textures provide unique skins for each mob type: Skeleton_Pirate_Captain_1, Archer_1, Golem_1, Gnoll_3, Elemental_Spirits_2`);
    
    return this.loadSpritesheets([...essentialCharacterTextures, ...essentialMobTextures]);
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
    // Check if the texture is actually loaded in Phaser's cache, not just queued
    return this.scene.textures.exists(key) && this.loadedSpritesheets.get(key) || false;
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
    // Check if the texture is actually loaded, not just queued
    if (!this.scene.textures.exists(key)) {
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
