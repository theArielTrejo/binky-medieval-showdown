/**
 * Type definitions for asset management system
 */

import { MobLoadingProgress, MobLoadResult } from './MobTypes';
import { TilemapLoadingProgress, TilemapLoadResult } from './TilemapTypes';

/**
 * Asset loading states
 */
export enum AssetLoadingState {
  PENDING = 'pending',
  LOADING = 'loading',
  LOADED = 'loaded',
  FAILED = 'failed'
}

/**
 * Asset types supported by the system
 */
export enum AssetType {
  MOB = 'mob',
  TILEMAP = 'tilemap',
  SPRITESHEET = 'spritesheet',
  IMAGE = 'image',
  AUDIO = 'audio',
  JSON = 'json'
}

/**
 * Generic asset information
 */
export interface AssetInfo {
  key: string;
  type: AssetType;
  path: string;
  state: AssetLoadingState;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

/**
 * Asset loading configuration
 */
export interface AssetLoadingConfig {
  maxRetries: number;
  retryDelay: number;
  timeoutMs: number;
  enableProgressTracking: boolean;
  enableErrorRecovery: boolean;
}

/**
 * Asset loading progress information
 */
export interface AssetLoadingProgress {
  totalAssets: number;
  loadedAssets: number;
  failedAssets: number;
  pendingAssets: number;
  currentAsset?: string;
  percentage: number;
  errors: string[];
  mobProgress?: MobLoadingProgress;
  tilemapProgress?: TilemapLoadingProgress;
}

/**
 * Asset loading result
 */
export interface AssetLoadingResult {
  success: boolean;
  totalAssets: number;
  loadedAssets: number;
  failedAssets: number;
  errors: string[];
  mobResults?: MobLoadResult[];
  tilemapResults?: TilemapLoadResult[];
  spritesheetResults?: any[]; // Will be properly typed when SpriteSheetLoadResult is imported
  duration: number;
}

/**
 * Asset loading callbacks
 */
export interface AssetLoadingCallbacks {
  onStart?: () => void;
  onProgress?: (progress: AssetLoadingProgress) => void;
  onComplete?: (result: AssetLoadingResult) => void;
  onError?: (error: string) => void;
  onAssetLoaded?: (assetKey: string, assetType: AssetType) => void;
  onAssetFailed?: (assetKey: string, assetType: AssetType, error: string) => void;
}

/**
 * Asset loading event
 */
export interface AssetLoadingEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  timestamp: number;
  progress?: AssetLoadingProgress;
  error?: string;
  assetKey?: string;
  assetType?: AssetType;
}

/**
 * Asset validation result
 */
export interface AssetValidationResult {
  valid: boolean;
  assetKey: string;
  assetType: AssetType;
  errors: string[];
  warnings: string[];
}