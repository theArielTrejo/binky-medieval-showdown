import { Scene } from 'phaser';
import { Player } from '../Player';
import { EnemySystem } from '../EnemySystem';
import { EnemyType } from '../types/EnemyTypes';
import { AIDirector } from '../AIDirector';
import { PlayerArchetypeType } from '../PlayerArchetype';
import { ClassSelectionUI } from '../../ui/ClassSelectionUI';
import { MobSpawnerUI } from '../../ui/MobSpawnerUI';
import { XPOrbSystem } from '../XPOrbSystem';
import { SpriteSheetManager } from '../systems/SpriteSheetManager';
import { TilemapManager } from '../systems/TilemapManager';
import { TilemapConfig } from '../types/TilemapTypes';

export class Game extends Scene {
    private player!: Player;
    private enemySystem!: EnemySystem;
    private aiDirector!: AIDirector;
    private classSelectionUI!: ClassSelectionUI;
    private mobSpawnerUI!: MobSpawnerUI;
    private xpOrbSystem!: XPOrbSystem;
    private tilemap!: Phaser.Tilemaps.Tilemap;
    private tilemapManager!: TilemapManager;
    private collisionLayers: Phaser.Tilemaps.TilemapLayer[] = [];
    private objectCollisionObstacles: any[] = [];
    private gameStarted: boolean = false;
    private selectedArchetype: PlayerArchetypeType | null = null;
    private spriteSheetManager!: SpriteSheetManager;
    // private readonly GAME_SCALE = 2; // Scaling factor for consistent proportions
    
    // Restart functionality properties
    private restartInstructionText: Phaser.GameObjects.Text | null = null;
    private gameOverText: Phaser.GameObjects.Text | null = null;

    constructor() {
        super('Game');
    }

    preload() {
        this.load.setPath('assets');
        this.load.image('logo', 'logo.png');
        
        // Load tilemap JSON
        this.load.tilemapTiledJSON('map', 'tilemaps/binkymap1.json');
        
        // Load ALL tileset images (complete set from tilemaps folder)
        this.load.image('floor1', 'tilemaps/floor1.png');
        this.load.image('GraveyardTileset', 'tilemaps/GraveyardTileset.png');
        this.load.image('tiledwallandfloor', 'tilemaps/tiledwallandfloor.png');
        this.load.image('gatedoorandflags', 'tilemaps/gatedoorandflags.png');
        this.load.image('castlewall', 'tilemaps/castlewall.png');
        this.load.image('objecthouserocksstatues', 'tilemaps/objecthouserocksstatues.png');
        this.load.image('houses1', 'tilemaps/houses1.png');
        this.load.image('treesandplants', 'tilemaps/treesandplants.png');
        this.load.image('objectlogs', 'tilemaps/objectlogs.png');
        this.load.image('objectskeletonstatues', 'tilemaps/objectskeletonstatues.png');
        this.load.image('grassclippings1', 'tilemaps/grassclippings1.png');
        this.load.image('waggonsandmore', 'tilemaps/waggonsandmore.png');
        this.load.image('brokenspikedfence', 'tilemaps/brokenspikedfence.png');
        this.load.image('tents', 'tilemaps/tents.png');
        this.load.image('farmhouses', 'tilemaps/farmhouses.png');
        this.load.image('farmgrass', 'tilemaps/farmgrass.png');
        this.load.image('farmobjects', 'tilemaps/farmobjects.png');
        this.load.image('collision', 'tilemaps/collision.png');
        this.load.image('D_CastleGate', 'tilemaps/D_CastleGate.png');
        this.load.image('Portcullis', 'tilemaps/Portcullis.png');
        this.load.image('grassclippings2', 'tilemaps/grassclippings2.png');
        this.load.image('objectbrickstools', 'tilemaps/objectbrickstools.png');

        // Load available assets only
        
        // Load XP orb (use existing green orb)
        // Load XP orb (match key used by XPOrb class)
        this.load.image('green_orb', 'images/green_orb.png');
        
        // Load player sprite (use first available character texture)

        // Load essential spritesheets (characters and mobs) for animations
        this.spriteSheetManager = new SpriteSheetManager(this);
        this.spriteSheetManager.loadEssentialSpritesheets();
    }

