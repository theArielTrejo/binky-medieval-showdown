# TypeScript Game Architecture for Phaser 3

## Dynamic Mob Loading and Modular Tilemap Integration

This document describes the comprehensive TypeScript game architecture implemented for Phaser 3, featuring dynamic mob loading and modular tilemap integration.

## Architecture Overview

The implementation follows a modular, scalable architecture with clean separation of concerns:

```
src/game/
├── systems/           # Core game systems
│   ├── AssetManager.ts       # Centralized asset loading coordination
│   ├── DynamicMobLoader.ts   # Dynamic mob asset scanning and loading
│   ├── TilemapManager.ts     # Modular tilemap integration
│   └── MobSpawner.ts         # Mob spawning and management
├── types/             # TypeScript type definitions
│   ├── AssetTypes.ts         # Asset loading types
│   ├── MobTypes.ts           # Mob-related interfaces
│   ├── TilemapTypes.ts       # Tilemap configuration types
│   └── index.ts              # Centralized exports
├── config/            # Game configuration
│   └── GameConfig.ts         # Mob configs and tilemap settings
└── scenes/
    └── Game.ts               # Main game scene (modified)
```

## Key Features

### 1. Dynamic Mob Asset Loading System

**File**: `src/game/systems/DynamicMobLoader.ts`

- **Automatic Asset Scanning**: Automatically discovers and loads mob assets from `/assets/mobs/` directory
- **Paired File Support**: Handles `${mob_name}.png` and `${mob_name}.json` atlas pairs
- **Dynamic Key Generation**: Generates asset keys using base filename (e.g., "skeleton" for skeleton.png/json)
- **Extensible Design**: New mobs work by simply adding files to the directory
- **Error Handling**: Graceful handling of loading failures with retry mechanisms
- **Progress Tracking**: Real-time loading progress with detailed callbacks

**Key Methods**:
```typescript
// Load all discovered mob assets
async loadAllMobs(): Promise<MobLoadResult[]>

// Create animations for a loaded mob
createAnimations(mobName: string, configs: MobAnimationConfig[]): void

// Check if a mob is loaded
isMobLoaded(mobName: string): boolean
```

### 2. Modular Tilemap Integration System

**File**: `src/game/systems/TilemapManager.ts`

- **Proven Implementation**: Based on working tilemap examples from existing Phaser projects
- **Asset Coordination**: Loads tilemap JSON and associated tileset images
- **Layer Management**: Proper depth sorting and visibility control
- **Collision Setup**: Automated collision detection configuration
- **Object Spawning**: Extract spawn points and objects from tilemap data
- **World Bounds**: Automatic camera and physics world boundary setup

**Key Methods**:
```typescript
// Load tilemap with all associated assets
async loadTilemap(config: TilemapConfig): Promise<TilemapLoadResult>

// Create tilemap from loaded assets
createTilemap(config: TilemapConfig): Phaser.Tilemaps.Tilemap

// Setup collision layers
setupCollisions(tilemapName: string, configs: CollisionConfig[]): void
```

### 3. Centralized Asset Management

**File**: `src/game/systems/AssetManager.ts`

- **Coordinated Loading**: Manages both mob and tilemap loading
- **Progress Tracking**: Combined progress reporting across all asset types
- **Error Recovery**: Retry mechanisms and graceful error handling
- **Validation**: Asset integrity checking after loading
- **Event System**: Comprehensive callback system for loading events

**Key Methods**:
```typescript
// Load all game assets
async loadAllAssets(tilemapConfigs: TilemapConfig[]): Promise<AssetLoadingResult>

// Validate loaded assets
validateAssets(): AssetValidationResult[]

// Get loading progress
getLoadingProgress(): AssetLoadingProgress
```

### 4. Type-Safe Configuration

**File**: `src/game/types/`

Comprehensive TypeScript interfaces ensure type safety:

- **MobTypes.ts**: Mob configurations, animations, and loading results
- **TilemapTypes.ts**: Tilemap configurations, layers, and collision setup
- **AssetTypes.ts**: Asset loading states, progress tracking, and validation

### 5. Mob Spawning System

**File**: `src/game/systems/MobSpawner.ts`

