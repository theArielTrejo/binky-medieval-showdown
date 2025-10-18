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

/**
 * Configuration for a single mob animation.
 */
export interface MobAnimationConfig {
  key: string;
  frames: string[];
  frameRate: number;
  repeat: number;
}

/**
 * Defines the asset paths and loading state for a mob's texture atlas.
 * Used by DynamicMobLoader.
 */
export interface MobAsset {
  name: string;
  atlasKey: string;      // The key for the loaded atlas (e.g., 'archer')
  texturePath: string;   // The path to the PNG spritesheet
  atlasPath: string;     // The path to the JSON data file
  loaded: boolean;
  error?: string;
}

/**
 * Defines all gameplay-related properties for a mob.
 * Used by MobSpawner to configure a mob after it's created.
 */
export interface MobConfig {
  name: string;
  atlasKey: string;
  animations: MobAnimationConfig[];
  defaultAnimation: string;
  scale: number;
  health: number;
  speed: number;
  damage: number;
  collisionRadius: number;
  mass?: number;                      // Optional: Affects momentum in collisions
  bounce?: { x: number; y: number }; // Optional: Sets bounciness
}

/**
 * Represents the final result of loading a single mob asset.
 */
export interface MobLoadResult {
  success: boolean;
  mobName: string;
  error?: string;
}

/**
 * Tracks the overall progress of the mob loading process.
 */
export interface MobLoadingProgress {
  totalMobs: number;
  loadedMobs: number;
  failedMobs: number;
  currentMob?: string;
  errors: string[];
}