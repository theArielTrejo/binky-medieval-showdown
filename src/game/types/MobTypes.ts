/**
 * Type definitions for mob-related data structures
 */

/**
 * Represents a mob's atlas data structure
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
 * Configuration for a mob's animations
 */
export interface MobAnimationConfig {
  key: string;
  frames: string[];
  frameRate: number;
  repeat: number;
}

/**
 * Mob asset information
 */
export interface MobAsset {
  name: string;
  textureKey: string;
  atlasKey: string;
  imagePath: string;
  atlasPath: string;
  loaded: boolean;
  error?: string;
}

/**
 * Mob configuration for spawning and behavior
 */
export interface MobConfig {
  name: string;
  textureKey: string;
  atlasKey: string;
  animations: MobAnimationConfig[];
  defaultAnimation: string;
  scale: number;
  health: number;
  speed: number;
  damage: number;
  collisionRadius: number;
}

/**
 * Mob loading result
 */
export interface MobLoadResult {
  success: boolean;
  mobName: string;
  error?: string;
}

/**
 * Mob loading progress information
 */
export interface MobLoadingProgress {
  totalMobs: number;
  loadedMobs: number;
  failedMobs: number;
  currentMob?: string;
  errors: string[];
}