import { Scene } from 'phaser';
import AnimatedTiles from 'phaser-animated-tiles'; // to play animations, npm install phaser-animated-tiles
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
import { AtlasManager } from '../systems/AtlasManager';

export class Game extends Scene {
    private player!: Player;
    private enemySystem!: EnemySystem;
    private atlasManager!: AtlasManager;
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
    // --- Forest Darkness System ---
    private darkZones: Phaser.Geom.Rectangle[] = [];
    private inDarkZone: boolean = false;
    private darkness!: Phaser.GameObjects.Rectangle;
    private visionGfx!: Phaser.GameObjects.Graphics;
    private visionMask!: Phaser.Display.Masks.GeometryMask;
    // ------------------------------ //
    // private readonly GAME_SCALE = 2; // Scaling factor for consistent proportions
    // Restart functionality properties
    private restartInstructionText: Phaser.GameObjects.Text | null = null;
    private gameOverText: Phaser.GameObjects.Text | null = null;
    private isRestarting: boolean = false;
    // ------------------------------ //

    constructor() {
        super('Game');
    }

    init(): void {
        this.isRestarting = false;
        this.collisionLayers = [];
        this.objectCollisionObstacles = [];
        this.gameStarted = false;
        this.selectedArchetype = null;
        this.events.on('shutdown', this.onShutdown, this);
        this.events.once('destroy', this.onShutdown, this);
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
        this.load.image('FieldsTileset', 'tilemaps/FieldsTileset.png');


        // Load XP orb (use existing green orb)
        // Load XP orb (match key used by XPOrb class)
        this.load.image('green_orb', 'images/green_orb.png');
        this.load.image('sparkle', 'images/green_orb.png');
        
        // Load lightning bolt effect for lightning mage as a spritesheet
        // 10 frames arranged horizontally (720x72 total, 72x72 per frame)
        this.load.spritesheet('lightning-bolt', 'Effects/Lightning-bolt.png', {
            frameWidth: 72,   // 720 / 10 frames = 72px per frame
            frameHeight: 72   // Full height
        });
        
        // Load explosion effect for elemental spirit as a spritesheet
        // 10 frames arranged horizontally (720x72 total, 72x72 per frame)
        this.load.spritesheet('explosion', 'Effects/Explosion.png', {
            frameWidth: 72,   // 720 / 10 frames = 72px per frame
            frameHeight: 72   // Full height
        });
        
        // Load gnoll claw effect frames (12 separate images)
        for (let i = 1; i <= 12; i++) {
            const frameNum = i.toString().padStart(5, '0');
            this.load.image(`gnoll-claw-${i}`, `Effects/Gnoll Claw/slash4_${frameNum}.png`);
        }
        
        // Load arrow projectile for skeleton archer
        this.load.image('arrow', 'Effects/Arrow.png');
        
        // Load whirlpool effect for skeleton pirate
        this.load.image('whirlpool', 'Effects/Whirlpool.png');
        
        // Load ogre walking animation frames
        for (let i = 0; i <= 17; i++) {
            const frameNum = i.toString().padStart(3, '0');
            this.load.image(`ogre-walk-${i}`, `mobs/ogre/Walking_${frameNum}.png`);
        }
        
        // Load ogre attacking animation frames
        for (let i = 0; i <= 11; i++) {
            const frameNum = i.toString().padStart(3, '0');
            this.load.image(`ogre-attack-${i}`, `mobs/ogre/Attacking_${frameNum}.png`);
        }
        
        // Load bone slam effect for ogre melee attacks
        for (let i = 0; i <= 2; i++) {
            const frameNum = i.toString().padStart(2, '0');
            this.load.image(`bone-slam-${i}`, `Effects/Bone_Slam/Frame_${frameNum}.png`);
        }
        
        // Load player sprite (use first available character texture)

        // Load essential spritesheets (characters and mobs) for animations
        this.spriteSheetManager = new SpriteSheetManager(this);
        this.spriteSheetManager.loadEssentialSpritesheets();
    }

    create() {
        // console.log('Game scene created');

        if (this.input && this.input.keyboard) {
            this.input.keyboard.removeAllListeners('keydown-R');
            this.input.keyboard.removeAllListeners('keydown-F1');
        }
        
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

        // Global restart shortcut: restart the scene for a clean reset
        this.input.keyboard!.on('keydown-R', () => {
            this.hardRestartScene();
        });
    }

