/**
 * Game Configuration
 * Defines mob configurations and tilemap settings for the game
 */

import { MobConfig, MobAnimationConfig } from '../types/MobTypes';
import { TilemapConfig } from '../types/TilemapTypes';

/**
 * Mob configurations for all available mobs
 */
export const MOB_CONFIGS: { [key: string]: MobConfig } = {
  skeleton: {
    name: 'skeleton',
    textureKey: 'skeleton_texture',
    atlasKey: 'skeleton_atlas',
    animations: [
      {
        key: 'skeleton_idle',
        frames: [
          '0_Skeleton_Viking_Idle_000', '0_Skeleton_Viking_Idle_001', '0_Skeleton_Viking_Idle_002', '0_Skeleton_Viking_Idle_003',
          '0_Skeleton_Viking_Idle_004', '0_Skeleton_Viking_Idle_005', '0_Skeleton_Viking_Idle_006', '0_Skeleton_Viking_Idle_007',
          '0_Skeleton_Viking_Idle_008', '0_Skeleton_Viking_Idle_009', '0_Skeleton_Viking_Idle_010', '0_Skeleton_Viking_Idle_011'
        ],
        frameRate: 8,
        repeat: -1
      },
      {
        key: 'skeleton_walk',
        frames: [
          '0_Skeleton_Viking_Running_000', '0_Skeleton_Viking_Running_001', '0_Skeleton_Viking_Running_002', '0_Skeleton_Viking_Running_003',
          '0_Skeleton_Viking_Running_004', '0_Skeleton_Viking_Running_005', '0_Skeleton_Viking_Running_006', '0_Skeleton_Viking_Running_007'
        ],
        frameRate: 12,
        repeat: -1
      },
      {
        key: 'skeleton_attack',
        frames: [
          '0_Skeleton_Viking_Slashing_000', '0_Skeleton_Viking_Slashing_001', '0_Skeleton_Viking_Slashing_002', '0_Skeleton_Viking_Slashing_003',
          '0_Skeleton_Viking_Slashing_004', '0_Skeleton_Viking_Slashing_005'
        ],
        frameRate: 15,
        repeat: 0
      },
      {
        key: 'skeleton_death',
        frames: [
          '0_Skeleton_Viking_Dying_000', '0_Skeleton_Viking_Dying_001', '0_Skeleton_Viking_Dying_002', '0_Skeleton_Viking_Dying_003',
          '0_Skeleton_Viking_Dying_004', '0_Skeleton_Viking_Dying_005', '0_Skeleton_Viking_Dying_006', '0_Skeleton_Viking_Dying_007'
        ],
        frameRate: 10,
        repeat: 0
      }
    ],
    defaultAnimation: 'skeleton_idle',
    scale: 0.5,
    health: 100,
    speed: 80,
    damage: 25,
    collisionRadius: 20
  },

  
  archer: {
    name: 'archer',
    textureKey: 'archer_texture',
    atlasKey: 'archer_atlas',
    animations: [
      {
        key: 'archer_idle',
        frames: [
          '0_Archer_Idle_000', '0_Archer_Idle_001', '0_Archer_Idle_002', '0_Archer_Idle_003',
          '0_Archer_Idle_004', '0_Archer_Idle_005', '0_Archer_Idle_006', '0_Archer_Idle_007',
          '0_Archer_Idle_008', '0_Archer_Idle_009', '0_Archer_Idle_010', '0_Archer_Idle_011',
          '0_Archer_Idle_012', '0_Archer_Idle_013', '0_Archer_Idle_014', '0_Archer_Idle_015',
          '0_Archer_Idle_016', '0_Archer_Idle_017'
        ],
        frameRate: 12,
        repeat: -1
      }
    ],
    defaultAnimation: 'archer_idle',
    scale: 0.3,
    health: 80,
    speed: 100,
    damage: 30,
    collisionRadius: 18
  }
};

/**
 * Tilemap configuration for the main game map
 */
export const MAIN_TILEMAP_CONFIG: TilemapConfig = {
  name: 'main_map',
  key: 'binkymap1',
  jsonPath: 'assets/tilemaps/binkymap1.json',
  tilesets: [
    { name: 'castlewall', imageKey: 'castlewall', imagePath: 'assets/tilemaps/castlewall.png' },
    { name: 'floor1', imageKey: 'floor1', imagePath: 'assets/tilemaps/floor1.png' },
    { name: 'objectskeletonstatues', imageKey: 'objectskeletonstatues', imagePath: 'assets/tilemaps/objectskeletonstatues.png' },
    { name: 'tiledwallandfloor', imageKey: 'tiledwallandfloor', imagePath: 'assets/tilemaps/tiledwallandfloor.png' },
    { name: 'GraveyardTileset', imageKey: 'GraveyardTileset', imagePath: 'assets/tilemaps/GraveyardTileset.png' },
    { name: 'houses1', imageKey: 'houses1', imagePath: 'assets/tilemaps/houses1.png' },
    { name: 'objectbrickstools', imageKey: 'objectbrickstools', imagePath: 'assets/tilemaps/objectbrickstools.png' },
    { name: 'objecthouserocksstatues', imageKey: 'objecthouserocksstatues', imagePath: 'assets/tilemaps/objecthouserocksstatues.png' },
    { name: 'objectlogs', imageKey: 'objectlogs', imagePath: 'assets/tilemaps/objectlogs.png' },
    { name: 'tents', imageKey: 'tents', imagePath: 'assets/tilemaps/tents.png' },
    { name: 'treesandplants', imageKey: 'treesandplants', imagePath: 'assets/tilemaps/treesandplants.png' },
    { name: 'waggonsandmore', imageKey: 'waggonsandmore', imagePath: 'assets/tilemaps/waggonsandmore.png' },
    { name: 'brokenspikedfence', imageKey: 'brokenspikedfence', imagePath: 'assets/tilemaps/brokenspikedfence.png' },
    { name: 'gatedoorandflags', imageKey: 'gatedoorandflags', imagePath: 'assets/tilemaps/gatedoorandflags.png' },
    { name: 'grassclippings1', imageKey: 'grassclippings1', imagePath: 'assets/tilemaps/grassclippings1.png' },
    { name: 'grassclippings2', imageKey: 'grassclippings2', imagePath: 'assets/tilemaps/grassclippings2.png' }
  ],
  layers: [
    {
      name: 'background',
      tilesets: ['castlewall', 'floor1', 'tiledwallandfloor', 'GraveyardTileset'],
      depth: 0,
      visible: true,
      collides: false
    },
    {
      name: 'foreground',
      tilesets: ['houses1', 'objectbrickstools', 'objecthouserocksstatues', 'objectlogs', 'tents', 'treesandplants', 'waggonsandmore'],
      depth: 1,
      visible: true,
      collides: true
    },
    {
      name: 'objects',
      tilesets: ['objectskeletonstatues', 'brokenspikedfence', 'gatedoorandflags', 'grassclippings1', 'grassclippings2'],
      depth: 2,
      visible: true,
      collides: false
    }
  ],
  spawnPoints: {
    player: [{ x: 400, y: 300 }],
    enemies: [
      { x: 600, y: 200, type: 'skeleton' },
      { x: 200, y: 500, type: 'archer' },
      { x: 800, y: 400, type: 'skeleton' }
    ],
    items: []
  }
};

/**
 * Collision configuration for tilemap layers
 */
export const COLLISION_CONFIG = [
  {
    layerName: 'foreground',
    collisionProperty: 'collides'
  }
];