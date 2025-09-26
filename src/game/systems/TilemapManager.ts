/**
 * Modular Tilemap Integration System
 * Based on proven tilemap implementation from existing Phaser examples
 * Handles tilemap loading, layer management, and collision setup
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
  private loadingProgress: TilemapLoadingProgress;
  private onProgressCallback?: (progress: TilemapLoadingProgress) => void;
  private onCompleteCallback?: (results: TilemapLoadResult[]) => void;
  private onErrorCallback?: (error: string, tilemapName?: string) => void;

  constructor(scene: Scene) {
    this.scene = scene;
    this.loadingProgress = {
      totalAssets: 0,
      loadedAssets: 0,
      failedAssets: 0,
      errors: []
    };
  }

  /**
   * Set callback functions for loading events
   */
  public setCallbacks(callbacks: {
    onProgress?: (progress: TilemapLoadingProgress) => void;
    onComplete?: (results: TilemapLoadResult[]) => void;
    onError?: (error: string, tilemapName?: string) => void;
  }): void {
    this.onProgressCallback = callbacks.onProgress;
    this.onCompleteCallback = callbacks.onComplete;
    this.onErrorCallback = callbacks.onError;
  }

  /**
   * Load tilemap assets based on configuration
   */
  public async loadTilemap(config: TilemapConfig): Promise<TilemapLoadResult> {
    try {
      // Create tilemap asset entry
      const asset: TilemapAsset = {
        name: config.name,
        key: config.key,
        jsonPath: config.jsonPath,
        tilesets: config.tilesets,
        loaded: false
      };
      
      this.tilemapAssets.set(config.name, asset);
      
      // Calculate total assets to load (tilemap JSON + all tilesets)
      this.loadingProgress.totalAssets = 1 + config.tilesets.length;
      this.loadingProgress.loadedAssets = 0;
      this.loadingProgress.failedAssets = 0;
      this.loadingProgress.errors = [];
      
      this.notifyProgress();
      
      // Load tilemap JSON
      await this.loadTilemapJSON(config.key, config.jsonPath);
      this.loadingProgress.loadedAssets++;
      this.notifyProgress();
      
      // Load all tilesets
      for (const tileset of config.tilesets) {
        this.loadingProgress.currentAsset = tileset.name;
        this.notifyProgress();
        
        await this.loadTilesetImage(tileset.imageKey, tileset.imagePath);
        this.loadingProgress.loadedAssets++;
        this.notifyProgress();
      }
      
      asset.loaded = true;
      
      const result: TilemapLoadResult = {
        success: true,
        tilemapName: config.name
      };
      
      if (this.onCompleteCallback) {
        this.onCompleteCallback([result]);
      }
      
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.loadingProgress.failedAssets++;
      this.loadingProgress.errors.push(`${config.name}: ${errorMessage}`);
      
      if (this.onErrorCallback) {
        this.onErrorCallback(errorMessage, config.name);
      }
      
      return {
        success: false,
        tilemapName: config.name,
        error: errorMessage
      };
    }
  }

  /**
   * Load tilemap JSON file
   */
  private async loadTilemapJSON(key: string, jsonPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.scene.cache.tilemap.exists(key)) {
        resolve();
        return;
      }
      
      this.scene.load.tilemapTiledJSON(key, jsonPath);
      
      const onFileComplete = (fileKey: string) => {
        if (fileKey === key) {
          this.scene.load.off('filecomplete', onFileComplete);
          this.scene.load.off('loaderror', onFileError);
          resolve();
        }
      };
      
      const onFileError = (file: any) => {
        if (file.key === key) {
          this.scene.load.off('filecomplete', onFileComplete);
          this.scene.load.off('loaderror', onFileError);
          reject(new Error(`Failed to load tilemap JSON: ${jsonPath}`));
        }
      };
      
      this.scene.load.on('filecomplete', onFileComplete);
      this.scene.load.on('loaderror', onFileError);
      
      if (!this.scene.load.isLoading()) {
        this.scene.load.start();
      }
    });
  }

  /**
   * Load tileset image
   */
  private async loadTilesetImage(key: string, imagePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.scene.textures.exists(key)) {
        resolve();
        return;
      }
      
      this.scene.load.image(key, imagePath);
      
      const onFileComplete = (fileKey: string) => {
        if (fileKey === key) {
          this.scene.load.off('filecomplete', onFileComplete);
          this.scene.load.off('loaderror', onFileError);
          resolve();
        }
      };
      
      const onFileError = (file: any) => {
        if (file.key === key) {
          this.scene.load.off('filecomplete', onFileComplete);
          this.scene.load.off('loaderror', onFileError);
          reject(new Error(`Failed to load tileset image: ${imagePath}`));
        }
      };
      
      this.scene.load.on('filecomplete', onFileComplete);
      this.scene.load.on('loaderror', onFileError);
      
      if (!this.scene.load.isLoading()) {
        this.scene.load.start();
      }
    });
  }

  /**
   * Create tilemap from loaded assets
   */
  public createTilemap(config: TilemapConfig): Phaser.Tilemaps.Tilemap | null {
    const asset = this.tilemapAssets.get(config.name);
    if (!asset || !asset.loaded) {
      console.error(`Cannot create tilemap ${config.name}: assets not loaded`);
      return null;
    }
    
    try {
      // Create the tilemap
      const map = this.scene.make.tilemap({ key: config.key });
      
      // Add all tilesets
      const tilesets: Phaser.Tilemaps.Tileset[] = [];
      for (const tilesetConfig of config.tilesets) {
        const tileset = map.addTilesetImage(tilesetConfig.name, tilesetConfig.imageKey);
        if (tileset) {
          tilesets.push(tileset);
        } else {
          console.warn(`Failed to add tileset: ${tilesetConfig.name}`);
        }
      }
      
      // Create layers
      const layers: Phaser.Tilemaps.TilemapLayer[] = [];
      for (const layerConfig of config.layers) {
        const layerTilesets = layerConfig.tilesets.length > 0 
          ? tilesets.filter(ts => layerConfig.tilesets.includes(ts.name))
          : tilesets;
        
        const layer = map.createLayer(layerConfig.name, layerTilesets, 0, 0);
        if (layer) {
          // Apply layer configuration
          if (layerConfig.depth !== undefined) {
            layer.setDepth(layerConfig.depth);
          }
          if (layerConfig.alpha !== undefined) {
            layer.setAlpha(layerConfig.alpha);
          }
          if (layerConfig.visible !== undefined) {
            layer.setVisible(layerConfig.visible);
          }
          
          layers.push(layer);
        } else {
          console.warn(`Failed to create layer: ${layerConfig.name}`);
        }
      }
      
      // Set world bounds if specified
      if (config.worldBounds) {
        this.scene.physics.world.setBounds(
          0, 0, 
          config.worldBounds.width, 
          config.worldBounds.height
        );
      } else {
        // Use map dimensions
        this.scene.physics.world.setBounds(
          0, 0, 
          map.widthInPixels, 
          map.heightInPixels
        );
      }
      
      // Store the created tilemap
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
      const layer = map.getLayer(config.layerName);
      if (!layer || !layer.tilemapLayer) {
        console.warn(`Layer ${config.layerName} not found for collision setup`);
        continue;
      }
      
      const tilemapLayer = layer.tilemapLayer;
      
      if (config.collisionTiles) {
        // Set collision for specific tile IDs
        tilemapLayer.setCollision(config.collisionTiles);
      } else if (config.collisionProperty) {
        // Set collision by property
        tilemapLayer.setCollisionByProperty({ [config.collisionProperty]: true });
      } else {
        // Set collision for all non-empty tiles
        tilemapLayer.setCollisionByExclusion([]);
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
      id: obj.id || 0,
      name: obj.name || '',
      type: obj.type || '',
      x: obj.x || 0,
      y: obj.y || 0,
      width: obj.width || 0,
      height: obj.height || 0,
      properties: obj.properties || {}
    }));
  }

  /**
   * Get a loaded tilemap
   */
  public getTilemap(name: string): Phaser.Tilemaps.Tilemap | undefined {
    return this.loadedTilemaps.get(name);
  }

  /**
   * Get all loaded tilemaps
   */
  public getAllTilemaps(): Map<string, Phaser.Tilemaps.Tilemap> {
    return new Map(this.loadedTilemaps);
  }

  /**
   * Check if a tilemap is loaded
   */
  public isTilemapLoaded(name: string): boolean {
    const asset = this.tilemapAssets.get(name);
    return asset ? asset.loaded : false;
  }

  /**
   * Get loading progress
   */
  public getLoadingProgress(): TilemapLoadingProgress {
    return { ...this.loadingProgress };
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
    this.tilemapAssets.clear();
    this.loadedTilemaps.clear();
    this.scene.load.removeAllListeners();
  }
}