    private createTilemap(): void {
        console.log('Creating tilemap with TilemapManager...');
        this.collisionLayers = [];
        this.objectCollisionObstacles = [];
        
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
                { name: 'objectbrickstools', imageKey: 'objectbrickstools', imagePath: 'assets/tilemaps/objectbrickstools.png' },
                { name: 'FieldsTileset', imageKey: 'FieldsTileset', imagePath: 'assets/tilemaps/FieldsTileset.png'}
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
        
        // Set up animated tiles , Defer AnimatedTiles until after the scene fully booted
        this.time.delayedCall(0, () => {
        try {
            const animatedTiles = new AnimatedTiles(this);
            animatedTiles.init(this.tilemap);
            console.log('Animated tiles initialized successfully.');
        } catch (err) {
            console.error('Failed to init animated tiles:', err);
        }
        });

        // --- DOOR CONTROL SETUP ---
        const objectLayer = this.tilemap.getLayer('objects')?.tilemapLayer;
        if (!objectLayer) {
        console.warn('No "objects" layer found!');
        return;
        }

        const doorTiles = objectLayer.filterTiles(
        (tile: Phaser.Tilemaps.Tile) => tile.properties?.type === 'door'
        );
        console.log(`Found ${doorTiles.length} door tiles`);
        console.log('Door tile indices:', doorTiles.map(t => t.index));

        let doorOpened = false;
        const doorOffset = 148; // 371 - 223 (your open - closed difference)

        this.input.keyboard!.on('keydown-P', () => {
        if (doorOpened) return;
        doorOpened = true;

        doorTiles.forEach(tile => {
            const openTileIndex = tile.index + doorOffset;
            objectLayer.putTileAt(openTileIndex, tile.x, tile.y);
        });

        console.log('Door opened!');
        });



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
        // Create Class Selection UI
        this.classSelectionUI = new ClassSelectionUI(this, {
            onClassSelected: (archetype) => {
                this.selectedArchetype = archetype;
                this.startGame();
            }
        });
        
        // Skeleton Pirate animations
        this.anims.create({
            key: 'skeleton_pirate_idle',
            frames: Array.from({ length: 18 }, (_, i) => ({ key: `skeleton_pirate_idle_${String(i).padStart(3, '0')}` })),
            frameRate: 8,
            repeat: -1
        });
        
        this.anims.create({
            key: 'skeleton_pirate_running',
            frames: Array.from({ length: 12 }, (_, i) => ({ key: `skeleton_pirate_running_${String(i).padStart(3, '0')}` })),
            frameRate: 12,
            repeat: -1
        });
        
        // Elemental Spirit animations
        this.anims.create({
            key: 'elemental_spirit_idle',
            frames: Array.from({ length: 18 }, (_, i) => ({ key: `elemental_spirit_idle_${String(i).padStart(3, '0')}` })),
            frameRate: 8,
            repeat: -1
        });
        
        this.anims.create({
            key: 'elemental_spirit_running',
            frames: Array.from({ length: 12 }, (_, i) => ({ key: `elemental_spirit_running_${String(i).padStart(3, '0')}` })),
            frameRate: 12,
            repeat: -1
        });
        
        this.anims.create({
            key: 'elemental_spirit_dying',
            frames: Array.from({ length: 15 }, (_, i) => ({ key: `elemental_spirit_dying_${String(i).padStart(3, '0')}` })),
            frameRate: 20, // Faster framerate for death animation
            repeat: 0 // Play once, don't loop
        });
        
        // Ogre walking animation
        this.anims.create({
            key: 'ogre_walking',
            frames: Array.from({ length: 18 }, (_, i) => ({ key: `ogre-walk-${i}` })),
            frameRate: 10,
            repeat: -1
        });
        
        // Ogre attacking animation
        this.anims.create({
            key: 'ogre_attacking',
            frames: Array.from({ length: 12 }, (_, i) => ({ key: `ogre-attack-${i}` })),
            frameRate: 15,
            repeat: 0 // Play once
        });
        
        // Bone slam effect animation
        this.anims.create({
            key: 'bone_slam',
            frames: Array.from({ length: 3 }, (_, i) => ({ key: `bone-slam-${i}` })),
            frameRate: 10,
            repeat: 0 // Play once
        });
            }

    private showClassSelection(): void {
        this.classSelectionUI.show();
    }

