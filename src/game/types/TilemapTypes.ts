/**
 * Type definitions for tilemap-related data structures
 */

// --- THIS INTERFACE WAS MISSING FROM YOUR FILE ---
/**
 * Defines the structure for setting up collisions on a tilemap layer.
 * Used by TilemapManager's setupCollisions method.
 */
export interface CollisionConfig {
  layerName: string;
  collisionTiles?: number[];
  collisionProperty?: string;
}

// --- THIS INTERFACE WAS MISSING FROM YOUR FILE ---
/**
 * Represents the data extracted from a Tiled object layer.
 * Used by TilemapManager's extractObjects method.
 */
export interface TiledObjectData {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties: Record<string, any>;
}

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
  collides?: boolean; // Your useful addition
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
  // Your useful addition for spawn points
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