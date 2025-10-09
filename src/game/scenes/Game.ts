import { Scene } from 'phaser';
import { Player } from '../Player';
import { EnemySystem, EnemyType } from '../EnemySystem';
import { AIDirector } from '../AIDirector';
import { PlayerArchetypeType } from '../PlayerArchetype';
import { AIMetricsDashboard } from '../../ui/AIMetricsDashboard';
import { ClassSelectionUI } from '../../ui/ClassSelectionUI';
import { XPOrbSystem } from '../XPOrbSystem';
import { EnhancedDesignSystem, EnhancedStyleHelpers } from '../../ui/EnhancedDesignSystem';
import { AssetManager } from '../systems/AssetManager';
import { MobSpawner } from '../systems/MobSpawner';
import { MOB_CONFIGS, MAIN_TILEMAP_CONFIG, COLLISION_CONFIG } from '../config/GameConfig';
import { AssetLoadingProgress, AssetLoadingResult } from '../types/AssetTypes';
import { MobConfig } from '../types/MobTypes';

export class Game extends Scene {
    private player!: Player;
    private enemySystem!: EnemySystem;
    private aiDirector!: AIDirector;
    private aiDashboard!: AIMetricsDashboard;
    private xpOrbSystem!: XPOrbSystem;
    private gameStarted: boolean = false;
    private classSelectionUI!: ClassSelectionUI;
    private gameUI: Phaser.GameObjects.Group;
    private gameOverText: Phaser.GameObjects.Text | null = null;
    private statsText: Phaser.GameObjects.Text;
    private directorStatsText: Phaser.GameObjects.Text;
    private aiControlsText!: Phaser.GameObjects.Text;
    private restartInstructionText: Phaser.GameObjects.Text | null = null;
    
    // New asset management systems
    private assetManager!: AssetManager;
    private tilemap!: Phaser.Tilemaps.Tilemap;
    private mobSpawner!: MobSpawner;
    private assetsLoaded: boolean = false;

    constructor() {
        super('Game');
    }

    preload() {
        this.load.setPath('assets');
        this.load.image('logo', 'logo.png');
        
        // Load tilemap assets
        this.load.tilemapTiledJSON('binkymap1', 'tilemaps/binkymap1.json');
        this.load.image('castlewall', 'tilemaps/castlewall.png');
        this.load.image('floor1', 'tilemaps/floor1.png');
        this.load.image('objectskeletonstatues', 'tilemaps/objectskeletonstatues.png');
        this.load.image('tiledwallandfloor', 'tilemaps/tiledwallandfloor.png');
        this.load.image('GraveyardTileset', 'tilemaps/GraveyardTileset.png');
        this.load.image('houses1', 'tilemaps/houses1.png');
        this.load.image('objectbrickstools', 'tilemaps/objectbrickstools.png');
        this.load.image('objecthouserocksstatues', 'tilemaps/objecthouserocksstatues.png');
        this.load.image('objectlogs', 'tilemaps/objectlogs.png');
        this.load.image('tents', 'tilemaps/tents.png');
        this.load.image('treesandplants', 'tilemaps/treesandplants.png');
        this.load.image('waggonsandmore', 'tilemaps/waggonsandmore.png');
        this.load.image('brokenspikedfence', 'tilemaps/brokenspikedfence.png');
        this.load.image('gatedoorandflags', 'tilemaps/gatedoorandflags.png');
        this.load.image('grassclippings1', 'tilemaps/grassclippings1.png');
        this.load.image('grassclippings2', 'tilemaps/grassclippings2.png');
        
        // Load XP orb image (keeping this as individual image for now)
        this.load.image('green_orb', 'images/green_orb.png');
        
        // Initialize the new asset management system
        this.assetManager = new AssetManager(this);
        
        // Load spritesheets during preload phase
        const spritesheetManager = this.assetManager.getSpritesheetManager();
        spritesheetManager.loadEssentialSpritesheets();
        
        // Load other assets using the asset manager
        this.assetManager.loadAllAssets([MAIN_TILEMAP_CONFIG]).then((result: AssetLoadingResult) => {
            console.log('Asset loading completed:', result);
        }).catch((error: Error) => {
            console.error('Failed to load assets:', error);
        });
        
        // Set up callback for when all assets are loaded
        this.load.on('complete', () => {
            this.assetsLoaded = true;
            
            // Register the already-loaded tilemap with the TilemapManager
            const tilemapManager = this.assetManager.getTilemapManager();
            tilemapManager.registerLoadedTilemap(MAIN_TILEMAP_CONFIG);
            
            this.setupSpritesheetAnimations();
            this.setupMobAnimations();
            this.initializeTilemap();
        });
    }