    private startGame(): void {
        if (this.gameStarted || !this.selectedArchetype) return;

        this.gameStarted = true;

        // Hide the selection UI cleanly
        this.classSelectionUI.hide();
        this.time.delayedCall(350, () => {
            this.classSelectionUI?.destroy();
        });

        const archetypeToCharacter: Record<string, string> = {
            glass_cannon: 'magician', //magician
            tank: 'knight',
            evasive: 'ninja'
        };

        const selected = this.selectedArchetype?.toString().toLowerCase() || 'magician';
        const characterBase = archetypeToCharacter[selected] || 'magician';
        const atlasFolder = characterBase; // magician, knight, rogue

        console.log(`🔹 Loading atlas for ${atlasFolder}...`);

        this.atlasManager = new AtlasManager(this);
        this.atlasManager.loadAllForCharacter(atlasFolder);

        // ✅ Wait until all files are fully processed and parsed
        this.load.once(Phaser.Loader.Events.COMPLETE, () => {
            console.log(`✅ All files loaded for ${atlasFolder}`);

            // Add a small delay to ensure Phaser’s texture parser has finished
            this.time.delayedCall(100, () => {
                console.log(`🎨 Creating animations for ${atlasFolder}...`);
                this.atlasManager.createAnimations(atlasFolder);

                // Check texture availability
                if (!this.textures.exists(`${atlasFolder}_idle_blinking`) && !this.textures.exists(`${atlasFolder}_idle`)) {
                    console.warn(`⚠️ Texture not found in cache for ${atlasFolder} — delaying game init slightly.`);
                    this.time.delayedCall(200, () => this.initializeGameSystems());
                } else {
                    this.initializeGameSystems();
                }
            });
        });

        this.load.start();
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
            spawnX = this.tilemap.widthInPixels * 0.70; // 70% to the right (top right area, closer to center)
            spawnY = this.tilemap.heightInPixels * 0.30; // 30% from top (top right area, closer to center)
            console.log('Using fallback spawn position:', spawnX, spawnY);
        }
        
        this.player = new Player(this, spawnX, spawnY, this.selectedArchetype!);
        this.events.emit('playerReady', this.player);
        
        // Scale the player sprite to match the tilemap scaling
        this.player.sprite.setScale(0.05); //* this.GAME_SCALE);
        
        // Set up tilemap collision detection for player
        this.setupPlayerTilemapCollisions();

        // Initialize XP Orb System
        this.xpOrbSystem = new XPOrbSystem(this);
        
        // Initialize Enemy System 
        this.enemySystem = new EnemySystem(this, this.player, this.xpOrbSystem);
        
        // Register callback for when enemies are spawned (for collision setup)
        this.enemySystem.setEnemySpawnedCallback((enemy) => {
            this.setupEnemyTilemapCollisions(enemy.sprite);
        });
        
        // Initialize AI Director
        //this.aiDirector = new AIDirector();
        
        // Initialize Enhanced Mob Spawner UI
        this.mobSpawnerUI = new MobSpawnerUI(this);
        this.mobSpawnerUI.setSpawnCallback((type: EnemyType, x: number, y: number) => {
            this.spawnEnemyAtPosition(type, x, y);
        });
        
        // --- CAMERA SETUP (matches JS version) ---
        // Match JS exactly
        const camera = this.cameras.main;
        camera.startFollow(this.player.sprite, true, 0.1, 0.1);
        camera.setZoom(2); // Zoomed out for better battlefield visibility
        camera.setBounds(0, 0, this.tilemap.widthInPixels, this.tilemap.heightInPixels);

        // Optional smooth camera lag (for cinematic movement)
        camera.setLerp(0.15, 0.15);

        // Center camera on spawn when starting (prevents snapping)
        camera.centerOn(this.player.sprite.x, this.player.sprite.y);

        // --- Load forest dimming zones from Tiled ---
        const dimLayer = this.tilemap.getObjectLayer('dimlights');
        if (dimLayer && dimLayer.objects.length > 0) {
        this.darkZones = dimLayer.objects.map(obj =>
            new Phaser.Geom.Rectangle(obj.x, obj.y, obj.width, obj.height)
        );
        console.log(`Loaded ${this.darkZones.length} dimlight zones.`);
        }

        // --- Fullscreen darkness overlay (hidden by default) ---
        this.darkness = this.add.rectangle(
        0, 0,
        this.cameras.main.width, this.cameras.main.height,
        0x000000, 1 //Change it to 0 for debug
        ).setOrigin(0).setScrollFactor(0).setDepth(9998).setVisible(false);

