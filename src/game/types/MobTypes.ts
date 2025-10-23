/**
 * Type definitions for mob-related data structures
 */

/**
 * Represents the structure of a Texture Packer JSON atlas hash.
 * This is useful for type safety if you ever need to manually parse atlas data.
 */
export interface MobAtlasData {
  frames: {
    [frameName: string]: {
      frame: { x: number; y: number; w: number; h: number };
      rotated: boolean;
      trimmed: boolean;
      spriteSourceSize: { x: number; y: number; w: number; h: number };
      sourceSize: { w: number; h: number };
    };
  };
  meta: {
    app: string;
    version: string;
    image: string;
    format: string;
    size: { w: number; h: number };
    scale: string;
  };
}

// MobConfig removed - system now uses EnemyType with standardized stats

/**
 * Progress tracking for mob asset loading
 */
export interface MobLoadingProgress {
  totalMobs: number;
  loadedMobs: number;
  currentMob?: string;
  percentage: number;
}

/**
 * Result of mob asset loading operation
 */
export interface MobLoadResult {
  success: boolean;
  loadedMobs: string[];
  failedMobs: string[];
  errors?: string[];
}