    create() {
        // Initialize UI groups
        this.gameUI = this.add.group();
        
        // Create enhanced class selection screen
        this.classSelectionUI = new ClassSelectionUI(this, {
            onClassSelected: (archetype: PlayerArchetypeType) => {
                this.startGame(archetype);
            },
            position: { x: 512, y: 384 },
            visible: true
        });
        
        // Initialize systems (but don't start yet)
        this.enemySystem = new EnemySystem(this);
        this.aiDirector = new AIDirector();
        this.xpOrbSystem = new XPOrbSystem(this);
        this.mobSpawner = new MobSpawner(this);
        
        // Initialize AI Dashboard with design system positioning
        this.aiDashboard = new AIMetricsDashboard(this, this.aiDirector, {
            position: { x: EnhancedDesignSystem.spacing.md, y: EnhancedDesignSystem.spacing.md },
            size: { width: 520, height: 420 },
            visible: false // Initially hidden until game starts
        });
        
        // Set enemy system reference for cost tracking
        this.aiDashboard.setEnemySystem(this.enemySystem);
        
        // Create animations
        this.createAnimations();
        
        // Create game UI (initially hidden)
        this.createGameUI();
        
        // Set up AI control keys
        this.setupAIControls();
    }

    /**
     * Initialize the tilemap using the asset management system
     * This method consolidates tilemap creation, layer setup, and collision configuration
     */
    private initializeTilemap(): void {
        const tilemapManager = this.assetManager.getTilemapManager();
        
        // Create the tilemap using the asset manager
        const createdTilemap = tilemapManager.createTilemap(MAIN_TILEMAP_CONFIG);
        
        if (!createdTilemap) {
            console.error('Failed to create tilemap');
            throw new Error('Tilemap creation failed - cannot continue game initialization');
        }
        
        this.tilemap = createdTilemap;
        
        // Set up collisions using the collision configuration
        tilemapManager.setupCollisions(MAIN_TILEMAP_CONFIG.name, COLLISION_CONFIG);
        
        // Update camera bounds to match tilemap
        this.cameras.main.setBounds(0, 0, this.tilemap.widthInPixels, this.tilemap.heightInPixels);
        
        // Set physics world bounds to match tilemap for full exploration
        this.physics.world.setBounds(0, 0, this.tilemap.widthInPixels, this.tilemap.heightInPixels);
        
        console.log('Tilemap initialization completed');
        
        // Spawn demo mobs after tilemap is ready
        this.spawnDemoMobs();
    }

    /**
     * Set up spritesheet animations using the loaded texture atlases
     */
    private setupSpritesheetAnimations(): void {
        const spritesheetManager = this.assetManager.getSpritesheetManager();
        
        // Create character animations from spritesheets
        // Note: This is a basic setup - you'll need to examine the JSON files to determine
        // which frames correspond to which animations
        
        // Example: Create walking animation for character from char-texture-0
        if (spritesheetManager.isSpritesheetLoaded('char-texture-0')) {
            const frameNames = spritesheetManager.getFrameNames('char-texture-0');
            console.log('Available frames in char-texture-0:', frameNames);
            
            // Create a basic walking animation using available frames
            // You'll need to adjust these frame names based on the actual JSON content
            if (frameNames.length > 0) {
                this.anims.create({
                    key: 'player_walk',
                    frames: this.anims.generateFrameNames('char-texture-0', {
                        prefix: '',
                        suffix: '',
                        frames: frameNames.slice(0, Math.min(8, frameNames.length)) // Use first 8 frames
                    }),
                    frameRate: 10,
                    repeat: -1
                });
                
                this.anims.create({
                    key: 'player_idle',
                    frames: this.anims.generateFrameNames('char-texture-0', {
                        prefix: '',
                        suffix: '',
                        frames: [frameNames[0]] // Use first frame for idle
                    }),
                    frameRate: 1,
                    repeat: 0
                });
            }
        }
        
        // Create mob animations from mob spritesheets
        if (spritesheetManager.isSpritesheetLoaded('mob-texture-0')) {
            const frameNames = spritesheetManager.getFrameNames('mob-texture-0');
            console.log('Available frames in mob-texture-0:', frameNames);
            
            if (frameNames.length > 0) {
                this.anims.create({
                    key: 'mob_walk',
                    frames: this.anims.generateFrameNames('mob-texture-0', {
                        prefix: '',
                        suffix: '',
                        frames: frameNames.slice(0, Math.min(6, frameNames.length))
                    }),
                    frameRate: 8,
                    repeat: -1
                });
                
                this.anims.create({
                    key: 'mob_idle',
                    frames: this.anims.generateFrameNames('mob-texture-0', {
                        prefix: '',
                        suffix: '',
                        frames: [frameNames[0]]
                    }),
                    frameRate: 1,
                    repeat: 0
                });
            }
        }
        
        console.log('Spritesheet animations setup completed');
    }

