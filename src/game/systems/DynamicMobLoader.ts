/**
 * Dynamic Mob Asset Loading System
 * Automatically scans and loads all mob assets from /assets/mobs/ directory
 * Each mob consists of paired files: ${mob_name}.png and ${mob_name}.json atlas
 */

import { Scene } from 'phaser';
import {
  MobAsset,
  MobLoadResult,
  MobLoadingProgress,
  MobConfig
} from '../types/MobTypes';
import { MOB_CONFIGS } from '../config/GameConfig';

export class DynamicMobLoader {
  private scene: Scene;
  private mobAssets: Map<string, MobAsset> = new Map();
  private loadingProgress: MobLoadingProgress;
  private onProgressCallback?: (progress: MobLoadingProgress) => void;
  private onErrorCallback?: (error: string, mobName?: string) => void;

  /**
   * List of mob names to load.
   */
  private readonly MOB_NAMES = [
    'archer',
    'skeleton'
    // Add other mob names here
  ];

  constructor(scene: Scene) {
    this.scene = scene;
    this.loadingProgress = {
      totalMobs: 0,
      loadedMobs: 0,
      failedMobs: 0,
      errors: []
    };
  }

  /**
   * Set callback functions for loading events
   */
  public setCallbacks(callbacks: {
    onProgress?: (progress: MobLoadingProgress) => void;
    onError?: (error: string, mobName?: string) => void;
  }): void {
    this.onProgressCallback = callbacks.onProgress;
    this.onErrorCallback = callbacks.onError;
  }

  /**
   * Get mob configuration from game config
   */
  private getMobConfig(mobName: string): MobConfig | undefined {
    return MOB_CONFIGS[mobName];
  }

  /**
   * Scan the mobs directory and prepare asset list for texture atlas loading.
   */
  private scanMobAssets(): MobAsset[] {
    const assets: MobAsset[] = [];
    this.mobAssets.clear(); // Clear previous assets
    
    for (const mobName of this.MOB_NAMES) {
      const asset: MobAsset = {
        name: mobName,
        // The atlas key is what we'll use to reference this mob's textures
        atlasKey: mobName,
        texturePath: `assets/mobs/${mobName}.png`,
        atlasPath: `assets/mobs/${mobName}.json`,
        loaded: false
      };
      
      assets.push(asset);
      this.mobAssets.set(mobName, asset);
    }
    
    return assets;
  }

  /**
   * Queues all mob assets for loading using Phaser's built-in loader.
   * This leverages parallel loading and is more efficient than the previous sequential method.
   */
  public loadAllMobs(): Promise<MobLoadResult[]> {
    return new Promise((resolve) => {
      const assetsToLoad = this.scanMobAssets();
      
      // Reset progress
      this.loadingProgress = {
        totalMobs: assetsToLoad.length,
        loadedMobs: 0,
        failedMobs: 0,
        errors: []
      };
      this.notifyProgress();

      if (assetsToLoad.length === 0) {
        resolve([]);
        return;
      }

      // --- Use Phaser's Event-Driven Loader ---
      
      const onFileComplete = (key: string) => {
        if (this.mobAssets.has(key)) {
            const asset = this.mobAssets.get(key)!;
            asset.loaded = true;
            this.loadingProgress.loadedMobs++;
            this.notifyProgress();
        }
      };
      
      const onFileError = (file: Phaser.Loader.File) => {
        // The key for an atlas is the json file key, not the texture key.
        const mobName = file.key;
        if (this.mobAssets.has(mobName)) {
            const asset = this.mobAssets.get(mobName)!;
            const errorMessage = `Failed to load ${file.type} for mob '${mobName}': ${file.url}`;
            asset.error = errorMessage;
            this.loadingProgress.failedMobs++;
            this.loadingProgress.errors.push(errorMessage);

            if (this.onErrorCallback) {
              this.onErrorCallback(errorMessage, asset.name);
            }
            this.notifyProgress();
        }
      };

      this.scene.load.on(Phaser.Loader.Events.FILE_COMPLETE, onFileComplete);
      this.scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onFileError);
      
      // When the entire queue is complete, resolve the promise.
      this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
        this.scene.load.off(Phaser.Loader.Events.FILE_COMPLETE, onFileComplete);
        this.scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onFileError);

        const results: MobLoadResult[] = Array.from(this.mobAssets.values()).map(asset => ({
            success: asset.loaded,
            mobName: asset.name,
            error: asset.error,
        }));
        
        resolve(results);
      });

      // Queue all assets. This does not start the load yet.
      for (const asset of assetsToLoad) {
        // As per Phaser docs, we use load.atlas to load the texture and its accompanying JSON data.
        this.scene.load.atlas(asset.atlasKey, asset.texturePath, asset.atlasPath);
      }

      // Start loading if not already in progress.
      // If called from a Scene's preload(), this isn't strictly necessary, but it makes the method robust.
      if (!this.scene.load.isLoading()) {
        this.scene.load.start();
      }
    });
  }

  /**
   * Create animations for a loaded mob from its texture atlas.
   */
  public createMobAnimations(mobName: string): void {
    const asset = this.mobAssets.get(mobName);
    const mobConfig = this.getMobConfig(mobName);

    if (!asset || !asset.loaded) {
      console.warn(`Cannot create animations for ${mobName}: asset not loaded.`);
      return;
    }
    if (!mobConfig) {
      console.warn(`Cannot create animations for ${mobName}: no config found.`);
      return;
    }
    
    for (const animConfig of mobConfig.animations) {
      if (!this.scene.anims.exists(animConfig.key)) {
        // Create an array of frame identifiers for the animation manager
        const frames = animConfig.frames.map(frameName => ({
          key: asset.atlasKey, // The key of the texture atlas
          frame: frameName   // The name of the frame within the atlas
        }));

        this.scene.anims.create({
          key: animConfig.key,
          frames: frames,
          frameRate: animConfig.frameRate,
          repeat: animConfig.repeat
        });
      }
    }
  }

  /**
   * Validate mob atlas by checking if the texture exists in Phaser's Texture Manager.
   */
  public validateMobAtlas(mobName: string): boolean {
    const asset = this.mobAssets.get(mobName);
    if (!asset || !asset.loaded) {
      return false;
    }
    return this.scene.textures.exists(asset.atlasKey);
  }

  // --- Helper and Getter methods ---

  public getMobAsset(mobName: string): MobAsset | undefined {
    return this.mobAssets.get(mobName);
  }

  public getAllMobAssets(): Map<string, MobAsset> {
    return new Map(this.mobAssets);
  }

  public isMobLoaded(mobName: string): boolean {
    const asset = this.mobAssets.get(mobName);
    return asset ? asset.loaded : false;
  }
  
  public getLoadingProgress(): MobLoadingProgress {
    return { ...this.loadingProgress };
  }
  
  private notifyProgress(): void {
    if (this.onProgressCallback) {
      this.onProgressCallback({ ...this.loadingProgress });
    }
  }

  public destroy(): void {
    this.mobAssets.clear();
  }
}