/**
 * Centralized Asset Management System
 * Coordinates loading of all game assets with error handling and progress tracking
 */

import { Scene } from 'phaser';
import { DynamicMobLoader } from './DynamicMobLoader';
import { TilemapManager } from './TilemapManager';
import {
  AssetLoadingConfig,
  AssetLoadingProgress,
  AssetLoadingResult,
  AssetLoadingCallbacks,
  AssetLoadingEvent,
  AssetInfo,
  AssetType,
  AssetLoadingState,
  AssetValidationResult
} from '../types/AssetTypes';
import { MobLoadResult, MobLoadingProgress } from '../types/MobTypes';
import { TilemapConfig, TilemapLoadResult, TilemapLoadingProgress } from '../types/TilemapTypes';

export class AssetManager {
  private mobLoader: DynamicMobLoader;
  private tilemapManager: TilemapManager;
  private config: AssetLoadingConfig;
  private callbacks: AssetLoadingCallbacks;
  private assets: Map<string, AssetInfo> = new Map();
  private loadingProgress: AssetLoadingProgress;
  private loadingStartTime: number = 0;
  private isLoading: boolean = false;

  constructor(scene: Scene, config?: Partial<AssetLoadingConfig>) {
    this.mobLoader = new DynamicMobLoader(scene);
    this.tilemapManager = new TilemapManager(scene);
    
    // Default configuration
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      timeoutMs: 30000,
      enableProgressTracking: true,
      enableErrorRecovery: true,
      ...config
    };
    
    this.callbacks = {};
    
    this.loadingProgress = {
      totalAssets: 0,
      loadedAssets: 0,
      failedAssets: 0,
      pendingAssets: 0,
      percentage: 0,
      errors: []
    };
    
