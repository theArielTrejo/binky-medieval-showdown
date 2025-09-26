/**
 * Type definitions for tilemap-related data structures
 */

/**
 * Tileset configuration
 */
export interface TilesetConfig {
  name: string;
  imageKey: string;
  imagePath: string;
}

/**
 * Layer configuration for tilemap
 */
export interface LayerConfig {
  name: string;
  tilesets: string[];
  depth?: number;
  alpha?: number;
  visible?: boolean;
  collides?: boolean;
}

/**
 * Tilemap asset information
 */
export interface TilemapAsset {
  name: string;
  key: string;
  jsonPath: string;
  tilesets: TilesetConfig[];
  loaded: boolean;
  error?: string;
}

/**
 * Tilemap configuration
 */
export interface TilemapConfig {
  name: string;
  key: string;
  jsonPath: string;
  tilesets: TilesetConfig[];
  layers: LayerConfig[];
  worldBounds?: {
    width: number;
    height: number;
  };
  spawnPoints?: {
    player: { x: number; y: number }[];
    enemies: { x: number; y: number; type: string }[];
    items: { x: number; y: number; type: string }[];
  };
}

/**
 * Tilemap loading result
 */
export interface TilemapLoadResult {
  success: boolean;
  tilemapName: string;
  error?: string;
}

/**
 * Tilemap loading progress
 */
export interface TilemapLoadingProgress {
  totalAssets: number;
  loadedAssets: number;
  failedAssets: number;
  currentAsset?: string;
  errors: string[];
}