        // --- Vision mask (the radius of light around player) ---
        this.visionGfx = this.add.graphics().setScrollFactor(0).setDepth(9999);
        this.visionMask = this.visionGfx.createGeometryMask();
        this.visionMask.setInvertAlpha(true);
        this.darkness.setMask(this.visionMask);
        
        // Start spawning enemies
        this.enemySystem.startSpawning();
        
        // Verify visuals: auto-spawn key mobs near player
        this.spawnEnemyAtPosition(EnemyType.ARCHER, spawnX + 80, spawnY);
        this.spawnEnemyAtPosition(EnemyType.OGRE, spawnX + 140, spawnY);
        this.spawnEnemyAtPosition(EnemyType.GNOLL, spawnX + 200, spawnY);


        // Add restart instruction
        this.restartInstructionText = this.add.text(512, 750, 'Press R to restart and choose a different archetype', {
            fontSize: '14px',
            color: '#cccccc'
        }).setOrigin(0.5);
        this.restartInstructionText.setScrollFactor(0); // Make UI fixed to screen
        
        // Restart key handler registered globally in create()
        
        console.log('Game systems initialized with simplified collision system');
        console.log('Player spawn position (top right, closer to center):', spawnX, spawnY);
        console.log('Player scale:', 0.05); // * this.GAME_SCALE);
    }

    

    private hardRestartScene(): void {
        if (this.isRestarting) return;
        this.isRestarting = true;
        try {
            if (this.player) {
                this.player.destroy();
            }
            if (this.enemySystem) {
                this.enemySystem.stopSpawning();
                this.enemySystem.clearAllAttacks();
                this.enemySystem.clearAllEnemies();
            }
            if (this.mobSpawnerUI) {
                this.mobSpawnerUI.destroy();
            }
            if (this.xpOrbSystem) {
                this.xpOrbSystem.clearAllOrbs();
            }
            if (this.classSelectionUI) {
                this.classSelectionUI.destroy();
            }
            if (this.collisionDebugGfx) {
                this.collisionDebugGfx.destroy();
            }
            if (this.playerDebugGfx) {
                this.playerDebugGfx.destroy();
            }
            if (this.objectRects && this.objectRects.length) {
                this.objectRects.forEach(r => r.destroy());
                this.objectRects = [];
            }
            if (this.input) {
                this.input.keyboard?.removeAllListeners();
            }
            this.tweens.killAll();
            this.time.removeAllEvents();
        } catch {}
        this.scene.restart();
    }

    private onShutdown(): void {
        try {
            if (this.input) {
                this.input.keyboard?.removeAllListeners();
            }
            if (this.player) {
                this.player.destroy();
                this.player = undefined as any;
            }
            if (this.enemySystem) {
                this.enemySystem.stopSpawning();
                this.enemySystem.clearAllAttacks();
                this.enemySystem.clearAllEnemies();
                this.enemySystem = undefined as any;
            }
            if (this.xpOrbSystem) {
                this.xpOrbSystem.clearAllOrbs();
                this.xpOrbSystem = undefined as any;
            }
            if (this.mobSpawnerUI) {
                this.mobSpawnerUI.destroy();
                this.mobSpawnerUI = undefined as any;
            }
            if (this.classSelectionUI) {
                this.classSelectionUI.destroy();
                this.classSelectionUI = undefined as any;
            }
            if (this.gameOverText) {
                this.gameOverText.destroy();
                this.gameOverText = null;
            }
            if (this.restartInstructionText) {
                this.restartInstructionText.destroy();
                this.restartInstructionText = null;
            }
            if ((this as any).gameOverRestartText) {
                (this as any).gameOverRestartText.destroy();
                (this as any).gameOverRestartText = null;
            }
            if (this.collisionDebugGfx) {
                this.collisionDebugGfx.destroy();
                this.collisionDebugGfx = undefined as any;
            }
            if (this.playerDebugGfx) {
                this.playerDebugGfx.destroy();
                this.playerDebugGfx = undefined as any;
            }
            if (this.objectRects && this.objectRects.length) {
                this.objectRects.forEach(r => r.destroy());
                this.objectRects = [];
            }
            this.tweens.killAll();
            this.time.removeAllEvents();
        } catch {}
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

    private debugEnabled = false; // start ON so you can see everything
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
        `Player collision setup: ${this.collisionLayers.length} tile layers + ${this.objectRects.length} object rects`
    );
    }

    /**
     * Sets up collision for a specific enemy with tilemap layers and objects
     * @param enemySprite - The enemy sprite to add collision for
     */
    private setupEnemyTilemapCollisions(enemySprite: Phaser.GameObjects.Sprite): void {
        // Add collisions with tile layers
        this.collisionLayers.forEach(layer => {
            this.physics.add.collider(enemySprite, layer);
        });

        // Add collisions with object rectangles
        this.objectRects.forEach(rect => {
            this.physics.add.collider(enemySprite, rect);
        });
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
            console.log('All available character frames:', charFramesWithKey.length);
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
                // Skip frames that TexturePacker marked as rotated to avoid visual rotation
                try {
                    const tex = this.textures.get(f.key) as any;
                    const texFrame = tex && tex.get ? tex.get(f.frame) : null;
                    if (texFrame && texFrame.rotated) {
                        continue;
                    }
                } catch {}
                // Match pattern: characters/[class]/[variant]/
                const match = f.frame.match(/^characters\/([^\/]+)\/([^\/]+)\//);
                if (match) {
                    const [, , characterVariant] = match;
                    const groupId = characterVariant; // Use variant as the key (e.g., "Magician_1", "Knight_2")
                    const g = groups.get(groupId) || { idle: [], move: [], characterVariant };

                    // Enhanced animation type detection
                    const isIdleAnimation = (name: string): boolean => {
                        const lowerName = name.toLowerCase();
                        return lowerName.includes('idle') || lowerName.includes('/idle/');
                    };

                    const isMoveAnimation = (name: string): boolean => {
                        const lowerName = name.toLowerCase();
                        // Restrict to true walking/running only; exclude throwing/shooting variants
                        if (lowerName.includes('run throwing') || lowerName.includes('run shooting')) {
                            return false;
                        }
                        return lowerName.includes('walking') ||
                               lowerName.includes('running') ||
                               lowerName.includes('/walking/') ||
                               lowerName.includes('/running/');
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

            console.log(' Found character variants:', Array.from(groups.keys()));

            // Create animations for each character variant
            for (const [characterVariant, g] of groups) {
                let chosenIdle: FrameEntry[] = [];
                let chosenMove: FrameEntry[] = [];
                
                // First priority: variants with proper idle and movement animations
                if (g.idle.length && g.move.length) {
                    chosenIdle = sortByNumericIndex(g.idle);
                    chosenMove = sortByNumericIndex(g.move);
                    console.log(` Using character variant: ${characterVariant} (idle: ${g.idle.length}, move: ${g.move.length})`);
                }

                // Fallback: if variant has no proper animations, use slashing animations
                if (!chosenIdle.length || !chosenMove.length) {
                    console.log(` No proper idle/move found for ${characterVariant}, searching for fallback animations`);
                    
                    // Look for slashing animations for this specific variant
                    const variantFrames = charFramesWithKey.filter(f => {
                        const match = f.frame.match(/^characters\/([^\/]+)\/([^\/]+)\//);
                        return match && match[2] === characterVariant;
                    });
                    
                    for (const f of variantFrames) {
                        const lower = f.frame.toLowerCase();
                        // Use "Slashing" for idle (stationary attack animation)
                        if ((lower.includes('slashing') && !lower.includes('run')) || lower.includes('/slashing/')) {
                            try {
                                const tex = this.textures.get(f.key) as any;
                                const texFrame = tex && tex.get ? tex.get(f.frame) : null;
                                if (!texFrame || !texFrame.rotated) {
                                    chosenIdle.push(f);
                                }
                            } catch {}
                        }
                        // Use "Run Slashing" for movement
                        if (lower.includes('run slashing') || lower.includes('/run slashing/')) {
                            try {
                                const tex = this.textures.get(f.key) as any;
                                const texFrame = tex && tex.get ? tex.get(f.frame) : null;
                                if (!texFrame || !texFrame.rotated) {
                                    chosenMove.push(f);
                                }
                            } catch {}
                        }
                    }
                    
                    if (chosenIdle.length || chosenMove.length) {
                        chosenIdle = sortByNumericIndex(chosenIdle);
                        chosenMove = sortByNumericIndex(chosenMove);
                        console.log(` Using character variant: ${characterVariant} with slashing animations (idle: ${chosenIdle.length}, move: ${chosenMove.length})`);
                    }
                }

                console.log(`Character animation frames found for ${characterVariant}:`);
                console.log(`Idle frames: ${chosenIdle.length}`, chosenIdle.slice(0, 3));
                console.log(`Move frames: ${chosenMove.length}`, chosenMove.slice(0, 3));

                // Final fallback: if one set is empty, reuse the other
                if (!chosenIdle.length && chosenMove.length) {
                    chosenIdle = chosenMove.slice();
                }
                if (!chosenMove.length && chosenIdle.length) {
                    chosenMove = chosenIdle.slice();
                }

                // Create variant-specific animations with error handling
                const idleAnimKey = `${characterVariant}_idle`;
                const walkAnimKey = `${characterVariant}_walk`;

                if (chosenIdle.length && !this.anims.exists(idleAnimKey)) {
                    try {
                        // Use frames across atlases
                        const idleFrames = chosenIdle.map(entry => ({ key: entry.key, frame: entry.frame }));
                        console.log(` Creating ${idleAnimKey} animation with frames:`, idleFrames.slice(0, 3));
                        this.anims.create({
                            key: idleAnimKey,
                            frames: idleFrames,
                            frameRate: 12, // Increased from 8 for smoother animation
                            repeat: -1
                        });
                        console.log(` Created ${idleAnimKey} animation with ${idleFrames.length} frames`);
                    } catch (error) {
                        console.error(` Failed to create ${idleAnimKey} animation:`, error);
                    }
                } else if (!chosenIdle.length) {
                    console.warn(` No idle frames found for ${characterVariant} animation`);
                } else {
                    console.log(`${idleAnimKey} animation already exists`);
                }

                if (chosenMove.length && !this.anims.exists(walkAnimKey)) {
                    try {
                        // Use frames across atlases
                        const walkFrames = chosenMove.map(entry => ({ key: entry.key, frame: entry.frame }));
                        console.log(`Creating ${walkAnimKey} animation with frames:`, walkFrames.slice(0, 3));
                        this.anims.create({
                            key: walkAnimKey,
                            frames: walkFrames,
                            frameRate: 12, // Increased from 8 for smoother animation
                            repeat: -1
                        });
                        console.log(` Created ${walkAnimKey} animation with ${walkFrames.length} frames`);
                    } catch (error) {
                        console.error(` Failed to create ${walkAnimKey} animation:`, error);
                    }
                } else if (!chosenMove.length) {
                    console.warn(` No walk frames found for ${characterVariant} animation`);
                } else {
                    console.log(` ${walkAnimKey} animation already exists`);
                }
            }
        }

        // Fallback mob animations
        this.anims.create({
            key: 'mob_idle',
            frames: Array.from({ length: 18 }, (_, i) => ({ key: `mob_idle_${String(i).padStart(3, '0')}` })),
            frameRate: 8,
            repeat: -1
        });
        this.anims.create({
            key: 'mob_walk',
            frames: Array.from({ length: 12 }, (_, i) => ({ key: `mob_walk_${String(i).padStart(3, '0')}` })),
            frameRate: 12,
            repeat: -1
        });

        // Create lightning bolt animation (for lightning mage)
        if (this.textures.exists('lightning-bolt')) {
            const lightningFrameCount = this.textures.get('lightning-bolt').frameTotal - 1; // Subtract 1 for __BASE
            if (lightningFrameCount > 0) {
                this.anims.create({
                    key: 'lightning-strike',
                    frames: this.anims.generateFrameNumbers('lightning-bolt', { start: 0, end: lightningFrameCount - 1 }),
                    frameRate: 20, // Fast animation for lightning effect
                    repeat: 0 // Play once
                });
                console.log(` Created lightning-strike animation with ${lightningFrameCount} frames`);
            }
        }

        // Create explosion animation (for elemental spirit)
        if (this.textures.exists('explosion')) {
            const explosionFrameCount = this.textures.get('explosion').frameTotal - 1; // Subtract 1 for __BASE
            if (explosionFrameCount > 0) {
                this.anims.create({
                    key: 'explosion-effect',
                    frames: this.anims.generateFrameNumbers('explosion', { start: 0, end: explosionFrameCount - 1 }),
                    frameRate: 24, // Fast animation for explosion effect
                    repeat: 0 // Play once
                });
                console.log(` Created explosion-effect animation with ${explosionFrameCount} frames`);
            }
        }

        // Create gnoll claw animation (for gnoll melee attacks)
        if (this.textures.exists('gnoll-claw-1')) {
            const clawFrames = [];
            for (let i = 1; i <= 12; i++) {
                if (this.textures.exists(`gnoll-claw-${i}`)) {
                    clawFrames.push({ key: `gnoll-claw-${i}` });
                }
            }
            if (clawFrames.length > 0) {
                this.anims.create({
                    key: 'gnoll-claw-attack',
                    frames: clawFrames,
                    frameRate: 24, // Fast animation for claw slash
                    repeat: 0 // Play once
                });
                console.log(` Created gnoll-claw-attack animation with ${clawFrames.length} frames`);
            }
        }

        // console.log(' Animation creation completed!');
    }

    /**
     * Spawn an enemy at a specific position using the enemy system
     * Called by the MobSpawnerUI when spawning mobs
     */
    private spawnEnemyAtPosition(type: EnemyType, x: number, y: number): void {
        if (!this.enemySystem) {
            console.warn(' Cannot spawn enemy: EnemySystem not initialized');
            return;
        }

        try {
            // Use the enemy system's spawn method
            const enemy = this.enemySystem.spawnEnemyAt(type, x, y);
            
            if (enemy) {
                // Set up collision for the newly spawned enemy
                this.setupEnemyTilemapCollisions(enemy.sprite);
                console.log(` Spawned ${type} at (${x.toFixed(0)}, ${y.toFixed(0)}) with collision`);
            }
        } catch (error) {
            console.error(` Failed to spawn ${type}:`, error);
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

        // --- Check if inside a dark zone (forest) ---
        let isInDark = false;
        for (const zone of this.darkZones) {
        if (zone.contains(playerPos.x, playerPos.y)) {
            isInDark = true;
            break;
        }
        }

        // --- Toggle overlay ---
        if (isInDark && !this.inDarkZone) {
        this.inDarkZone = true;
        this.darkness.setVisible(true); // Set to false for testing
        this.tweens.add({
            targets: this.darkness,
            alpha: 0.95,
            duration: 300,
            ease: 'Quad.easeInOut'
        });
        } else if (!isInDark && this.inDarkZone) {
        this.inDarkZone = false;
        this.tweens.add({
            targets: this.darkness,
            alpha: 0,
            duration: 300,
            ease: 'Quad.easeInOut',
            onComplete: () => this.darkness.setVisible(false)
        });
        }

        // --- Update the circular vision mask if active ---
        if (this.inDarkZone) {
        const cam = this.cameras.main;
        const sx = playerPos.x - cam.scrollX;
        const sy = playerPos.y - cam.scrollY;

        this.visionGfx.clear();
        const radius = 1; // visible radius
        const fadeRings = 6; // rings around radius
        const ringStep = 10; // length of one ring to another
        for (let i = fadeRings; i >= 0; i--) {
            const alpha = 0.2 - i * 0.02; // Light
            this.visionGfx.fillStyle(0xffeedd, Math.max(alpha, 0));
            this.visionGfx.fillCircle(sx, sy, radius + i * ringStep);
        }
        } else {
        this.visionGfx.clear();
        }


        // Update XP orb system
        this.xpOrbSystem?.update();
        
        // Enhanced collision detection
        if (this.player && this.enemySystem) {
            this.player.checkCollisionWithEnemies(this.enemySystem.getEnemies(), this.enemySystem.getShields());
            this.player.checkCollisionWithProjectiles(this.enemySystem.getProjectiles());
            this.player.checkCollisionWithMeleeAttacks(this.enemySystem.getMeleeAttacks());
            this.player.checkCollisionWithConeAttacks(this.enemySystem.getConeAttacks());
            this.player.checkCollisionWithVortexAttacks(this.enemySystem.getVortexAttacks());
            this.player.checkCollisionWithExplosionAttacks(this.enemySystem.getExplosionAttacks());
            this.player.checkCollisionWithLightningStrikes(this.enemySystem.getLightningStrikes());
            this.player.checkCollisionWithClawAttacks(this.enemySystem.getClawAttacks());
            this.player.checkCollisionWithArrowProjectiles(this.enemySystem.getArrowProjectiles());
        }
        
        // Collect XP orbs
        if (this.player && this.xpOrbSystem) {
            this.player.collectXPOrbs(this.xpOrbSystem);
        }
        
        // Update AI Director
        this.aiDirector?.update(this.player, this.enemySystem);
    }
}