    /**
     * Set up mob animations using the loaded assets
     */
    private setupMobAnimations(): void {
        // Mob animations are now created in setupSpritesheetAnimations()
        // This method is kept for compatibility but no longer creates individual mob animations
        console.log('setupMobAnimations called - mob animations are now handled by spritesheets');
    }



    /**
     * Spawn demo mobs to showcase the dynamic loading system
     */
    private spawnDemoMobs(): void {
        if (!this.assetsLoaded || !this.mobSpawner) {
            console.warn('Cannot spawn demo mobs: assets not loaded or spawner not initialized');
            return;
        }

        // Spawn mobs at predefined locations
        const spawnPoints = MAIN_TILEMAP_CONFIG.spawnPoints?.enemies || [];
        
        if (spawnPoints.length > 0) {
            this.mobSpawner.spawnMobsAtSpawnPoints(spawnPoints);
            console.log(`Spawned ${spawnPoints.length} demo mobs`);
        } else {
            // Fallback: spawn some mobs at default locations
            this.mobSpawner.spawnMob('skeleton', 600, 300);
            this.mobSpawner.spawnMob('goblin', 400, 500);
            this.mobSpawner.spawnMob('archer', 800, 200);
            console.log('Spawned fallback demo mobs');
        }
    }





    private createGameUI(): void {
        // Stats display with design system styling
        this.statsText = this.add.text(
            EnhancedDesignSystem.spacing.xl, 
            EnhancedDesignSystem.spacing.xl, 
            '', 
            EnhancedStyleHelpers.createTextStyle({
                size: 'lg',
                color: EnhancedDesignSystem.colors.primary,
                stroke: true,
                background: true
            })
        );
        this.statsText.setDepth(EnhancedDesignSystem.zIndex.ui);
        this.statsText.setScrollFactor(0); // Make UI fixed to screen
        this.gameUI.add(this.statsText);

        // AI Director stats with design system styling
        this.directorStatsText = this.add.text(
            EnhancedDesignSystem.spacing.xl, 
            120, 
            '', 
            EnhancedStyleHelpers.createTextStyle({
                size: 'md',
                color: EnhancedDesignSystem.colors.primaryDark,
                stroke: true,
                background: true
            })
        );
        this.directorStatsText.setDepth(EnhancedDesignSystem.zIndex.ui);
        this.directorStatsText.setScrollFactor(0); // Make UI fixed to screen
        this.gameUI.add(this.directorStatsText);

        // Initially hide game UI
        this.gameUI.setVisible(false);
    }

    private createAnimations(): void {
        // All animations are now created in setupSpritesheetAnimations()
        // This method is kept for compatibility but no longer creates individual frame animations
        console.log('createAnimations called - animations will be created from spritesheets');
    }

