import { Scene } from 'phaser';
import { Player } from '../Player';
import { InputBuffer } from '../input/InputBuffer';
import { EnemySystem } from '../systems/EnemySystem';
import { EnemyType } from '../types/EnemyTypes';
import { AIDirector } from '../systems/AIDirector';
import { PlayerArchetypeType } from '../objects/PlayerArchetype';
import { MobSpawnerUI } from '../../ui/MobSpawnerUI';
import { XPOrbSystem } from '../systems/XPOrbSystem';
import { SpriteSheetManager } from '../systems/SpriteSheetManager';
import { TilemapManager } from '../systems/TilemapManager';
import { TilemapConfig } from '../types/TilemapTypes';
import { AtlasManager } from '../systems/AtlasManager';
import { PlayerSkillSystem } from '../skills/PlayerSkillSystem';
import { RoundManager } from '../systems/RoundManager';
import { UIScene } from '../../ui/UIScene';
import { LightingSystem } from '../systems/LightingSystem';
import { PhysicsSystem } from '../systems/PhysicsSystem';
import { MapInteractionSystem } from '../systems/MapInteractionSystem';

export class Game extends Scene {
    private player!: Player;
    private enemySystem!: EnemySystem;
    private playerSkillSystem!: PlayerSkillSystem;
    private atlasManager!: AtlasManager;
    private aiDirector!: AIDirector;
    private roundManager!: RoundManager;
    private mobSpawnerUI!: MobSpawnerUI;
    private xpOrbSystem!: XPOrbSystem;
    private tilemap!: Phaser.Tilemaps.Tilemap;
    private tilemapManager!: TilemapManager;
    private gameStarted: boolean = false;
    private selectedArchetype: PlayerArchetypeType | null = null;
    private spriteSheetManager!: SpriteSheetManager;

    private lightingSystem!: LightingSystem;
    private physicsSystem!: PhysicsSystem;
    private mapInteractionSystem!: MapInteractionSystem;

    // private readonly GAME_SCALE = 2; // Scaling factor for consistent proportions
    // Restart functionality properties
    private restartInstructionText: Phaser.GameObjects.Text | null = null;
    private gameOverText: Phaser.GameObjects.Text | null = null;
    private gameOverRestartText: Phaser.GameObjects.Text | null = null;
    private isRestarting: boolean = false;

    constructor() {
        super('Game');
    }

    init(data: { archetype?: PlayerArchetypeType }): void {
        this.isRestarting = false;
        this.gameStarted = false;
        this.selectedArchetype = data.archetype || null;

        // Prevent duplicate listeners by removing any existing ones first
        this.events.off('shutdown', this.onShutdown, this);
        this.events.off('destroy', this.onShutdown, this);

        this.events.on('shutdown', this.onShutdown, this);
        this.events.once('destroy', this.onShutdown, this);
    }

    preload() {
        // All assets are pre-loaded in Preloader.ts
        // Just initialize managers here (they will find textures in cache)
        this.load.setPath('assets');
        this.spriteSheetManager = new SpriteSheetManager(this);
        this.atlasManager = new AtlasManager(this);
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
        if (!this.atlasManager) this.atlasManager = new AtlasManager(this);
        this.atlasManager.createAllAnimations(this.spriteSheetManager);

        // Initialize game directly
        this.initializeGame();

        // Global restart shortcut: restart the scene for a clean reset
        this.input.keyboard!.on('keydown-R', () => {
            this.hardRestartScene();
        });
    }

    private initializeGame(): void {
        this.gameStarted = true;

        const archetypeToCharacter: Record<string, string> = {
            glass_cannon: 'magician',
            tank: 'knight',
            evasive: 'ninja'
        };

        const selected = this.selectedArchetype?.toString().toLowerCase() || 'magician';
        const characterBase = archetypeToCharacter[selected] || 'magician';

        console.log(`Initializing game for ${characterBase}...`);

        // Create animations for the selected character (textures already loaded in preload)
        if (!this.atlasManager) this.atlasManager = new AtlasManager(this);
        this.atlasManager.createAnimations(characterBase);

        try {
            this.initializeGameSystems();
        } catch (e) {
            console.error('Failed to initialize game systems:', e);
        }
    }