    this.setupLoaderCallbacks();
  }

  /**
   * Set callback functions for asset loading events
   */
  public setCallbacks(callbacks: AssetLoadingCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Load all game assets (mobs and tilemaps)
   */
  public async loadAllAssets(tilemapConfigs: TilemapConfig[] = []): Promise<AssetLoadingResult> {
    if (this.isLoading) {
      throw new Error('Asset loading already in progress');
    }
    
    this.isLoading = true;
    this.loadingStartTime = Date.now();
    
    // Reset progress
    this.resetProgress();
    
    // Emit start event
    this.emitEvent({
      type: 'start',
      timestamp: Date.now()
    });
    
    if (this.callbacks.onStart) {
      this.callbacks.onStart();
    }
    
    try {
      const results: AssetLoadingResult = {
        success: true,
        totalAssets: 0,
        loadedAssets: 0,
        failedAssets: 0,
        errors: [],
        duration: 0
      };
      
      // Load mobs
      const mobResults = await this.loadMobs();
      results.mobResults = mobResults;
      results.totalAssets += mobResults.length;
      results.loadedAssets += mobResults.filter(r => r.success).length;
      results.failedAssets += mobResults.filter(r => !r.success).length;
      results.errors.push(...mobResults.filter(r => !r.success).map(r => r.error || 'Unknown error'));
      
      // Load tilemaps
      if (tilemapConfigs.length > 0) {
        const tilemapResults = await this.loadTilemaps(tilemapConfigs);
        results.tilemapResults = tilemapResults;
        results.totalAssets += tilemapResults.length;
        results.loadedAssets += tilemapResults.filter(r => r.success).length;
        results.failedAssets += tilemapResults.filter(r => !r.success).length;
        results.errors.push(...tilemapResults.filter(r => !r.success).map(r => r.error || 'Unknown error'));
      }
      
      // Calculate final results
      results.success = results.failedAssets === 0;
      results.duration = Date.now() - this.loadingStartTime;
      
      // Update final progress
      this.loadingProgress.totalAssets = results.totalAssets;
      this.loadingProgress.loadedAssets = results.loadedAssets;
      this.loadingProgress.failedAssets = results.failedAssets;
      this.loadingProgress.pendingAssets = 0;
      this.loadingProgress.percentage = 100;
      this.loadingProgress.errors = results.errors;
      
      // Emit complete event
      this.emitEvent({
        type: 'complete',
        progress: this.loadingProgress,
        timestamp: Date.now()
      });
      
      if (this.callbacks.onComplete) {
        this.callbacks.onComplete(results);
      }
      
      return results;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.emitEvent({
        type: 'error',
        error: errorMessage,
        timestamp: Date.now()
      });
      
      if (this.callbacks.onError) {
        this.callbacks.onError(errorMessage);
      }
      
      throw error;
      
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Load all mob assets
   */
  private async loadMobs(): Promise<MobLoadResult[]> {
    try {
      const results = await this.mobLoader.loadAllMobs();
      
      // Update progress tracking
      for (const result of results) {
        const assetInfo: AssetInfo = {
          key: result.mobName,
          type: AssetType.MOB,
          path: `assets/mobs/${result.mobName}`,
          state: result.success ? AssetLoadingState.LOADED : AssetLoadingState.FAILED,
          error: result.error,
          retryCount: 0,
          maxRetries: this.config.maxRetries
        };
        
        this.assets.set(result.mobName, assetInfo);
        
        if (result.success && this.callbacks.onAssetLoaded) {
          this.callbacks.onAssetLoaded(result.mobName, AssetType.MOB);
        } else if (!result.success && this.callbacks.onAssetFailed) {
          this.callbacks.onAssetFailed(result.mobName, AssetType.MOB, result.error || 'Unknown error');
        }
      }
      
      return results;
      
    } catch (error) {
      console.error('Error loading mobs:', error);
      throw error;
    }
  }

  /**
   * Load tilemap assets
   */
  private async loadTilemaps(configs: TilemapConfig[]): Promise<TilemapLoadResult[]> {
    const results: TilemapLoadResult[] = [];
    
    for (const config of configs) {
      try {
        const result = await this.tilemapManager.loadTilemap(config);
        results.push(result);
        
        // Update progress tracking
        const assetInfo: AssetInfo = {
          key: config.name,
          type: AssetType.TILEMAP,
          path: config.jsonPath,
          state: result.success ? AssetLoadingState.LOADED : AssetLoadingState.FAILED,
          error: result.error,
          retryCount: 0,
          maxRetries: this.config.maxRetries
        };
        
        this.assets.set(config.name, assetInfo);
        
        if (result.success && this.callbacks.onAssetLoaded) {
          this.callbacks.onAssetLoaded(config.name, AssetType.TILEMAP);
        } else if (!result.success && this.callbacks.onAssetFailed) {
          this.callbacks.onAssetFailed(config.name, AssetType.TILEMAP, result.error || 'Unknown error');
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const result: TilemapLoadResult = {
          success: false,
          tilemapName: config.name,
          error: errorMessage
        };
        
        results.push(result);
        
        if (this.callbacks.onAssetFailed) {
          this.callbacks.onAssetFailed(config.name, AssetType.TILEMAP, errorMessage);
        }
      }
    }
    
    return results;
  }

  /**
   * Setup loader callbacks for progress tracking
   */
  private setupLoaderCallbacks(): void {
    this.mobLoader.setCallbacks({
      onProgress: (progress: MobLoadingProgress) => {
        this.loadingProgress.mobProgress = progress;
        this.updateOverallProgress();
      },
      onError: (error: string, mobName?: string) => {
        this.emitEvent({
          type: 'error',
          error,
          assetKey: mobName,
          assetType: AssetType.MOB,
          timestamp: Date.now()
        });
      }
    });
    
    this.tilemapManager.setCallbacks({
      onProgress: (progress: TilemapLoadingProgress) => {
        this.loadingProgress.tilemapProgress = progress;
        this.updateOverallProgress();
      },
      onError: (error: string, tilemapName?: string) => {
        this.emitEvent({
          type: 'error',
          error,
          assetKey: tilemapName,
          assetType: AssetType.TILEMAP,
          timestamp: Date.now()
        });
      }
    });
  }

  /**
   * Update overall loading progress
   */
  private updateOverallProgress(): void {
    if (!this.config.enableProgressTracking) {
      return;
    }
    
    // Calculate combined progress from mob and tilemap loading
    let totalAssets = 0;
    let loadedAssets = 0;
    
    if (this.loadingProgress.mobProgress) {
      totalAssets += this.loadingProgress.mobProgress.totalMobs;
      loadedAssets += this.loadingProgress.mobProgress.loadedMobs;
    }
    
    if (this.loadingProgress.tilemapProgress) {
      totalAssets += this.loadingProgress.tilemapProgress.totalAssets;
      loadedAssets += this.loadingProgress.tilemapProgress.loadedAssets;
    }
    
    this.loadingProgress.totalAssets = totalAssets;
    this.loadingProgress.loadedAssets = loadedAssets;
    this.loadingProgress.pendingAssets = totalAssets - loadedAssets;
    this.loadingProgress.percentage = totalAssets > 0 ? (loadedAssets / totalAssets) * 100 : 0;
    
    // Emit progress event
    this.emitEvent({
      type: 'progress',
      progress: this.loadingProgress,
      timestamp: Date.now()
    });
    
    if (this.callbacks.onProgress) {
      this.callbacks.onProgress(this.loadingProgress);
    }
  }

  /**
   * Validate loaded assets
   */
  public validateAssets(): AssetValidationResult[] {
    const results: AssetValidationResult[] = [];
    
    for (const [key, assetInfo] of this.assets) {
      const result: AssetValidationResult = {
        valid: true,
        assetKey: key,
        assetType: assetInfo.type,
        errors: [],
        warnings: []
      };
      
      if (assetInfo.state === AssetLoadingState.FAILED) {
        result.valid = false;
        result.errors.push(assetInfo.error || 'Asset failed to load');
      } else if (assetInfo.state === AssetLoadingState.LOADED) {
        // Perform type-specific validation
        if (assetInfo.type === AssetType.MOB) {
          if (!this.mobLoader.validateMobAtlas(key)) {
            result.valid = false;
            result.errors.push('Mob atlas validation failed');
          }
        }
      }
      
      results.push(result);
    }
    
    return results;
  }

  /**
   * Get asset loading progress
   */
  public getLoadingProgress(): AssetLoadingProgress {
    return { ...this.loadingProgress };
  }

  /**
   * Get mob loader instance
   */
  public getMobLoader(): DynamicMobLoader {
    return this.mobLoader;
  }

  /**
   * Get tilemap manager instance
   */
  public getTilemapManager(): TilemapManager {
    return this.tilemapManager;
  }

  /**
   * Check if currently loading
   */
  public isCurrentlyLoading(): boolean {
    return this.isLoading;
  }

  /**
   * Reset loading progress
   */
  private resetProgress(): void {
    this.loadingProgress = {
      totalAssets: 0,
      loadedAssets: 0,
      failedAssets: 0,
      pendingAssets: 0,
      percentage: 0,
      errors: []
    };
  }

  /**
   * Emit loading event
   */
  private emitEvent(event: AssetLoadingEvent): void {
    // In a real implementation, this could use an event emitter
    console.log('Asset Loading Event:', event);
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.mobLoader.destroy();
    this.tilemapManager.destroy();
    this.assets.clear();
  }
}