/**
 * Modular Tilemap Integration System (Refactored)
 * Leverages Phaser's event-driven loader for efficient, parallel asset loading.
 */

import { Scene } from 'phaser';
import {
  TilemapConfig,
  TilemapAsset,
  TilemapLoadResult,
  TilemapLoadingProgress,
  CollisionConfig,
  TiledObjectData
} from '../types/TilemapTypes';

export class TilemapManager {
  private scene: Scene;
  private tilemapAssets: Map<string, TilemapAsset> = new Map();
  private loadedTilemaps: Map<string, Phaser.Tilemaps.Tilemap> = new Map();
  private onProgressCallback?: (progress: TilemapLoadingProgress) => void;
  private onErrorCallback?: (error: string, tilemapName?: string) => void;

  constructor(scene: Scene) {
    this.scene = scene;
  }
  
  /**
   * Set callback functions for loading events
   */
  public setCallbacks(callbacks: {
    onProgress?: (progress: TilemapLoadingProgress) => void;
    onError?: (error: string, tilemapName?: string) => void;
  }): void {
    this.onProgressCallback = callbacks.onProgress;
    this.onErrorCallback = callbacks.onError;
  }

  /**
   * Queues a tilemap and its associated tilesets for loading.
   * Returns a promise that resolves when this specific batch of assets is loaded.
   */
  public loadTilemap(config: TilemapConfig): Promise<TilemapLoadResult> {
    return new Promise((resolve) => {
      const asset: TilemapAsset = {
        name: config.name,
        key: config.key,
        jsonPath: config.jsonPath,
        tilesets: config.tilesets,
        loaded: false
      };
      this.tilemapAssets.set(config.name, asset);

      const filesToLoad = [config.key, ...config.tilesets.map(ts => ts.imageKey)];
      let loadedCount = 0;
      let failedCount = 0;
      let hasFailed = false;
      
      const loadingProgress: TilemapLoadingProgress = {
        totalAssets: filesToLoad.length,
        loadedAssets: 0,
        failedAssets: 0,
        errors: []
      };

      const onFileComplete = (fileKey: string) => {
        if (filesToLoad.includes(fileKey)) {
          loadedCount++;
          loadingProgress.loadedAssets = loadedCount;
          this.notifyProgress(loadingProgress);
        }
      };
      
      const onFileError = (file: Phaser.Loader.File) => {
        if (filesToLoad.includes(file.key)) {
          hasFailed = true;
          failedCount++;
          loadingProgress.failedAssets = failedCount;
          const errorMsg = `Failed to load asset for tilemap '${config.name}': ${file.key}`;
          loadingProgress.errors.push(errorMsg);
          if (this.onErrorCallback) {
            this.onErrorCallback(errorMsg, config.name);
          }
          this.notifyProgress(loadingProgress);
        }
      };

      this.scene.load.on(Phaser.Loader.Events.FILE_COMPLETE, onFileComplete);
      this.scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onFileError);

      this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
        // Clean up listeners for this specific load operation
        this.scene.load.off(Phaser.Loader.Events.FILE_COMPLETE, onFileComplete);
        this.scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onFileError);
        
        asset.loaded = !hasFailed;
        
        const result: TilemapLoadResult = {
          success: !hasFailed,
          tilemapName: config.name,
          error: hasFailed ? loadingProgress.errors.join(', ') : undefined
        };
        resolve(result);
      });

      // --- Queue all assets at once ---
      this.scene.load.tilemapTiledJSON(config.key, config.jsonPath);
      for (const tileset of config.tilesets) {
        this.scene.load.image(tileset.imageKey, tileset.imagePath);
      }
      
      // Start loading if not already in progress
      if (!this.scene.load.isLoading()) {
        this.scene.load.start();
      }
    });
  }

  // The private `loadTilemapJSON` and `loadTilesetImage` methods are no longer needed.

  /**
   * Create tilemap from loaded assets
   */
  public createTilemap(config: TilemapConfig): Phaser.Tilemaps.Tilemap | null {
    const asset = this.tilemapAssets.get(config.name);
    if (!asset || !asset.loaded) {
      console.error(`Cannot create tilemap ${config.name}: assets not loaded or failed to load`);
      return null;
    }
    
    try {
      const map = this.scene.make.tilemap({ key: config.key });
      const tilesets: Phaser.Tilemaps.Tileset[] = [];
      
      for (const tilesetConfig of config.tilesets) {
        const tileset = map.addTilesetImage(tilesetConfig.name, tilesetConfig.imageKey);
        if (tileset) {
          tilesets.push(tileset);
        } else {
          console.warn(`Failed to add tileset '${tilesetConfig.name}' to map '${config.name}'. Is the tileset name in your config correct?`);
        }
      }
      
      for (const layerConfig of config.layers) {
        const layerTilesets = layerConfig.tilesets.length > 0 
          ? tilesets.filter(ts => layerConfig.tilesets.includes(ts.name))
          : tilesets;
        
        const layer = map.createLayer(layerConfig.name, layerTilesets, 0, 0);
        if (layer) {
          if (layerConfig.depth !== undefined) layer.setDepth(layerConfig.depth);
          if (layerConfig.alpha !== undefined) layer.setAlpha(layerConfig.alpha);
          if (layerConfig.visible !== undefined) layer.setVisible(layerConfig.visible);
        } else {
          console.warn(`Failed to create layer '${layerConfig.name}' in map '${config.name}'. Is the layer name correct?`);
        }
      }
      
      if (config.worldBounds) {
        this.scene.physics.world.setBounds(0, 0, config.worldBounds.width, config.worldBounds.height);
      } else {
        this.scene.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
      }
      
      this.loadedTilemaps.set(config.name, map);
      return map;
      
    } catch (error) {
      console.error(`Error creating tilemap ${config.name}:`, error);
      return null;
    }
  }

  /**
   * Set up collision for tilemap layers
   */
  public setupCollisions(tilemapName: string, collisionConfigs: CollisionConfig[]): void {
    const map = this.loadedTilemaps.get(tilemapName);
    if (!map) {
      console.error(`Cannot setup collisions: tilemap ${tilemapName} not found`);
      return;
    }
    
    for (const config of collisionConfigs) {
      const layer = map.getLayer(config.layerName)?.tilemapLayer;
      if (!layer) {
        console.warn(`Layer ${config.layerName} not found for collision setup`);
        continue;
      }
      
      if (config.collisionTiles) {
        layer.setCollision(config.collisionTiles);
      } else if (config.collisionProperty) {
        layer.setCollisionByProperty({ [config.collisionProperty]: true });
      } else {
        layer.setCollisionByExclusion([-1]); // Set collision on all tiles except -1 (empty)
      }
    }
  }

  /**
   * Extract object data from tilemap
   */
  public extractObjects(tilemapName: string, objectLayerName: string): TiledObjectData[] {
    const map = this.loadedTilemaps.get(tilemapName);
    if (!map) {
      console.error(`Cannot extract objects: tilemap ${tilemapName} not found`);
      return [];
    }
    
    const objectLayer = map.getObjectLayer(objectLayerName);
    if (!objectLayer) {
      console.warn(`Object layer ${objectLayerName} not found`);
      return [];
    }
    
    return objectLayer.objects.map(obj => ({
      id: obj.id ?? 0,
      name: obj.name ?? '',
      type: obj.type ?? '',
      x: obj.x ?? 0,
      y: obj.y ?? 0,
      width: obj.width ?? 0,
      height: obj.height ?? 0,
      properties: obj.properties ?? {}
    }));
  }

  public getTilemap(name: string): Phaser.Tilemaps.Tilemap | undefined {
    return this.loadedTilemaps.get(name);
  }

  public getAllTilemaps(): Map<string, Phaser.Tilemaps.Tilemap> {
    return new Map(this.loadedTilemaps);
  }

  public isTilemapLoaded(name: string): boolean {
    const asset = this.tilemapAssets.get(name);
    return asset ? asset.loaded : false;
  }

  private notifyProgress(progress: TilemapLoadingProgress): void {
    if (this.onProgressCallback) {
      this.onProgressCallback({ ...progress });
    }
  }
  
  public destroy(): void {
    this.tilemapAssets.clear();
    this.loadedTilemaps.clear();
    // It's generally safer not to blindly remove all loader listeners,
    // as other systems might be using them.
  }
}