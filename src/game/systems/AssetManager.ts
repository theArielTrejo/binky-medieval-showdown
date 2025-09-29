import { Scene } from 'phaser';
import { DynamicMobLoader } from './DynamicMobLoader';
import { TilemapManager } from './TilemapManager';
import {
  AssetLoadingConfig,
  AssetLoadingResult,
  AssetInfo,
  AssetType,
  AssetLoadingState,
  AssetValidationResult
} from '../types/AssetTypes';
import { MobLoadResult } from '../types/MobTypes';
import { TilemapConfig, TilemapLoadResult } from '../types/TilemapTypes';

// Define constants for registry keys to avoid typos and for better maintainability.
export const REGISTRY_KEYS = {
  ASSET_LOADING_STATE: 'asset.loadingState', // 'idle', 'loading', 'complete', 'error'
  ASSETS_TOTAL: 'asset.progress.total',
  ASSETS_LOADED: 'asset.progress.loaded',
  ASSETS_FAILED: 'asset.progress.failed',
  ASSETS_PERCENTAGE: 'asset.progress.percentage',
  ASSET_ERRORS: 'asset.errors',
  ASSET_INFO_PREFIX: 'asset.info.' // e.g., 'asset.info.player'
};

export class AssetManager {
  private scene: Scene;
  private mobLoader: DynamicMobLoader;
  private tilemapManager: TilemapManager;
  private config: AssetLoadingConfig;

  constructor(scene: Scene, config?: Partial<AssetLoadingConfig>) {
    this.scene = scene;
    this.mobLoader = new DynamicMobLoader(scene);
    this.tilemapManager = new TilemapManager(scene);

    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      timeoutMs: 30000,
      enableProgressTracking: true, // Progress tracking is now implicit with DataManager
      enableErrorRecovery: true,
      ...config
    };

