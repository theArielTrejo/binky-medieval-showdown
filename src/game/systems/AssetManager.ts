import { Scene } from 'phaser';
import { TilemapManager } from './TilemapManager';
import { SpriteSheetManager, SpriteSheetLoadResult } from './SpriteSheetManager';
import {
  AssetLoadingConfig,
  AssetLoadingResult,
  AssetInfo,
  AssetType,
  AssetLoadingState,
  AssetValidationResult
} from '../types/AssetTypes';
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
  private tilemapManager: TilemapManager;
  private spritesheetManager: SpriteSheetManager;
  private config: AssetLoadingConfig;

  constructor(scene: Scene, config?: Partial<AssetLoadingConfig>) {
    this.scene = scene;
    this.tilemapManager = new TilemapManager(scene);
    this.spritesheetManager = new SpriteSheetManager(scene);

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
      return { success: false, errors: ['Loading already in progress'], duration: 0, loadedAssets: 0, failedAssets: 0, totalAssets: 0 };
    }

    const loadingStartTime = Date.now();
    this.resetProgressInRegistry();
    this.scene.registry.set(REGISTRY_KEYS.ASSET_LOADING_STATE, 'loading');

    // Setup listener for individual file progress (mainly for spritesheets)
    const onFileComplete = (key: string, type: string, data: any) => {
       // Check if this file corresponds to a tracked asset in the registry
       const registryKey = `${REGISTRY_KEYS.ASSET_INFO_PREFIX}${key}`;
       const assetInfo = this.scene.registry.get(registryKey);
       
       if (assetInfo && assetInfo.state !== AssetLoadingState.LOADED) {
           assetInfo.state = AssetLoadingState.LOADED;
           this.scene.registry.set(registryKey, assetInfo);
           this.updateOverallProgress(true);
       }
    };

    const onFileError = (file: Phaser.Loader.File) => {
        const registryKey = `${REGISTRY_KEYS.ASSET_INFO_PREFIX}${file.key}`;
        const assetInfo = this.scene.registry.get(registryKey);

        if (assetInfo) {
            assetInfo.state = AssetLoadingState.FAILED;
            assetInfo.error = `Failed to load ${file.key}`;
            this.scene.registry.set(registryKey, assetInfo);
            this.updateOverallProgress(false, assetInfo.error);
        }
    };

    this.scene.load.on(Phaser.Loader.Events.FILE_COMPLETE, onFileComplete);
    this.scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onFileError);

    try {
      const finalResults: AssetLoadingResult = {
        success: true,
        totalAssets: 0,
        loadedAssets: 0,
        failedAssets: 0,
        errors: [],
        duration: 0,
        mobResults: [],
        tilemapResults: [],
        spritesheetResults: []
      };

      // 1. Queue Spritesheets (Initializes registry entries as 'loading')
      const spritesheetResults = this.queueSpritesheets();
      finalResults.spritesheetResults = spritesheetResults;

      // 2. Queue Tilemaps (Initializes registry entries as 'loading')
      // We don't await loadTilemaps here yet, we just want to queue them if possible, 
      // but TilemapManager.loadTilemap is designed to start the loader.
      // So we will let TilemapManager handle the tilemaps, but we need to ensure we wait for everything.
      
      let tilemapResults: TilemapLoadResult[] = [];

      if (tilemapConfigs.length > 0) {
        // TilemapManager.loadTilemap internally calls scene.load.start() and waits for COMPLETE.
        // This will cover the spritesheets we just queued as well.
        tilemapResults = await this.loadTilemaps(tilemapConfigs);
      } else {
        // If no tilemaps, we must manually start the loader for the spritesheets and wait.
        if (spritesheetResults.length > 0) {
            await this.waitForCompletion();
        }
      }
      finalResults.tilemapResults = tilemapResults;
      finalResults.mobResults = []; // Deprecated

      // Cleanup listeners
      this.scene.load.off(Phaser.Loader.Events.FILE_COMPLETE, onFileComplete);
      this.scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onFileError);

      // Finalize results
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
      // Cleanup listeners in case of error
      this.scene.load.off(Phaser.Loader.Events.FILE_COMPLETE, onFileComplete);
      this.scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onFileError);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error during asset loading';
      
      // Safe array update
      const currentErrors = [...(this.scene.registry.get(REGISTRY_KEYS.ASSET_ERRORS) || [])];
      currentErrors.push(errorMessage);
      this.scene.registry.set(REGISTRY_KEYS.ASSET_ERRORS, currentErrors);
      
      this.scene.registry.set(REGISTRY_KEYS.ASSET_LOADING_STATE, 'error');
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Helper to wait for the global loader to finish.
   */
  private async waitForCompletion(): Promise<void> {
      return new Promise((resolve) => {
          if (!this.scene.load.isLoading()) {
              this.scene.load.start();
          }
          this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
              resolve();
          });
      });
  }

  private queueSpritesheets(): SpriteSheetLoadResult[] {
    const results = this.spritesheetManager.loadEssentialSpritesheets();
    
    // Initialize registry entries for spritesheets (but do NOT mark as loaded yet)
    for (const result of results) {
      const assetInfo: AssetInfo = {
        key: result.key,
        type: AssetType.SPRITESHEET,
        path: `assets/spritesheets/${result.key}`,
        state: AssetLoadingState.LOADING, // Start as LOADING
        error: undefined,
        retryCount: 0,
        maxRetries: this.config.maxRetries
      };
      
      this.scene.registry.set(`${REGISTRY_KEYS.ASSET_INFO_PREFIX}${result.key}`, assetInfo);
      
      // Increment TOTAL assets count
      this.scene.registry.inc(REGISTRY_KEYS.ASSETS_TOTAL, 1);
    }
    // Update percentage (will be 0 initially)
    this.updatePercentage();
    
    return results;
  }

  private async loadTilemaps(configs: TilemapConfig[]): Promise<TilemapLoadResult[]> {
    // Register tilemaps in registry before loading
    for (const config of configs) {
        const assetInfo: AssetInfo = {
            key: config.name,
            type: AssetType.TILEMAP,
            path: config.jsonPath,
            state: AssetLoadingState.LOADING,
            error: undefined,
            retryCount: 0,
            maxRetries: this.config.maxRetries,
        };
        this.scene.registry.set(`${REGISTRY_KEYS.ASSET_INFO_PREFIX}${config.name}`, assetInfo);
        this.scene.registry.inc(REGISTRY_KEYS.ASSETS_TOTAL, 1);
    }
    this.updatePercentage();

    // TilemapManager handles its own "Loaded" updates via its internal promise resolution,
    // but we also have global listeners. To avoid double counting, we rely on TilemapManager's
    // result to update the specific Tilemap asset entry state, OR we let the global listener handle files.
    // However, a Tilemap is a composite asset (JSON + Images).
    // The global listener will hear about the JSON and the Images separately.
    // TilemapManager.loadTilemap returns when the whole map is ready.
    
    const loadPromises = configs.map(config => this.tilemapManager.loadTilemap(config));
    const results = await Promise.all(loadPromises);

    for (const result of results) {
        // Update the Tilemap Asset entry to LOADED/FAILED based on the manager's result
        // This overrides whatever intermediate state the file listeners might have set
        const assetInfo = this.scene.registry.get(`${REGISTRY_KEYS.ASSET_INFO_PREFIX}${result.tilemapName}`);
        if (assetInfo) {
            assetInfo.state = result.success ? AssetLoadingState.LOADED : AssetLoadingState.FAILED;
            assetInfo.error = result.error;
            this.scene.registry.set(`${REGISTRY_KEYS.ASSET_INFO_PREFIX}${result.tilemapName}`, assetInfo);
            
            // We manually update overall progress for the "Tilemap" asset itself
            // (Files inside it might have already triggered progress updates, but the Map concept is separate)
            this.updateOverallProgress(result.success, result.error);
        }
    }
    
    return results;
  }
  
  private updatePercentage(): void {
      const total = this.scene.registry.get(REGISTRY_KEYS.ASSETS_TOTAL) || 1;
      const loaded = this.scene.registry.get(REGISTRY_KEYS.ASSETS_LOADED) || 0;
      const percentage = (loaded / total) * 100;
      this.scene.registry.set(REGISTRY_KEYS.ASSETS_PERCENTAGE, percentage);
  }

  /**
   * Increments asset counts in the registry and recalculates the percentage.
   */
  private updateOverallProgress(wasSuccessful: boolean, error?: string): void {
      if (wasSuccessful) {
        this.scene.registry.inc(REGISTRY_KEYS.ASSETS_LOADED, 1);
      } else {
        this.scene.registry.inc(REGISTRY_KEYS.ASSETS_FAILED, 1);
        if (error) {
          const currentErrors = [...(this.scene.registry.get(REGISTRY_KEYS.ASSET_ERRORS) || [])];
          currentErrors.push(error);
          this.scene.registry.set(REGISTRY_KEYS.ASSET_ERRORS, currentErrors);
        }
      }
      this.updatePercentage();
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
              }
              results.push(result);
          }
      }
      return results;
  }

  public getTilemapManager(): TilemapManager {
    return this.tilemapManager;
  }

  public getSpritesheetManager(): SpriteSheetManager {
    return this.spritesheetManager;
  }

  /**
   * Clean up resources and reset registry keys if desired.
   */
  public destroy(): void {
    this.tilemapManager.destroy();
    this.spritesheetManager.destroy();
    // Optionally remove all asset-related keys from the registry
    // this.resetProgressInRegistry();
  }
}