    private startGame(archetypeType: PlayerArchetypeType): void {
        // Hide class selection
        this.classSelectionUI.hide();
        
        // Show game UI
        this.gameUI.setVisible(true);
        
        // Create player
        this.player = new Player(this, 512, 384, archetypeType);
        
        // Make camera follow the player for full map exploration
        this.cameras.main.startFollow(this.player.sprite);
        this.cameras.main.setLerp(0.1, 0.1); // Smooth camera following
        
        // Set up enemy death callback to spawn XP orbs
        this.player.setEnemyDeathCallback((x: number, y: number, enemyType: EnemyType, xpValue: number) => {
            this.xpOrbSystem.spawnXPOrbs(x, y, enemyType, xpValue);
        });
        
        // Reset and start AI Director
        this.aiDirector.resetGame();
        this.aiDirector.setTrainingMode(true); // Enable learning
        
        // Clear any existing enemies and XP orbs
        this.enemySystem.clearAllEnemies();
        this.xpOrbSystem.clearAllOrbs();
        
        this.gameStarted = true;
        
        // Add restart instruction
        this.restartInstructionText = this.add.text(512, 750, 'Press R to restart and choose a different archetype', {
            fontSize: '14px',
            color: '#cccccc'
        }).setOrigin(0.5);
        this.restartInstructionText.setScrollFactor(0); // Make UI fixed to screen
        
        // Add restart key
        this.input.keyboard!.on('keydown-R', () => {
            this.restartGame();
        });
        
        // Show AI dashboard when game starts
        this.aiDashboard.show();
    }

    private restartGame(): void {
        // Clean up current game
        if (this.player) {
            this.player.destroy();
        }
        this.enemySystem.clearAllEnemies();
        this.xpOrbSystem.clearAllOrbs();
        
        // Remove game over text if it exists
        if (this.gameOverText) {
            this.gameOverText.destroy();
            this.gameOverText = null;
        }
        
        // Clean up AI controls text
        if (this.aiControlsText) {
            this.aiControlsText.destroy();
        }
        
        // Clean up restart instruction text
        if (this.restartInstructionText) {
            this.restartInstructionText.destroy();
            this.restartInstructionText = null;
        }
        
        // Reset state
        this.gameStarted = false;
        
        // Show class selection again
        this.classSelectionUI.show();
        this.gameUI.setVisible(false);
    }

    update(_time: number, delta: number): void {
        if (!this.gameStarted || !this.player) return;
        
        // Check if player is alive
        if (!this.player.isAlive()) {
            this.handleGameOver();
            return;
        }
        
        // Convert delta from milliseconds to seconds
        const deltaTime = delta / 1000;
        
        // Update game systems
        this.player.update(this.enemySystem.getEnemies(), deltaTime);
        
        const playerPos = this.player.getPosition();
        this.enemySystem.update(playerPos.x, playerPos.y, deltaTime);
        

        
        // Check collisions
        this.player.checkCollisionWithEnemies(this.enemySystem.getEnemies());
        
        // Collect XP orbs
        this.player.collectXPOrbs(this.xpOrbSystem);
        
        // Update AI Director
        this.aiDirector.update(this.player.getArchetype(), this.enemySystem);
        
        // Update UI
        this.updateGameUI();
    }

    private updateGameUI(): void {
        if (!this.player) return;
        
        const archetype = this.player.getArchetype();
        const health = Math.ceil(archetype.currentHealth);
        const maxHealth = archetype.stats.maxHealth;
        const xp = Math.ceil(archetype.xpGained);
        const enemyCount = this.enemySystem.getEnemyCount();
        const orbCount = this.xpOrbSystem.getOrbCount();
        const availableXP = this.xpOrbSystem.getTotalAvailableXP();
        
        this.statsText.setText(
            `Health: ${health}/${maxHealth}\n` +
            `XP: ${xp}\n` +
            `Enemies: ${enemyCount}\n` +
            `XP Orbs: ${orbCount} (${availableXP} XP)\n` +
            `Archetype: ${archetype.type.toUpperCase()}`
        );
        
        // AI Director stats with budget information
        const trainingStatus = this.aiDirector.getTrainingStatus();
        const difficultyStats = this.aiDirector.getDifficultyStats();
        const budgetStatus = this.aiDirector.getBudgetStatus();
        this.directorStatsText.setText(
            `AI Director Status:\n` +
            `${trainingStatus}\n` +
            `${difficultyStats}\n` +
            `${budgetStatus}\n` +
            `Adapting to: ${archetype.type.replace('_', ' ').toUpperCase()}`
        );
    }