    private createTilemap(): void {
        console.log('Creating tilemap with TilemapManager...');

        // Initialize TilemapManager
        this.tilemapManager = new TilemapManager(this);
        this.physicsSystem = new PhysicsSystem(this);
        this.physicsSystem.initialize();
        this.mapInteractionSystem = new MapInteractionSystem(this, this.physicsSystem);

        // Define tilemap configuration
        const tilemapConfig: TilemapConfig = {
            name: 'binkyMap',
            key: 'map',
            jsonPath: 'assets/tilemaps/binkymap1.json',
            tilesets: [
                { name: 'floor1', imageKey: 'floor1', imagePath: 'assets/tilemaps/floor1.png' },
                { name: 'GraveyardTileset', imageKey: 'GraveyardTileset', imagePath: 'assets/tilemaps/GraveyardTileset.png' },
                { name: 'tiledwallandfloor', imageKey: 'tiledwallandfloor', imagePath: 'assets/tilemaps/tiledwallandfloor.png' },

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

                { name: 'FieldsTileset', imageKey: 'FieldsTileset', imagePath: 'assets/tilemaps/FieldsTileset.png' },
                { name: 'forrestground', imageKey: 'forrestground', imagePath: 'assets/tilemaps/forrestground.png' },
                { name: 'forrestobjects', imageKey: 'forrestobjects', imagePath: 'assets/tilemaps/forrestobjects.png' },
                { name: 'spots_lianas', imageKey: 'spots_lianas', imagePath: 'assets/tilemaps/spots_lianas.png' },
                { name: 'Water_coasts', imageKey: 'Water_coasts', imagePath: 'assets/tilemaps/Water_coasts.png' },
                { name: 'water_detilazation', imageKey: 'water_detilazation', imagePath: 'assets/tilemaps/water_detilazation.png' },

                { name: 'Water_lilis', imageKey: 'Water_lilis', imagePath: 'assets/tilemaps/Water_lilis.png' }
            ],
            layers: [
                { name: 'background', tilesets: [], depth: 0, visible: true, collides: false },
                { name: 'foreground', tilesets: [], depth: 1, visible: true, collides: false }, // Houses, walls, buildings
                { name: 'objects', tilesets: [], depth: 2, visible: true, collides: false }, // Decorative only (grass, small rocks, etc.)
                { name: 'foregroundobjects', tilesets: [], depth: 4, visible: true, collides: false }, // Solid structures
                { name: 'Trees', tilesets: [], depth: 5, visible: true, collides: false }, // Trees are solid
                { name: 'collisions', tilesets: [], visible: true, collides: true }, // Dedicated collision layer
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
                // Plugin is injected as 'animatedTiles' via config in main.ts
                const plugin = (this as any).animatedTiles;
                if (plugin) {
                    plugin.init(this.tilemap);
                    console.log('Animated tiles initialized successfully.');
                } else {
                    console.warn('AnimatedTiles plugin not injected.');
                }
            } catch (err) {
                console.error('Failed to init animated tiles:', err);
            }
        });

        // Initialize Map Interactions (Doors, etc.)
        this.mapInteractionSystem.initialize(this.tilemap);

        // Set up collision system via PhysicsSystem
        //this.tilemapManager.applyScaling('binkyMap', this.GAME_SCALE);

        // Set up collision system via PhysicsSystem
        this.physicsSystem.setupWorldCollisions(this.tilemap);

        // Set up camera bounds (scaled)
        const scaledWidth = map.widthInPixels; //* this.GAME_SCALE;
        const scaledHeight = map.heightInPixels; //* this.GAME_SCALE;