    create() {
        // console.log('Game scene created');
        
        // Enable crisp pixel rendering for better sprite quality
        // Use proper Phaser configuration for pixel-perfect rendering
        if (this.game.renderer.type === Phaser.WEBGL) {
            const gl = (this.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl;
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        }
        
        // Create tilemap exactly like the working example
        this.createTilemap();
        
        // Initialize UI systems
        this.initializeUI();
        
        // Create animations after all assets are loaded
        this.createAnimations();
        
        // Show class selection
        this.showClassSelection();
    }

    private createTilemap(): void {
        console.log('Creating tilemap with TilemapManager...');
        
        // Initialize TilemapManager
        this.tilemapManager = new TilemapManager(this);
        
        // Define tilemap configuration
        const tilemapConfig: TilemapConfig = {
            name: 'binkyMap',
            key: 'map',
            jsonPath: 'assets/tilemaps/binkymap1.json',
            tilesets: [
                { name: 'floor1', imageKey: 'floor1', imagePath: 'assets/tilemaps/floor1.png' },
                { name: 'GraveyardTileset', imageKey: 'GraveyardTileset', imagePath: 'assets/tilemaps/GraveyardTileset.png' },
                { name: 'tiledwallandfloor', imageKey: 'tiledwallandfloor', imagePath: 'assets/tilemaps/tiledwallandfloor.png' },
                { name: 'gatedoorandflags', imageKey: 'gatedoorandflags', imagePath: 'assets/tilemaps/gatedoorandflags.png' },
                { name: 'castlewall', imageKey: 'castlewall', imagePath: 'assets/tilemaps/castlewall.png' },
                { name: 'objecthouserocksstatues', imageKey: 'objecthouserocksstatues', imagePath: 'assets/tilemaps/objecthouserocksstatues.png' },
                { name: 'houses1', imageKey: 'houses1', imagePath: 'assets/tilemaps/houses1.png' },
                { name: 'treesandplants', imageKey: 'treesandplants', imagePath: 'assets/tilemaps/treesandplants.png' },
                { name: 'objectlogs', imageKey: 'objectlogs', imagePath: 'assets/tilemaps/objectlogs.png' },
                { name: 'objectskeletonstatues', imageKey: 'objectskeletonstatues', imagePath: 'assets/tilemaps/objectskeletonstatues.png' },
                { name: 'grassclippings1', imageKey: 'grassclippings1', imagePath: 'assets/tilemaps/grassclippings1.png' },
                { name: 'waggonsandmore', imageKey: 'waggonsandmore', imagePath: 'assets/tilemaps/waggonsandmore.png' },
                { name: 'brokenspikedfence', imageKey: 'brokenspikedfence', imagePath: 'assets/tilemaps/brokenspikedfence.png' },
                { name: 'tents', imageKey: 'tents', imagePath: 'assets/tilemaps/tents.png' },
                { name: 'farmhouses', imageKey: 'farmhouses', imagePath: 'assets/tilemaps/farmhouses.png' },
                { name: 'farmgrass', imageKey: 'farmgrass', imagePath: 'assets/tilemaps/farmgrass.png' },
                { name: 'farmobjects', imageKey: 'farmobjects', imagePath: 'assets/tilemaps/farmobjects.png' },
                { name: 'collision', imageKey: 'collision', imagePath: 'assets/tilemaps/collision.png' },
                { name: 'D_CastleGate', imageKey: 'D_CastleGate', imagePath: 'assets/tilemaps/D_CastleGate.png' },
                { name: 'Portcullis', imageKey: 'Portcullis', imagePath: 'assets/tilemaps/Portcullis.png' },
                { name: 'grassclippings2', imageKey: 'grassclippings2', imagePath: 'assets/tilemaps/grassclippings2.png' },
                { name: 'objectbrickstools', imageKey: 'objectbrickstools', imagePath: 'assets/tilemaps/objectbrickstools.png' }
            ],
            layers: [
                { name: 'background', tilesets: [], depth: 0, visible: true, collides: false },
                { name: 'foreground', tilesets: [], depth: 1, visible: true, collides: false }, // Houses, walls, buildings
                { name: 'objects', tilesets: [], depth: 2, visible: true, collides: false }, // Decorative only (grass, small rocks, etc.)
                { name: 'foregroundobjects', tilesets: [], depth: 4, visible: true, collides: false }, // Solid structures
                { name: 'Trees', tilesets: [], depth: 5, visible: true, collides: false }, // Trees are solid
                { name: 'collisions', tilesets: [], visible: true, collides: true }, // Dedicated collision layer
                { name: 'objectcollisions', tilesets: [], visible: true, collides: true } // Object collision layer
            ]
        };
        
        // Register the already loaded tilemap assets
        this.tilemapManager.registerLoadedTilemap(tilemapConfig);
        
        // Create the tilemap
        const map = this.tilemapManager.createTilemap(tilemapConfig);
        if (!map) {
            console.error('Failed to create tilemap');
            return;
        }
        
        this.tilemap = map;
        
        // Apply scaling for consistent proportions
        //this.tilemapManager.applyScaling('binkyMap', this.GAME_SCALE);
        
        // Set up collision system exactly like the working example
        const collisionsLayer = map.getLayer('collisions')?.tilemapLayer;
        if (collisionsLayer) {
            // Mark every non-empty tile as collidable (like the example)
            collisionsLayer.setCollisionByExclusion([-1]);
            // Keep collision layer visible for debugging (can be set to false later)
            collisionsLayer.setVisible(false);
            this.collisionLayers.push(collisionsLayer);
        }
        
        // Handle object collisions from objectcollisions layer (like the example)
        const objectCollisionLayer = map.getObjectLayer('objectcollisions');
        if (objectCollisionLayer) {
            const obstacles = objectCollisionLayer.objects || [];
            console.log('Found', obstacles.length, 'object collision obstacles');
            
            // Store obstacles for later use in initializeGameSystems
            this.objectCollisionObstacles = obstacles;
        }
        
        // Set up camera bounds (scaled)
        const scaledWidth = map.widthInPixels; //* this.GAME_SCALE;
        const scaledHeight = map.heightInPixels; //* this.GAME_SCALE;
        
        console.log('Tilemap created successfully with TilemapManager');
        console.log('Map dimensions (scaled):', scaledWidth, 'x', scaledHeight);
        console.log('Collision layers:', this.collisionLayers.length);
    }

    private initializeUI(): void {
        // Initialize Enhanced Design System
        // EnhancedDesignSystem.initialize(this); // Temporarily disabled due to TypeError
        
        // Create Class Selection UI
        this.classSelectionUI = new ClassSelectionUI(this, {
            onClassSelected: (archetype) => {
                this.selectedArchetype = archetype;
                this.startGame();
            }
        });
    }

    private showClassSelection(): void {
        this.classSelectionUI.show();
    }

    private startGame(): void {
        if (this.gameStarted || !this.selectedArchetype) return;
        
        this.gameStarted = true;
        // console.log('Starting game with archetype:', this.selectedArchetype);
        
        // Hide class selection
        this.classSelectionUI.hide();
        
        // Initialize game systems
        this.initializeGameSystems();
    }

    private initializeGameSystems(): void {
        // Try to use spawn point from tilemap (like the example)
        let spawnX, spawnY;
        
        const spawnLayer = this.tilemap.getObjectLayer('StartSpawnPoint');
        if (spawnLayer) {
            const spawnPoint = this.tilemap.findObject('StartSpawnPoint', obj => obj.name === 'playerSpawn');
            if (spawnPoint && spawnPoint.x !== undefined && spawnPoint.y !== undefined) {
                spawnX = spawnPoint.x; //* this.GAME_SCALE;
                spawnY = spawnPoint.y; //* this.GAME_SCALE;
                console.log('Using tilemap spawn point:', spawnX, spawnY);
            }
        }
        
        // Fallback to top right area if no spawn point found
        if (!spawnX || !spawnY) {
            const mapWidth = this.tilemap.widthInPixels; //* this.GAME_SCALE;
            const mapHeight = this.tilemap.heightInPixels; //* this.GAME_SCALE;
            spawnX = mapWidth * 0.70; // 70% to the right (top right area, closer to center)
            spawnY = mapHeight * 0.30; // 30% from top (top right area, closer to center)
            console.log('Using fallback spawn position:', spawnX, spawnY);
        }
        
        this.player = new Player(this, spawnX, spawnY, this.selectedArchetype!);
        
        // Scale the player sprite to match the tilemap scaling
        this.player.sprite.setScale(0.05); //* this.GAME_SCALE);
        
        // Set up tilemap collision detection for player
        this.setupPlayerTilemapCollisions();

        // Initialize XP Orb System
        this.xpOrbSystem = new XPOrbSystem(this);
        
        // TO SHOW MOBS UNCOMMENT Enemy System & AI Director
        // Initialize Enemy System 
        //this.enemySystem = new EnemySystem(this, this.player, this.xpOrbSystem);
        
        // Initialize AI Director
        //this.aiDirector = new AIDirector();
        
        // Initialize Enhanced Mob Spawner UI
        this.mobSpawnerUI = new MobSpawnerUI(this);
        this.mobSpawnerUI.setSpawnCallback((type: EnemyType, x: number, y: number) => {
            this.spawnEnemyAtPosition(type, x, y);
        });
        
        // --- CAMERA SETUP (matches JS version) ---
        const mapWidth = this.tilemap.widthInPixels;
        const mapHeight = this.tilemap.heightInPixels;

        // ✅ Match JS exactly
        const camera = this.cameras.main;
        camera.startFollow(this.player.sprite, true, 0.1, 0.1);
        camera.setZoom(3);
        camera.setBounds(0, 0, this.tilemap.widthInPixels, this.tilemap.heightInPixels);

        // Optional smooth camera lag (for cinematic movement)
        camera.setLerp(0.15, 0.15);

        // ✅ Center camera on spawn when starting (prevents snapping)
        camera.centerOn(this.player.sprite.x, this.player.sprite.y);
        
        // Start spawning enemies
        this.enemySystem.startSpawning();
        
        // Verify visuals: auto-spawn key mobs near player
        this.spawnEnemyAtPosition(EnemyType.ARCHER, spawnX + 80, spawnY);
        this.spawnEnemyAtPosition(EnemyType.GOLEM, spawnX + 140, spawnY);
        this.spawnEnemyAtPosition(EnemyType.GNOLL, spawnX + 200, spawnY);
        
        // Add restart instruction
        this.restartInstructionText = this.add.text(512, 750, 'Press R to restart and choose a different archetype', {
            fontSize: '14px',
            color: '#cccccc'
        }).setOrigin(0.5);
        this.restartInstructionText.setScrollFactor(0); // Make UI fixed to screen
        
        // Add restart key handler
        this.input.keyboard!.on('keydown-R', () => {
            this.restartGame();
        });
        
        console.log('Game systems initialized with simplified collision system');
        console.log('Player spawn position (top right, closer to center):', spawnX, spawnY);
        console.log('Player scale:', 0.05); // * this.GAME_SCALE);
    }

    private restartGame(): void {
        // Clean up current game
        if (this.player) {
            this.player.destroy();
        }
        if (this.enemySystem) {
            this.enemySystem.clearAllEnemies();
            this.enemySystem.clearAllAttacks(); // Clear all enemy attack objects
        }
        if (this.xpOrbSystem) {
            this.xpOrbSystem.clearAllOrbs();
        }
        
        // Remove game over text if it exists
        if (this.gameOverText) {
            this.gameOverText.destroy();
            this.gameOverText = null;
        }
        
        // Clean up game over restart instruction text
        if ((this as any).gameOverRestartText) {
            (this as any).gameOverRestartText.destroy();
            (this as any).gameOverRestartText = null;
        }
        
        // Clean up restart instruction text
        if (this.restartInstructionText) {
            this.restartInstructionText.destroy();
            this.restartInstructionText = null;
        }
        
        // Reset state
        this.gameStarted = false;
        this.selectedArchetype = null;
        
        // Show class selection again
        this.showClassSelection();
    }

    private handleGameOver(): void {
        // Stop enemy spawning and clear all attacks
        if (this.enemySystem) {
            this.enemySystem.stopSpawning();
            this.enemySystem.clearAllAttacks(); // Clear all enemy attack objects
        }
        
        // Display game over message
        this.gameOverText = this.add.text(512, 300, 'GAME OVER', {
            fontSize: '48px',
            color: '#ff0000',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.gameOverText.setScrollFactor(0); // Make UI fixed to screen
        
        // Display restart instruction (store reference for cleanup)
        const restartText = this.add.text(512, 350, 'Press R to try a different archetype', {
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0.5);
        restartText.setScrollFactor(0); // Make UI fixed to screen
        
        // Store reference for cleanup during restart
        (this as any).gameOverRestartText = restartText;
    }

    private debugEnabled = true; // start ON so you can see everything
    private collisionDebugGfx!: Phaser.GameObjects.Graphics;
    private playerDebugGfx!: Phaser.GameObjects.Graphics;
    private objectRects: Phaser.GameObjects.Rectangle[] = [];

    private setupPlayerTilemapCollisions(): void {
    // --- Tile layer collisions ---
    this.collisionLayers.forEach(layer => {
        this.physics.add.collider(this.player.sprite, layer);
    });

    // --- Object rectangles from "objectcollisions" ---
    this.objectRects = []; // reset in case of restart

    this.objectCollisionObstacles.forEach(obj => {
        // Tiled objects are top-left; Arcade bodies are center-based
        const x = obj.x + obj.width / 2;
        const y = obj.y + obj.height / 2;

        const rect = this.add
        .rectangle(x, y, obj.width, obj.height)
        .setOrigin(0.5)
        .setVisible(false);         // keep invisible; we’ll draw debug separately

        // Add STATIC physics body
        this.physics.add.existing(rect, true);

        // Collide player with this static rect
        this.physics.add.collider(this.player.sprite, rect);

        // Keep a reference for debug drawing
        this.objectRects.push(rect);
    });

    // --- Create debug graphics layers (on top) ---
    this.collisionDebugGfx = this.add.graphics().setDepth(10000).setAlpha(0.85);
    this.playerDebugGfx = this.add.graphics().setDepth(10001).setAlpha(0.95);

    // --- Hotkey to toggle debug ---
    this.input.keyboard!.on('keydown-F1', () => {
        this.debugEnabled = !this.debugEnabled;
        this.collisionDebugGfx.clear();
        this.playerDebugGfx.clear();
    });

    console.log(
        `✅ Player collision setup: ${this.collisionLayers.length} tile layers + ${this.objectRects.length} object rects`
    );
    }

    private renderCollisionDebug(): void {
    if (!this.debugEnabled) return;

    // Clear previous frame
    this.collisionDebugGfx.clear();
    this.playerDebugGfx.clear();

    // 1) Colliding Tiles (orange)
    this.collisionLayers.forEach(layer => {
        // Phaser has a debug helper for tile collisions:
        layer.renderDebug(this.collisionDebugGfx, {
        tileColor: null, // non-colliding tiles
        collidingTileColor: new Phaser.Display.Color(243, 134, 48, 180), // orange
        faceColor: new Phaser.Display.Color(40, 39, 37, 255)            // faces
        });
    });

    // 2) Object Rectangles (red outlines)
    this.collisionDebugGfx.lineStyle(2, 0xff0000, 1);
    this.objectRects.forEach(rect => {
        const body = (rect.body as Phaser.Physics.Arcade.StaticBody);
        // Static body has x/y/width/height in world coords
        this.collisionDebugGfx.strokeRect(body.x, body.y, body.width, body.height);
    });

    // 3) Player body (lime outline)
    const pb = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    this.playerDebugGfx.lineStyle(2, 0x00ff00, 1);
    this.playerDebugGfx.strokeRect(pb.x, pb.y, pb.width, pb.height);
    }


    private createAnimations(): void {
        // console.log(' Starting animation creation...');
        
        // Player animations from ALL loaded character atlases
        const characterAtlasKeys = this.spriteSheetManager
            ? this.spriteSheetManager.getSpritesheetKeys('characters').filter(k => this.spriteSheetManager!.isSpritesheetLoaded(k))
            : [];
        if (this.spriteSheetManager && characterAtlasKeys.length) {
            // Aggregate frames across all loaded character atlases and keep their atlas key
            const charFramesWithKey: { key: string; frame: string }[] = [];
            for (const atlasKey of characterAtlasKeys) {
                const names = this.spriteSheetManager.getFrameNames(atlasKey);
                for (const n of names) charFramesWithKey.push({ key: atlasKey, frame: n });
            }
            
            // Debug: Log all available frames to understand naming patterns
            console.log('🔍 All available character frames:', charFramesWithKey.length);
            console.log('First 10 frames:', charFramesWithKey.slice(0, 10));
            console.log('Sample frame names:', charFramesWithKey.filter((_, i) => i % 50 === 0).map(f => f.frame));

            // Helper: sort frames by numeric suffix for correct animation order
            const sortByNumericIndex = (entries: { key: string; frame: string }[]): { key: string; frame: string }[] => {
                return entries.slice().sort((a, b) => {
                    // Try multiple patterns to extract frame numbers
                    const getFrameNumber = (name: string): number => {
                        // Pattern 1: ending with _XXX.png
                        let match = name.match(/_(\d+)\.png$/i);
                        if (match) return parseInt(match[1], 10);
                        
                        // Pattern 2: ending with XXX.png
                        match = name.match(/(\d+)\.png$/i);
                        if (match) return parseInt(match[1], 10);
                        
                        // Pattern 3: any number in the filename
                        match = name.match(/(\d+)/);
                        if (match) return parseInt(match[1], 10);
                        
                        return 0;
                    };
                    
                    return getFrameNumber(a.frame) - getFrameNumber(b.frame);
                });
            };

            // Enhanced frame grouping with better pattern matching
            type FrameEntry = { key: string; frame: string };
            type GroupFrames = { idle: FrameEntry[]; move: FrameEntry[]; characterVariant: string };
            const groups = new Map<string, GroupFrames>();
            
            for (const f of charFramesWithKey) {
                // Match pattern: characters/[class]/[variant]/
                const match = f.frame.match(/^characters\/([^\/]+)\/([^\/]+)\//);
                if (match) {
                    const [, , characterVariant] = match;
                    const groupId = characterVariant; // Use variant as the key (e.g., "Magician_1", "Knight_2")
                    const g = groups.get(groupId) || { idle: [], move: [], characterVariant };
                    
                    // Enhanced animation type detection
                    const isIdleAnimation = (name: string): boolean => {
                        const lowerName = name.toLowerCase();
                        return (lowerName.includes('idle') && !lowerName.includes('blinking')) ||
                               lowerName.includes('/idle/');
                    };
                    
                    const isMoveAnimation = (name: string): boolean => {
                        const lowerName = name.toLowerCase();
                        return lowerName.includes('walking') || 
                               lowerName.includes('running') ||
                               lowerName.includes('/walking/') ||
                               lowerName.includes('/running/') ||
                               lowerName.includes('run throwing') ||
                               lowerName.includes('run shooting');
                    };
                    
                    // Prioritize proper idle animations
                    if (isIdleAnimation(f.frame)) {
                        g.idle.push(f);
                    }
                    // Use walking/running for movement
                    else if (isMoveAnimation(f.frame)) {
                        g.move.push(f);
                    }
                    
                    groups.set(groupId, g);
                }
            }

            console.log('🎭 Found character variants:', Array.from(groups.keys()));

            // Direction helpers
            const isRightPath = (name: string): boolean => /\/(Right)\//i.test(name) || /_Right[_\.]?/i.test(name);
            const isLeftPath = (name: string): boolean => /\/(Left)\//i.test(name) || /_Left[_\.]?/i.test(name);
            const isNeutralPath = (name: string): boolean => !isRightPath(name) && !isLeftPath(name);
            const filterRightOrNeutral = (frames: FrameEntry[]): FrameEntry[] => {
                const right = frames.filter(f => isRightPath(f.frame));
                const neutral = frames.filter(f => isNeutralPath(f.frame));
                return right.length ? right : neutral;
            };
            const filterLeftOnly = (frames: FrameEntry[]): FrameEntry[] => frames.filter(f => isLeftPath(f.frame));

            // Create animations for each character variant
            for (const [characterVariant, g] of groups) {
                let chosenIdle: FrameEntry[] = [];
                let chosenMove: FrameEntry[] = [];
                
                // First priority: variants with proper idle and movement animations
                if (g.idle.length && g.move.length) {
                    chosenIdle = sortByNumericIndex(filterRightOrNeutral(g.idle));
                    chosenMove = sortByNumericIndex(filterRightOrNeutral(g.move));
                    console.log(`✅ Using character variant: ${characterVariant} (idle: ${g.idle.length}, move: ${g.move.length})`);
                }

                // Fallback: if variant has no proper animations, use slashing animations
                if (!chosenIdle.length || !chosenMove.length) {
                    console.log(`⚠️ No proper idle/move found for ${characterVariant}, searching for fallback animations`);
                    
                    // Look for slashing animations for this specific variant
                    const variantFrames = charFramesWithKey.filter(f => {
                        const match = f.frame.match(/^characters\/([^\/]+)\/([^\/]+)\//);
                        return match && match[2] === characterVariant;
                    });
                    
                    for (const f of variantFrames) {
                        const lower = f.frame.toLowerCase();
                        // Use "Slashing" for idle (stationary attack animation)
                        if ((lower.includes('slashing') && !lower.includes('run')) || lower.includes('/slashing/')) {
                            chosenIdle.push(f);
                        }
                        // Use "Run Slashing" for movement
                        if (lower.includes('run slashing') || lower.includes('/run slashing/')) {
                            chosenMove.push(f);
                        }
                    }
                    
                    if (chosenIdle.length || chosenMove.length) {
                        chosenIdle = sortByNumericIndex(filterRightOrNeutral(chosenIdle));
                        chosenMove = sortByNumericIndex(filterRightOrNeutral(chosenMove));
                        console.log(`🔄 Using character variant: ${characterVariant} with slashing animations (idle: ${chosenIdle.length}, move: ${chosenMove.length})`);
                    }
                }

                console.log(`🎬 Character animation frames found for ${characterVariant}:`);
                console.log(`  Idle frames: ${chosenIdle.length}`, chosenIdle.slice(0, 3));
                console.log(`  Move frames: ${chosenMove.length}`, chosenMove.slice(0, 3));

                // Create variant-specific animations with error handling
                const idleAnimKey = `${characterVariant}_idle`;
                const walkAnimKey = `${characterVariant}_walk`;
                // Also create directional animations when left frames exist
                const leftIdleFrames = sortByNumericIndex(filterLeftOnly(g.idle));
                const leftMoveFrames = sortByNumericIndex(filterLeftOnly(g.move));
                const walkRightKey = `${characterVariant}_walk_right`;
                const walkLeftKey = `${characterVariant}_walk_left`;
                const idleRightKey = `${characterVariant}_idle_right`;
                const idleLeftKey = `${characterVariant}_idle_left`;

                if (chosenIdle.length && !this.anims.exists(idleAnimKey)) {
                    try {
                        // Use frames across atlases
                        const idleFrames = chosenIdle.map(entry => ({ key: entry.key, frame: entry.frame }));
                        console.log(`🎬 Creating ${idleAnimKey} animation with frames:`, idleFrames.slice(0, 3));
                        this.anims.create({
                            key: idleAnimKey,
                            frames: idleFrames,
                            frameRate: 12, // Increased from 8 for smoother animation
                            repeat: -1
                        });
                        console.log(`✅ Created ${idleAnimKey} animation with ${idleFrames.length} frames`);
                    } catch (error) {
                        console.error(`❌ Failed to create ${idleAnimKey} animation:`, error);
                    }
                } else if (!chosenIdle.length) {
                    console.warn(`⚠️ No idle frames found for ${characterVariant} animation`);
                } else {
                    console.log(`ℹ️ ${idleAnimKey} animation already exists`);
                }

                // Directional idle if available
                if (leftIdleFrames.length && !this.anims.exists(idleLeftKey)) {
                    try {
                        const frames = leftIdleFrames.map(entry => ({ key: entry.key, frame: entry.frame }));
                        this.anims.create({ key: idleLeftKey, frames, frameRate: 12, repeat: -1 });
                    } catch (error) {
                        console.error(`❌ Failed to create ${idleLeftKey}:`, error);
                    }
                }
                if (chosenIdle.length && !this.anims.exists(idleRightKey)) {
                    try {
                        const frames = chosenIdle.map(entry => ({ key: entry.key, frame: entry.frame }));
                        this.anims.create({ key: idleRightKey, frames, frameRate: 12, repeat: -1 });
                    } catch (error) {
                        console.error(`❌ Failed to create ${idleRightKey}:`, error);
                    }
                }

                if (chosenMove.length && !this.anims.exists(walkAnimKey)) {
                    try {
                        // Use frames across atlases
                        const moveFrames = chosenMove.map(entry => ({ key: entry.key, frame: entry.frame }));
                        console.log(`🎬 Creating ${walkAnimKey} animation with frames:`, moveFrames.slice(0, 3));
                        this.anims.create({
                            key: walkAnimKey,
                            frames: moveFrames,
                            frameRate: 16, // Increased from 10 for smoother animation
                            repeat: -1
                        });
                        console.log(`✅ Created ${walkAnimKey} animation with ${moveFrames.length} frames`);
                    } catch (error) {
                        console.error(`❌ Failed to create ${walkAnimKey} animation:`, error);
                    }
                } else if (!chosenMove.length) {
                    console.warn(`⚠️ No move frames found for ${characterVariant} animation`);
                } else {
                    console.log(`ℹ️ ${walkAnimKey} animation already exists`);
                }

                // Directional move animations if available
                if (leftMoveFrames.length && !this.anims.exists(walkLeftKey)) {
                    try {
                        const frames = leftMoveFrames.map(entry => ({ key: entry.key, frame: entry.frame }));
                        this.anims.create({ key: walkLeftKey, frames, frameRate: 16, repeat: -1 });
                    } catch (error) {
                        console.error(`❌ Failed to create ${walkLeftKey}:`, error);
                    }
                }
                if (chosenMove.length && !this.anims.exists(walkRightKey)) {
                    try {
                        const frames = chosenMove.map(entry => ({ key: entry.key, frame: entry.frame }));
                        this.anims.create({ key: walkRightKey, frames, frameRate: 16, repeat: -1 });
                    } catch (error) {
                        console.error(`❌ Failed to create ${walkRightKey}:`, error);
                    }
                }
            } // End of character variant loop

            // Create fallback generic animations if they don't exist
            if (!this.anims.exists('player_idle') || !this.anims.exists('player_walk')) {
                console.log('🔄 Creating fallback player animations...');
                // Use the first available character variant for fallback
                const firstVariant = groups.keys().next().value;
                if (firstVariant) {
                    const fallbackGroup = groups.get(firstVariant);
                    if (fallbackGroup) {
                        if (!this.anims.exists('player_idle') && fallbackGroup.idle.length) {
                            try {
                                const idleFrames = sortByNumericIndex(fallbackGroup.idle).map(entry => ({ key: entry.key, frame: entry.frame }));
                                this.anims.create({
                                    key: 'player_idle',
                                    frames: idleFrames,
                                    frameRate: 12,
                                    repeat: -1
                                });
                                console.log('✅ Created fallback player_idle animation');
                            } catch (error) {
                                console.error('❌ Failed to create fallback player_idle animation:', error);
                            }
                        }
                        
                        if (!this.anims.exists('player_walk') && fallbackGroup.move.length) {
                            try {
                                const moveFrames = sortByNumericIndex(fallbackGroup.move).map(entry => ({ key: entry.key, frame: entry.frame }));
                                this.anims.create({
                                    key: 'player_walk',
                                    frames: moveFrames,
                                    frameRate: 16,
                                    repeat: -1
                                });
                                console.log('✅ Created fallback player_walk animation');
                            } catch (error) {
                                console.error('❌ Failed to create fallback player_walk animation:', error);
                            }
                        }
                    }
                }
            }
        } else {
            console.error(`❌ No character spritesheets are loaded!`);
        }

        // OPTIMIZED: Create mob animations for hardcoded mob variants only
        // Load essential atlases: 196 (Skeleton), 254 (Archer), 281 (Golem), 316 (Gnoll)
        const mobTextures = ['mob-texture-196', 'mob-texture-254', 'mob-texture-281', 'mob-texture-316'];
        const allMobFrames: string[] = [];
        const frameToTextureMap: { [frameName: string]: string } = {};
        
        // Check if at least one mob texture is loaded
        if (mobTextures.some(key => this.spriteSheetManager && this.spriteSheetManager.isSpritesheetLoaded(key))) {
            // Collect frames from both textures
            for (const mobKey of mobTextures) {
                if (this.spriteSheetManager && this.spriteSheetManager.isSpritesheetLoaded(mobKey)) {
                    const mobFrames = this.spriteSheetManager.getFrameNames(mobKey);
                    allMobFrames.push(...mobFrames);
                    
                    // Map each frame to its texture
                    for (const frame of mobFrames) {
                        frameToTextureMap[frame] = mobKey;
                    }
                    
                    console.log(`🔍 ${mobKey} frames:`, mobFrames.length);
                }
            }
            
            console.log('🔍 Total available mob frames:', allMobFrames.length);
            console.log('First 10 mob frames:', allMobFrames.slice(0, 10));

            const sortByNumericIndex = (names: string[]): string[] => {
                return names.slice().sort((a, b) => {
                    // Enhanced numeric sorting for mob frames
                    const getFrameNumber = (name: string): number => {
                        // Pattern 1: ending with _XXX.png
                        let match = name.match(/_(\d+)\.png$/i);
                        if (match) return parseInt(match[1], 10);
                        
                        // Pattern 2: ending with XXX.png
                        match = name.match(/(\d+)\.png$/i);
                        if (match) return parseInt(match[1], 10);
                        
                        // Pattern 3: any number in the filename
                        match = name.match(/(\d+)/);
                        if (match) return parseInt(match[1], 10);
                        
                        return 0;
                    };
                    
                    return getFrameNumber(a) - getFrameNumber(b);
                });
            };

            // OPTIMIZED: Only create animations for the hardcoded mob variants
            // Updated to use variants that actually exist in texture atlases
            const hardcodedMobVariants = [
                'Skeleton_Pirate_Captain_1',  // For SKELETON_VIKING enemy type
                'Golem_1',                    // For GOLEM enemy type
                'Archer_1',                   // For ARCHER enemy type (was ArcherMob_1)
                'Gnoll_3'                     // For GNOLL enemy type (use hardcoded Gnoll_3)
            ];

            // Group frames by hardcoded mob variants only
            const mobGroups: { [key: string]: string[] } = {};
            for (const frameName of allMobFrames) {
                // Extract mob type from path like "Mobs/SkeletonPirate/Skeleton_Pirate_Captain_1/..."
                const pathMatch = frameName.match(/^Mobs\/([^\/]+)\/([^\/]+)\//); 
                if (pathMatch) {
                    const mobVariant = pathMatch[2]; // e.g., "Skeleton_Pirate_Captain_1"
                    
                    // Only process hardcoded variants
                    if (hardcodedMobVariants.includes(mobVariant)) {
                        if (!mobGroups[mobVariant]) {
                            mobGroups[mobVariant] = [];
                        }
                        mobGroups[mobVariant].push(frameName);
                    }
                }
            }

            console.log('🎭 Creating animations for hardcoded mob variants:', Object.keys(mobGroups));

            // Create animations for each hardcoded mob variant
            for (const [mobVariant, mobFrameList] of Object.entries(mobGroups)) {
                const sortedFrames = sortByNumericIndex(mobFrameList);

                // Enhanced animation detection for mobs
                const findIdleFrames = (frames: string[]): string[] => {
                    // Try idle first
                    let result = frames.filter(name => name.toLowerCase().includes('idle') || name.toLowerCase().includes('/idle/'));
                    if (result.length) return result;
                    
                    // Fallback to "Slashing" for idle
                    result = frames.filter(name => (name.includes('Slashing') && !name.includes('Run')) || name.includes('/slashing/'));
                    if (result.length) return result;
                    
                    // Further fallback to "Slashing in The Air"
                    return frames.filter(name => name.includes('Slashing in The Air') || name.includes('/slashing in the air/'));
                };

                const findMoveFrames = (frames: string[]): string[] => {
                    // Try walking/running first
                    let result = frames.filter(name => {
                        const lower = name.toLowerCase();
                        return lower.includes('walking') || lower.includes('running') || 
                               lower.includes('/walking/') || lower.includes('/running/');
                    });
                    if (result.length) return result;
                    
                    // Fallback to "Run Slashing"
                    result = frames.filter(name => name.includes('Run Slashing') || name.includes('/run slashing/'));
                    if (result.length) return result;
                    
                    // Further fallback to "Run Throwing"
                    return frames.filter(name => name.includes('Run Throwing') || name.includes('/run throwing/'));
                };

                const chosenIdle = findIdleFrames(sortedFrames);
                const chosenMove = findMoveFrames(sortedFrames);

                console.log(`🎭 ${mobVariant} - idle frames: ${chosenIdle.length}, move frames: ${chosenMove.length}`);

                // Create idle animation for this specific mob variant
                const idleAnimKey = `${mobVariant}_idle`;
                if (chosenIdle.length && !this.anims.exists(idleAnimKey)) {
                    try {
                        const idleFrames = chosenIdle.map(frameName => ({ 
                            key: frameToTextureMap[frameName], 
                            frame: frameName 
                        }));
                        this.anims.create({
                            key: idleAnimKey,
                            frames: idleFrames,
                            frameRate: 8, // Slower for idle
                            repeat: -1
                        });
                        console.log(`✅ Created ${idleAnimKey} animation with ${idleFrames.length} frames`);
                    } catch (error) {
                        console.error(`❌ Failed to create ${idleAnimKey} animation:`, error);
                    }
                }

                // Create move animation for this specific mob variant
                const walkAnimKey = `${mobVariant}_walk`;
                if (chosenMove.length && !this.anims.exists(walkAnimKey)) {
                    try {
                        const moveFrames = chosenMove.map(frameName => ({ 
                            key: frameToTextureMap[frameName], 
                            frame: frameName 
                        }));
                        this.anims.create({
                            key: walkAnimKey,
                            frames: moveFrames,
                            frameRate: 14, // Increased from 10 for smoother animation
                            repeat: -1
                        });
                        console.log(`✅ Created ${walkAnimKey} animation with ${moveFrames.length} frames`);
                    } catch (error) {
                        console.error(`❌ Failed to create ${walkAnimKey} animation:`, error);
                    }
                }
            }

            // Create generic fallback animations using the first hardcoded variant
            if (!this.anims.exists('mob_idle') || !this.anims.exists('mob_walk')) {
                console.log('🔄 Creating fallback mob animations...');
                const firstVariant = hardcodedMobVariants[0]; // Use Skeleton_Pirate_Captain_1 as fallback
                if (firstVariant && mobGroups[firstVariant]) {
                    const sortedFrames = sortByNumericIndex(mobGroups[firstVariant]);
                    
                    if (!this.anims.exists('mob_idle')) {
                        let fallbackIdle = sortedFrames.filter(name => name.includes('Slashing') && !name.includes('Run'));
                        if (!fallbackIdle.length) {
                            fallbackIdle = sortedFrames.filter(name => name.includes('Slashing in The Air'));
                        }
                        
                        if (fallbackIdle.length) {
                            try {
                                const idleFrames = fallbackIdle.map(frameName => ({ 
                                    key: frameToTextureMap[frameName], 
                                    frame: frameName 
                                }));
                                this.anims.create({
                                    key: 'mob_idle',
                                    frames: idleFrames,
                                    frameRate: 8,
                                    repeat: -1
                                });
                                console.log('✅ Created fallback mob_idle animation');
                            } catch (error) {
                                console.error('❌ Failed to create fallback mob_idle animation:', error);
                            }
                        }
                    }
                    
                    if (!this.anims.exists('mob_walk')) {
                        let fallbackMove = sortedFrames.filter(name => name.includes('Run Slashing'));
                        if (!fallbackMove.length) {
                            fallbackMove = sortedFrames.filter(name => name.includes('Slashing in The Air'));
                        }
                        
                        if (fallbackMove.length) {
                            try {
                                const moveFrames = fallbackMove.map(frameName => ({ 
                                    key: frameToTextureMap[frameName], 
                                    frame: frameName 
                                }));
                                this.anims.create({
                                    key: 'mob_walk',
                                    frames: moveFrames,
                                    frameRate: 14,
                                    repeat: -1
                                });
                                console.log('✅ Created fallback mob_walk animation');
                            } catch (error) {
                                console.error('❌ Failed to create fallback mob_walk animation:', error);
                            }
                        }
                    }
                }
            }
        } else {
            console.error(`❌ Mob spritesheets are not loaded!`);
        }
        
        // console.log('🎬 Animation creation completed!');
    }

    /**
     * Spawn an enemy at a specific position using the enemy system
     * Called by the MobSpawnerUI when spawning mobs
     */
    private spawnEnemyAtPosition(type: EnemyType, x: number, y: number): void {
        if (!this.enemySystem) {
            console.warn('❌ Cannot spawn enemy: EnemySystem not initialized');
            return;
        }

        try {
            // Use the enemy system's spawn method
            this.enemySystem.spawnEnemyAt(type, x, y);
            console.log(`✅ Spawned ${type} at (${x.toFixed(0)}, ${y.toFixed(0)})`);
        } catch (error) {
            console.error(`❌ Failed to spawn ${type}:`, error);
        }
    }

    update(_time: number, delta: number): void {
        if (!this.gameStarted || !this.player) return;
        
        // Check if player is alive
        if (!this.player.isAlive()) {
            this.handleGameOver();
            return;
        }
        // Collision Detection
        this.renderCollisionDebug();

        // Convert delta from milliseconds to seconds
        const deltaTime = delta / 1000;
        
        // Update game systems
        this.player.update(this.enemySystem?.getEnemies() || [], deltaTime);
        
        const playerPos = this.player.getPosition();
        this.enemySystem?.update(playerPos.x, playerPos.y, deltaTime);
        
        // Update XP orb system
        this.xpOrbSystem?.update();
        
        // Enhanced collision detection
        if (this.player && this.enemySystem) {
            this.player.checkCollisionWithEnemies(this.enemySystem.getEnemies());
            this.player.checkCollisionWithProjectiles(this.enemySystem.getProjectiles());
            this.player.checkCollisionWithMeleeAttacks(this.enemySystem.getMeleeAttacks());
            this.player.checkCollisionWithConeAttacks(this.enemySystem.getConeAttacks());
            this.player.checkCollisionWithVortexAttacks(this.enemySystem.getVortexAttacks());
            this.player.checkCollisionWithExplosionAttacks(this.enemySystem.getExplosionAttacks());
        }
        
        // Collect XP orbs
        if (this.player && this.xpOrbSystem) {
            this.player.collectXPOrbs(this.xpOrbSystem);
        }
        
        // Update AI Director
        this.aiDirector?.update(this.player, this.enemySystem);
    }
}