    private handleGameOver(): void {
        if (this.gameOverText) return; // Already showing game over
        
        this.gameStarted = false;
        
        // Hide AI dashboard on game over
        this.aiDashboard.hide();
        
        this.gameOverText = this.add.text(
            512, 
            384, 
            'GAME OVER\n\nThe AI Director learned from your playstyle!\n\nPress R to try a different archetype', 
            {
                ...EnhancedStyleHelpers.createTextStyle({
                    size: 'title',
                    color: EnhancedDesignSystem.colors.primary,
                    stroke: true,
                    background: true
                }),
                align: 'center',
                padding: { x: EnhancedDesignSystem.spacing.xxxl, y: EnhancedDesignSystem.spacing.xxl }
            }
        ).setOrigin(0.5).setDepth(EnhancedDesignSystem.zIndex.modal);
        this.gameOverText.setScrollFactor(0); // Make UI fixed to screen
    }
    
    private setupAIControls(): void {
        // Add AI controls text with design system styling
        this.aiControlsText = this.add.text(
            EnhancedDesignSystem.spacing.xl, 
            680, 
            'AI Controls: F1-Dashboard | F2-Save | F3-Load | F4-Export | F5-Training | F6-Difficulty', 
            EnhancedStyleHelpers.createTextStyle({
                size: 'md',
                color: EnhancedDesignSystem.colors.primaryDark,
                background: true
            })
        ).setDepth(EnhancedDesignSystem.zIndex.ui);
        this.aiControlsText.setScrollFactor(0); // Make UI fixed to screen
        
        // Set up keyboard handlers for AI controls
        this.input.keyboard!.on('keydown-F1', () => {
            this.aiDashboard.toggle();
        });
        
        this.input.keyboard!.on('keydown-F2', async () => {
            const success = await this.aiDirector.saveModel();
            this.showNotification(success ? 'Model saved successfully!' : 'Failed to save model', success ? '#00ff00' : '#ff0000');
        });
        
        this.input.keyboard!.on('keydown-F3', async () => {
            const models = await this.aiDirector.listSavedModels();
            if (models.length > 0) {
                // Load the most recent model
                const latestModel = models[models.length - 1];
                const success = await this.aiDirector.loadModel(latestModel);
                this.showNotification(
                    success ? `Loaded model: ${latestModel}` : 'Failed to load model', 
                    success ? '#00ff00' : '#ff0000'
                );
            } else {
                this.showNotification('No saved models found', '#ffff00');
            }
        });
        
        this.input.keyboard!.on('keydown-F4', () => {
            const data = this.aiDirector.exportTrainingData();
            this.downloadJSON(data, `ai-training-data-${Date.now()}.json`);
            this.showNotification('Training data exported!', '#00ff00');
        });
        
        this.input.keyboard!.on('keydown-F5', () => {
            const isTraining = this.aiDirector.isTraining();
            this.aiDirector.setTrainingMode(!isTraining);
            this.showNotification(
                `Training ${!isTraining ? 'enabled' : 'disabled'}`, 
                !isTraining ? '#00ff00' : '#ffff00'
            );
        });
        
        this.input.keyboard!.on('keydown-F6', () => {
            this.aiDirector.cycleDifficulty();
            const currentDifficulty = this.aiDirector.getCurrentDifficulty();
            const config = this.aiDirector.getDifficultyConfig(currentDifficulty);
            this.showNotification(`Difficulty: ${config?.name || 'Unknown'}`, '#00ff00');
        });
    }
    
    private showNotification(message: string, color: string): void {
        const notification = this.add.text(512, 100, message, {
            fontSize: '18px',
            color: color,
            fontFamily: 'Cinzel, serif',
            backgroundColor: 'rgba(26, 26, 26, 0.95)',
            padding: { x: 15, y: 10 },
            stroke: color,
            strokeThickness: 1
        }).setOrigin(0.5).setDepth(2000);
        
        // Fade out after 3 seconds
        this.tweens.add({
            targets: notification,
            alpha: 0,
            duration: 3000,
            onComplete: () => notification.destroy()
        });
    }
    
    private downloadJSON(data: any, filename: string): void {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