        console.log('Tilemap created successfully with TilemapManager');
        console.log('Map dimensions (scaled):', scaledWidth, 'x', scaledHeight);
    }

    private initializeUI(): void {
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

        const inputBuffer = new InputBuffer();
        this.player = new Player(this, spawnX, spawnY, this.selectedArchetype!, inputBuffer);
        this.events.emit('playerReady', this.player);

        // Ensure UIScene is synced with the new player
        const uiScene = this.scene.get('UIScene') as UIScene;
        if (uiScene && uiScene.initializeWithPlayer) {
            uiScene.initializeWithPlayer(this.player);
        }

        // Scale the player sprite to match the tilemap scaling
        this.player.sprite.setScale(0.05); //* this.GAME_SCALE);

        // Set up tilemap collision detection for player
        this.physicsSystem.setupPlayerCollisions(this.player);

        // Initialize XP Orb System
        this.xpOrbSystem = new XPOrbSystem(this);

        // Initialize Enemy System 
        this.enemySystem = new EnemySystem(this, this.player, this.xpOrbSystem);

        // Initialize Player Skill System (must be after EnemySystem)
        this.playerSkillSystem = new PlayerSkillSystem(this, this.player, this.enemySystem);
        // Camera follow
        this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

        // Register callback for when enemies are spawned (for collision setup)
        this.enemySystem.setEnemySpawnedCallback((enemy) => {
            this.setupEnemyTilemapCollisions(enemy.sprite);
        });

        // Initialize AI Director
        this.aiDirector = new AIDirector();

        // Initialize Round Manager
        this.roundManager = new RoundManager(this, this.enemySystem, this.aiDirector);
        this.roundManager.start();

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

        // --- Lighting System ---
        this.lightingSystem = new LightingSystem(this);
        this.lightingSystem.create(this.tilemap);

        // Disable default continuous spawning (RoundManager handles this now)
        // this.enemySystem.startSpawning();

        // Verify visuals: auto-spawn key mobs near player
        // this.spawnEnemyAtPosition(EnemyType.ARCHER, spawnX + 80, spawnY);
        // this.spawnEnemyAtPosition(EnemyType.OGRE, spawnX + 140, spawnY);
        // this.spawnEnemyAtPosition(EnemyType.GNOLL, spawnX + 200, spawnY);


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



    public getEnemySystem(): EnemySystem {
        return this.enemySystem;
    }

    private hardRestartScene(): void {
        if (this.isRestarting) return;
        this.isRestarting = true;
        console.log('Hard restart initiated - returning to class selection');

        // Clear skill tree unlocks
        this.registry.set('unlockedSkills', new Map<string, boolean>());
        this.registry.set('skillPoints', 0);
        this.registry.set('playerLevel', 1);

        // Stop this scene and go to class selection
        this.scene.stop('Game');
        this.scene.start('ClassSelectionScene');
    }

    private onShutdown(): void {
        try {
            if (this.input) {
                this.input.keyboard?.removeAllListeners();
            }

            // Clean up player first
            if (this.player) {
                this.player.destroy();
                // this.player = undefined; // Kept as specific type
            }

            if (this.enemySystem) {
                this.enemySystem.stopSpawning();
                this.enemySystem.clearAllAttacks();
                this.enemySystem.clearAllEnemies();
                // this.enemySystem = undefined;
            }

            if (this.playerSkillSystem) {
                this.playerSkillSystem.clearAll();
                // this.playerSkillSystem = undefined;
            }

            const uiScene = this.scene.get('UIScene') as UIScene;
            if (uiScene && uiScene.reset) {
                uiScene.reset();
            }

            if (this.xpOrbSystem) {
                this.xpOrbSystem.clearAllOrbs();
                // this.xpOrbSystem = undefined;
            }

            if (this.mobSpawnerUI) {
                this.mobSpawnerUI.destroy();
                // this.mobSpawnerUI = undefined;
            }

            if (this.roundManager) {
                this.roundManager.destroy();
                // this.roundManager = undefined;
            }
            if (this.gameOverText) {
                this.gameOverText.destroy();
                this.gameOverText = null;
            }
            if (this.restartInstructionText) {
                this.restartInstructionText.destroy();
                this.restartInstructionText = null;
            }
            if (this.gameOverRestartText) {
                this.gameOverRestartText.destroy();
                this.gameOverRestartText = null;
            }
            // ObjectRects handled by PhysicsSystem
            // DoorColliders handled by PhysicsSystem
            if (this.physicsSystem) {
                this.physicsSystem.destroy();
            }
            this.tweens.killAll();
            this.time.removeAllEvents();
        } catch (e) {
            console.error('Error during scene shutdown:', e);
        }
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
        this.gameOverText.setScrollFactor(0).setDepth(20000); // Make UI fixed to screen

        // Display restart instruction (store reference for cleanup)
        const restartText = this.add.text(512, 350, 'Press R to try a different archetype', {
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0.5);
        restartText.setScrollFactor(0).setDepth(20000); // Make UI fixed to screen

        // Store reference for cleanup during restart
        this.gameOverRestartText = restartText;
    }

    /**
     * Sets up collision for a specific enemy with tilemap layers and objects
     * @param enemySprite - The enemy sprite to add collision for
     */
    private setupEnemyTilemapCollisions(enemySprite: Phaser.GameObjects.Sprite): void {
        this.physicsSystem.setupEnemyCollisions(enemySprite);
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
        this.physicsSystem.renderDebug();

        // Convert delta from milliseconds to seconds
        const deltaTime = delta / 1000;

        // Update game systems
        this.player.update(this.enemySystem?.getEnemies() || [], deltaTime);

        if (!this.player) return; // Safety check after update

        const playerPos = this.player.getPosition();
        this.enemySystem?.update(playerPos.x, playerPos.y, deltaTime);
        this.playerSkillSystem?.update(deltaTime);

        this.lightingSystem.update(this.player);

        // Update XP orb system
        this.xpOrbSystem?.update();

        // Enhanced collision detection
        if (this.player && this.enemySystem) {
            // Player vs Enemies (Physical body collision)
            this.player.combatComponent.checkCollisionWithEnemies(this.enemySystem.getEnemies(), this.enemySystem.getShields());

            // Player vs All Attacks (Projectiles & AOE)
            this.player.combatComponent.checkAttacks(this.enemySystem.getUnifiedAttacks());
        }

        // Collect XP orbs
        if (this.player && this.xpOrbSystem) {
            this.player.collectXPOrbs(this.xpOrbSystem);
        }

        // Update AI Director
        this.aiDirector?.update(this.player, this.enemySystem);

        // Update Round Manager
        this.roundManager?.update(deltaTime);

        // --- DOOR CONTROL LOGIC ---
        // The door to the Dark Forest unlocks ONLY when Round 5 is reached.
        // Rounds 1-4: Door remains locked and impassable.
        if (this.roundManager && this.roundManager.getCurrentRound() >= 5) {
            this.mapInteractionSystem.openDarkForestGate();
        }
    }

    public getPlayerSkillSystem(): PlayerSkillSystem {
        return this.playerSkillSystem;
    }
}
