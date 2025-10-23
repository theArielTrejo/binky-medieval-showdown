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
   * Register an already-loaded tilemap asset (for assets loaded in preload)
   */
  public registerLoadedTilemap(config: TilemapConfig): void {
    const asset: TilemapAsset = {
      name: config.name,
      key: config.key,
      jsonPath: config.jsonPath,
      tilesets: config.tilesets,
      loaded: true // Mark as loaded since it's already loaded
    };
    this.tilemapAssets.set(config.name, asset);
  }

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

      // --- Add all tilesets ---
      for (const tilesetConfig of config.tilesets) {
        const tileset = map.addTilesetImage(tilesetConfig.name, tilesetConfig.imageKey);
        if (tileset) {
          tilesets.push(tileset);
        } else {
          console.warn(`⚠️ Failed to add tileset '${tilesetConfig.name}' to map '${config.name}'. Check spelling in Tiled.`);
        }
      }

      // --- Correct depth map (matches your working JS version) ---
      const depthMap: Record<string, number> = {
        background: 0,
        foreground: 1,
        objects: 2,
        foregroundobjects: 4,
        Trees: 5,
        collisions: 10,
        objectcollisions: 11
      };

      // --- Create each layer ---
      for (const layerConfig of config.layers) {
        const layerTilesets = layerConfig.tilesets.length > 0
          ? tilesets.filter(ts => layerConfig.tilesets.includes(ts.name))
          : tilesets;

        const layer = map.createLayer(layerConfig.name, layerTilesets, 0, 0);
        if (!layer) {
          console.warn(`⚠️ Could not create layer '${layerConfig.name}' in map '${config.name}'.`);
          continue;
        }

        // Apply visibility and transparency
        if (layerConfig.visible !== undefined) layer.setVisible(layerConfig.visible);
        if (layerConfig.alpha !== undefined) layer.setAlpha(layerConfig.alpha);

        // ✅ Apply correct depth order
        const setDepth = depthMap[layerConfig.name] ?? layerConfig.depth ?? 0;
        layer.setDepth(setDepth);

        // ✅ Set up collisions automatically
        if (layerConfig.collides) {
          layer.setCollisionByExclusion([-1]);
          console.log(`✅ Collision enabled for layer: ${layerConfig.name}`);
        }
      }

      // --- Set physics world bounds ---
      if (config.worldBounds) {
        this.scene.physics.world.setBounds(0, 0, config.worldBounds.width, config.worldBounds.height);
      } else {
        this.scene.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
      }

      this.loadedTilemaps.set(config.name, map);
      return map;
    } catch (error) {
      console.error(`❌ Error creating tilemap ${config.name}:`, error);
      return null;
    }
  }


  /**
   * Set up collision for tilemap layers with enhanced collision detection
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
        // Set collision on specific tile IDs
        layer.setCollision(config.collisionTiles, true, true);
      } else if (config.collisionProperty) {
        // Set collision based on tile properties
        layer.setCollisionByProperty({ [config.collisionProperty]: true }, true);
      } else {
        // Set collision on all non-empty tiles (default behavior)
        layer.setCollisionByExclusion([-1, 0], true); // Exclude empty tiles (0 and -1)
      }
      
      console.log(`Collision setup complete for layer: ${config.layerName}`);
    }
  }

  /**
   * Set up collision for specific tile ranges
   */
  public setupCollisionRange(tilemapName: string, layerName: string, startTile: number, endTile: number): void {
    const map = this.loadedTilemaps.get(tilemapName);
    if (!map) {
      console.error(`Cannot setup collision range: tilemap ${tilemapName} not found`);
      return;
    }
    
    const layer = map.getLayer(layerName)?.tilemapLayer;
    if (!layer) {
      console.warn(`Layer ${layerName} not found for collision range setup`);
      return;
    }
    
    layer.setCollisionBetween(startTile, endTile, true, true);
    console.log(`Collision range setup complete for layer: ${layerName}, tiles: ${startTile}-${endTile}`);
  }

  /**
   * Apply scaling to tilemap layers for consistent proportions
   */
  public applyScaling(tilemapName: string, scale: number = 1): void {
    const map = this.loadedTilemaps.get(tilemapName);
    if (!map) {
      console.error(`Cannot apply scaling: tilemap ${tilemapName} not found`);
      return;
    }
    
    // Apply scaling to all layers
    map.layers.forEach(layerData => {
      if (layerData.tilemapLayer) {
        layerData.tilemapLayer.setScale(scale);
      }
    });
    
    // Update physics world bounds to match scaled tilemap
    const scaledWidth = map.widthInPixels * scale;
    const scaledHeight = map.heightInPixels * scale;
    this.scene.physics.world.setBounds(0, 0, scaledWidth, scaledHeight);
    
    console.log(`Scaling applied to tilemap: ${tilemapName}, scale: ${scale}`);
  }

  /**
   * Get collision layer for physics interactions
   */
  public getCollisionLayer(tilemapName: string, layerName: string): Phaser.Tilemaps.TilemapLayer | null {
    const map = this.loadedTilemaps.get(tilemapName);
    if (!map) {
      console.error(`Cannot get collision layer: tilemap ${tilemapName} not found`);
      return null;
    }
    
    const layer = map.getLayer(layerName)?.tilemapLayer;
    if (!layer) {
      console.warn(`Layer ${layerName} not found`);
      return null;
    }
    
    return layer;
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