    // No need for setupLoaderCallbacks, as progress is managed centrally.
  }

  /**
   * Load all game assets (mobs and tilemaps).
   * Updates the global Phaser Registry with loading progress and results.
   */
  public async loadAllAssets(tilemapConfigs: TilemapConfig[] = []): Promise<AssetLoadingResult> {
    if (this.scene.registry.get(REGISTRY_KEYS.ASSET_LOADING_STATE) === 'loading') {
      console.warn('Asset loading already in progress.');
      // Or throw new Error('Asset loading already in progress');
      return { success: false, errors: ['Loading already in progress'], duration: 0, loadedAssets: 0, failedAssets: 0, totalAssets: 0 };
    }

    const loadingStartTime = Date.now();
    this.resetProgressInRegistry();
    this.scene.registry.set(REGISTRY_KEYS.ASSET_LOADING_STATE, 'loading');

    try {
      // The results object is now for the final return value, not for internal state tracking.
      const finalResults: AssetLoadingResult = {
        success: true,
        totalAssets: 0,
        loadedAssets: 0,
        failedAssets: 0,
        errors: [],
        duration: 0,
        mobResults: [],
        tilemapResults: []
      };

      // Load mobs
      const mobResults = await this.loadMobs();
      finalResults.mobResults = mobResults;
      
      // Load tilemaps
      if (tilemapConfigs.length > 0) {
        const tilemapResults = await this.loadTilemaps(tilemapConfigs);
        finalResults.tilemapResults = tilemapResults;
      }

      // Finalize results from the registry
      finalResults.totalAssets = this.scene.registry.get(REGISTRY_KEYS.ASSETS_TOTAL) || 0;
      finalResults.loadedAssets = this.scene.registry.get(REGISTRY_KEYS.ASSETS_LOADED) || 0;
      finalResults.failedAssets = this.scene.registry.get(REGISTRY_KEYS.ASSETS_FAILED) || 0;
      finalResults.errors = this.scene.registry.get(REGISTRY_KEYS.ASSET_ERRORS) || [];
      finalResults.success = finalResults.failedAssets === 0;
      finalResults.duration = Date.now() - loadingStartTime;
      
      this.scene.registry.set(REGISTRY_KEYS.ASSETS_PERCENTAGE, 100);
      this.scene.registry.set(REGISTRY_KEYS.ASSET_LOADING_STATE, 'complete');

      return finalResults;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during asset loading';
      this.scene.registry.get(REGISTRY_KEYS.ASSET_ERRORS).push(errorMessage);
      this.scene.registry.set(REGISTRY_KEYS.ASSET_LOADING_STATE, 'error');
      
      throw new Error(errorMessage);

    }
  }

  private async loadMobs(): Promise<MobLoadResult[]> {
    const results = await this.mobLoader.loadAllMobs();
    
    // Update registry after all mobs are processed
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
      
      // Store individual asset info in the registry
      this.scene.registry.set(`${REGISTRY_KEYS.ASSET_INFO_PREFIX}${result.mobName}`, assetInfo);

      this.updateOverallProgress(result.success, result.error);
    }
    return results;
  }
  
  private async loadTilemaps(configs: TilemapConfig[]): Promise<TilemapLoadResult[]> {
    const loadPromises = configs.map(config => this.tilemapManager.loadTilemap(config));
    const results = await Promise.all(loadPromises);

    for (const result of results) {
        const assetInfo: AssetInfo = {
            key: result.tilemapName,
            type: AssetType.TILEMAP,
            path: configs.find(c => c.name === result.tilemapName)?.jsonPath || '',
            state: result.success ? AssetLoadingState.LOADED : AssetLoadingState.FAILED,
            error: result.error,
            retryCount: 0,
            maxRetries: this.config.maxRetries,
        };
        
        this.scene.registry.set(`${REGISTRY_KEYS.ASSET_INFO_PREFIX}${result.tilemapName}`, assetInfo);

        this.updateOverallProgress(result.success, result.error);
    }
    
    return results;
  }

  /**
   * Increments asset counts in the registry and recalculates the percentage.
   * This method replaces the old updateOverallProgress and becomes the single point of update.
   */
  private updateOverallProgress(wasSuccessful: boolean, error?: string): void {
      if (wasSuccessful) {
        // Use the 'inc' method for atomic increments
        this.scene.registry.inc(REGISTRY_KEYS.ASSETS_LOADED, 1);
      } else {
        this.scene.registry.inc(REGISTRY_KEYS.ASSETS_FAILED, 1);
        if (error) {
          // It's better to update arrays by getting, modifying, and setting back.
          const currentErrors = this.scene.registry.get(REGISTRY_KEYS.ASSET_ERRORS) || [];
          currentErrors.push(error);
          this.scene.registry.set(REGISTRY_KEYS.ASSET_ERRORS, currentErrors);
        }
      }

      const total = this.scene.registry.get(REGISTRY_KEYS.ASSETS_TOTAL) || 1; // Avoid division by zero
      const loaded = this.scene.registry.get(REGISTRY_KEYS.ASSETS_LOADED) || 0;
      const percentage = (loaded / total) * 100;
      this.scene.registry.set(REGISTRY_KEYS.ASSETS_PERCENTAGE, percentage);
  }

  /**
   * Initializes or resets all asset loading values in the registry.
   */
  private resetProgressInRegistry(): void {
    this.scene.registry.set({
      [REGISTRY_KEYS.ASSET_LOADING_STATE]: 'idle',
      [REGISTRY_KEYS.ASSETS_TOTAL]: 0,
      [REGISTRY_KEYS.ASSETS_LOADED]: 0,
      [REGISTRY_KEYS.ASSETS_FAILED]: 0,
      [REGISTRY_KEYS.ASSETS_PERCENTAGE]: 0,
      [REGISTRY_KEYS.ASSET_ERRORS]: []
    });
  }

  /**
   * Validates loaded assets by querying the registry.
   */
  public validateAssets(): AssetValidationResult[] {
      const results: AssetValidationResult[] = [];
      const allData = this.scene.registry.getAll();
      
      for (const key in allData) {
          if (key.startsWith(REGISTRY_KEYS.ASSET_INFO_PREFIX)) {
              const assetInfo: AssetInfo = allData[key];
              const result: AssetValidationResult = {
                  valid: true,
                  assetKey: assetInfo.key,
                  assetType: assetInfo.type,
                  errors: [],
                  warnings: []
              };

              if (assetInfo.state === AssetLoadingState.FAILED) {
                  result.valid = false;
                  result.errors.push(assetInfo.error || 'Asset failed to load');
              } else if (assetInfo.type === AssetType.MOB) {
                  if (!this.mobLoader.validateMobAtlas(assetInfo.key)) {
                      result.valid = false;
                      result.errors.push('Mob atlas validation failed');
                  }
              }
              results.push(result);
          }
      }
      return results;
  }

  public getMobLoader(): DynamicMobLoader {
    return this.mobLoader;
  }

  public getTilemapManager(): TilemapManager {
    return this.tilemapManager;
  }

  /**
   * Clean up resources and reset registry keys if desired.
   */
  public destroy(): void {
    this.mobLoader.destroy();
    this.tilemapManager.destroy();
    // Optionally remove all asset-related keys from the registry
    // this.resetProgressInRegistry();
  }
}