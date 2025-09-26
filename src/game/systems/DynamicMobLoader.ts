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
  MobAtlasData,
  MobAnimationConfig,
  MobConfig
} from '../types/MobTypes';
import { MOB_CONFIGS } from '../config/GameConfig';

export class DynamicMobLoader {
  private scene: Scene;
  private mobAssets: Map<string, MobAsset> = new Map();
  private loadingProgress: MobLoadingProgress;
  private onProgressCallback?: (progress: MobLoadingProgress) => void;
  private onCompleteCallback?: (results: MobLoadResult[]) => void;
  private onErrorCallback?: (error: string, mobName?: string) => void;

  /**
   * List of mob names to load - based on available assets
   * Updated to use real assets with individual PNG files
   */
  private readonly MOB_NAMES = [
    'archer',
    'skeleton'
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
    onComplete?: (results: MobLoadResult[]) => void;
    onError?: (error: string, mobName?: string) => void;
  }): void {
    this.onProgressCallback = callbacks.onProgress;
    this.onCompleteCallback = callbacks.onComplete;
    this.onErrorCallback = callbacks.onError;
  }

  /**
   * Get mob configuration from game config
   */
  private getMobConfig(mobName: string): MobConfig | undefined {
    return MOB_CONFIGS[mobName];
  }

  /**
   * Scan the mobs directory and prepare asset list
   * Updated to work with individual PNG files instead of atlas files
   */
  private scanMobAssets(): MobAsset[] {
    const assets: MobAsset[] = [];
    
    for (const mobName of this.MOB_NAMES) {
      const asset: MobAsset = {
        name: mobName,
        textureKey: `${mobName}_texture`,
        atlasKey: `${mobName}_atlas`,
        imagePath: `assets/mobs/`, // Base path for individual PNG files
        atlasPath: `assets/mobs/${mobName}.json`, // Keep for compatibility
        loaded: false
      };
      
      assets.push(asset);
      this.mobAssets.set(mobName, asset);
    }
    
    return assets;
  }

  /**
   * Load all mob assets using Phaser's loader
   */
  public async loadAllMobs(): Promise<MobLoadResult[]> {
    const assets = this.scanMobAssets();
    const results: MobLoadResult[] = [];
    
    this.loadingProgress.totalMobs = assets.length;
    this.loadingProgress.loadedMobs = 0;
    this.loadingProgress.failedMobs = 0;
    this.loadingProgress.errors = [];
    
    this.notifyProgress();
    
    // Set up loader event listeners
    this.setupLoaderEvents();
    
    // Load each mob asset
    for (const asset of assets) {
      try {
        this.loadingProgress.currentMob = asset.name;
        this.notifyProgress();
        
        await this.loadMobAsset(asset);
        
        const result: MobLoadResult = {
          success: true,
          mobName: asset.name
        };
        
        results.push(result);
        asset.loaded = true;
        this.loadingProgress.loadedMobs++;
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const result: MobLoadResult = {
          success: false,
          mobName: asset.name,
          error: errorMessage
        };
        
        results.push(result);
        asset.error = errorMessage;
        this.loadingProgress.failedMobs++;
        this.loadingProgress.errors.push(`${asset.name}: ${errorMessage}`);
        
        if (this.onErrorCallback) {
          this.onErrorCallback(errorMessage, asset.name);
        }
      }
      
      this.notifyProgress();
    }
    
    if (this.onCompleteCallback) {
      this.onCompleteCallback(results);
    }
    
    return results;
  }

  /**
   * Load a single mob asset (individual PNG files)
   */
  private async loadMobAsset(asset: MobAsset): Promise<void> {
    return new Promise((resolve, reject) => {
      // Get the frame names for this mob from the config
      const mobConfig = this.getMobConfig(asset.name);
      if (!mobConfig) {
        reject(new Error(`No configuration found for mob: ${asset.name}`));
        return;
      }
      
      // Collect all unique frame names from all animations
      const frameNames = new Set<string>();
      for (const animation of mobConfig.animations) {
        for (const frameName of animation.frames) {
          frameNames.add(frameName);
        }
      }
      
      const framesToLoad = Array.from(frameNames);
      let loadedCount = 0;
      const totalToLoad = framesToLoad.length;
      let hasError = false;
      
      if (totalToLoad === 0) {
        resolve();
        return;
      }
      
      const checkComplete = () => {
        loadedCount++;
        if (loadedCount >= totalToLoad && !hasError) {
          resolve();
        }
      };
      
      const handleError = (error: string) => {
        if (!hasError) {
          hasError = true;
          reject(new Error(error));
        }
      };
      
      // Load each individual frame as a separate image
      for (const frameName of framesToLoad) {
        const imagePath = `${asset.imagePath}${frameName}.png`;
        this.scene.load.image(frameName, imagePath);
      }
      
      // Set up one-time listeners for this specific load
      const onFileComplete = (key: string) => {
        if (framesToLoad.includes(key)) {
          checkComplete();
        }
      };
      
      const onFileError = (file: any) => {
        if (framesToLoad.includes(file.key)) {
          handleError(`Failed to load ${asset.name} frame: ${file.src}`);
        }
      };
      
      this.scene.load.on('filecomplete', onFileComplete);
      this.scene.load.on('loaderror', onFileError);
      
      // Start the load if not already loading
      if (!this.scene.load.isLoading()) {
        this.scene.load.start();
      }
    });
  }

  /**
   * Set up global loader event listeners
   */
  private setupLoaderEvents(): void {
    this.scene.load.on('complete', () => {
      // All assets loaded
    });
    
    this.scene.load.on('loaderror', (file: any) => {
      console.error('Asset loading error:', file);
    });
  }

  /**
   * Create animations for a loaded mob using individual images
   */
  public createMobAnimations(mobName: string, animationConfigs: MobAnimationConfig[]): void {
    const asset = this.mobAssets.get(mobName);
    if (!asset || !asset.loaded) {
      console.warn(`Cannot create animations for ${mobName}: asset not loaded`);
      return;
    }
    
    for (const config of animationConfigs) {
      if (!this.scene.anims.exists(config.key)) {
        // Create animation using individual image keys
        const frames = config.frames.map(frameName => ({ key: frameName }));
        
        this.scene.anims.create({
          key: config.key,
          frames: frames,
          frameRate: config.frameRate,
          repeat: config.repeat
        });
      }
    }
  }

  /**
   * Get a loaded mob asset
   */
  public getMobAsset(mobName: string): MobAsset | undefined {
    return this.mobAssets.get(mobName);
  }

  /**
   * Get all loaded mob assets
   */
  public getAllMobAssets(): Map<string, MobAsset> {
    return new Map(this.mobAssets);
  }

  /**
   * Check if a mob is loaded
   */
  public isMobLoaded(mobName: string): boolean {
    const asset = this.mobAssets.get(mobName);
    return asset ? asset.loaded : false;
  }

  /**
   * Get loading progress
   */
  public getLoadingProgress(): MobLoadingProgress {
    return { ...this.loadingProgress };
  }

  /**
   * Validate mob atlas data
   */
  public validateMobAtlas(mobName: string): boolean {
    const asset = this.mobAssets.get(mobName);
    if (!asset || !asset.loaded) {
      return false;
    }
    
    try {
      const texture = this.scene.textures.get(asset.atlasKey);
      return texture && texture.source && texture.source.length > 0;
    } catch (error) {
      console.error(`Error validating mob atlas for ${mobName}:`, error);
      return false;
    }
  }

  /**
   * Notify progress callback
   */
  private notifyProgress(): void {
    if (this.onProgressCallback) {
      this.onProgressCallback({ ...this.loadingProgress });
    }
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.mobAssets.clear();
    this.scene.load.removeAllListeners();
  }
}