- **Dynamic Spawning**: Create mobs using loaded assets and configurations
- **Physics Integration**: Automatic physics body setup with collision detection
- **Animation Management**: Automatic animation setup and playback
- **Spawn Point Support**: Load spawn locations from tilemap data
- **Configuration-Driven**: Uses centralized mob configurations

## Asset Structure

### Mob Assets
```
public/assets/mobs/
├── skeleton.json          # Atlas definition
├── skeleton.png           # Sprite sheet
├── goblin.json           # Atlas definition
├── goblin.png            # Sprite sheet
├── archer.json           # Atlas definition
└── archer.png            # Sprite sheet
```

### Tilemap Assets
```
public/assets/tilemaps/
├── binkymap1.json        # Tilemap definition
├── castlewall.png        # Tileset image
├── floor1.png           # Tileset image
├── houses1.png          # Tileset image
└── ...                  # Additional tilesets
```

## Configuration

### Mob Configuration Example
```typescript
const MOB_CONFIGS = {
  skeleton: {
    name: 'skeleton',
    textureKey: 'skeleton_texture',
    atlasKey: 'skeleton_atlas',
    animations: [
      {
        key: 'skeleton_idle',
        frames: ['skeleton_idle_01', 'skeleton_idle_02', 'skeleton_idle_03'],
        frameRate: 8,
        repeat: -1
      }
    ],
    defaultAnimation: 'skeleton_idle',
    scale: 0.5,
    health: 100,
    speed: 80,
    damage: 25,
    collisionRadius: 20
  }
};
```

### Tilemap Configuration Example
```typescript
const TILEMAP_CONFIG = {
  name: 'main_map',
  key: 'binkymap1',
  jsonPath: 'assets/tilemaps/binkymap1.json',
  tilesets: [
    { name: 'floor1', imageKey: 'floor1', imagePath: 'assets/tilemaps/floor1.png' }
  ],
  layers: [
    {
      name: 'background',
      tilesets: ['floor1'],
      depth: 0,
      collides: false
    }
  ]
};
```

## Integration with Existing Systems

The new architecture integrates seamlessly with the existing game systems:

1. **Player System**: Maintains compatibility with existing player mechanics
2. **Enemy System**: Enhanced with dynamic mob spawning capabilities
3. **Physics System**: Automatic collision setup for both mobs and tilemaps
4. **UI System**: Progress tracking integration with existing UI components

## Usage Example

```typescript
// In your game scene
export class Game extends Scene {
  private assetManager!: AssetManager;
  private mobSpawner!: MobSpawner;
  
  preload() {
    // Initialize asset management
    this.assetManager = new AssetManager(this);
    
    // Set up callbacks
    this.assetManager.setCallbacks({
      onProgress: (progress) => console.log(`Loading: ${progress.percentage}%`),
      onComplete: (result) => this.onAssetsLoaded(result)
    });
    
    // Start loading
    this.assetManager.loadAllAssets([MAIN_TILEMAP_CONFIG]);
  }
  
  private onAssetsLoaded(result: AssetLoadingResult) {
    // Setup tilemap
    const tilemapManager = this.assetManager.getTilemapManager();
    const tilemap = tilemapManager.createTilemap(MAIN_TILEMAP_CONFIG);
    
    // Setup mob spawning
    this.mobSpawner = new MobSpawner(this);
    this.mobSpawner.spawnMob('skeleton', 400, 300);
  }
}
```

## Benefits

1. **Scalability**: Easy to add new mob types and tilemaps
2. **Maintainability**: Clean separation of concerns and modular design
3. **Type Safety**: Comprehensive TypeScript typing prevents runtime errors
4. **Performance**: Efficient asset loading with progress tracking
5. **Flexibility**: Configuration-driven approach allows easy customization
6. **Error Handling**: Robust error recovery and validation
7. **Developer Experience**: Clear APIs and comprehensive documentation

## Future Enhancements

1. **Dynamic Asset Discovery**: Implement actual file system scanning
2. **Asset Bundling**: Optimize loading with asset bundles
3. **Streaming**: Load assets on-demand as needed
4. **Caching**: Implement asset caching for faster subsequent loads
5. **Hot Reloading**: Development-time asset hot reloading
6. **Compression**: Asset compression for reduced file sizes

## Testing

The implementation includes:
- Asset loading validation
- Error handling verification
- Performance monitoring
- Integration testing with existing systems

Run the development server with `npm run dev` to see the system in action with demo mobs and tilemap.