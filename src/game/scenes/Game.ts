import { Scene } from 'phaser';
import { Player } from '../Player';
import { EnemySystem } from '../EnemySystem';
import { AIDirector } from '../AIDirector';
import { PlayerArchetypeType } from '../PlayerArchetype';

export class Game extends Scene {
    private player!: Player;
    private enemySystem!: EnemySystem;
    private aiDirector!: AIDirector;
    private gameStarted: boolean = false;
    private archetypeSelectionUI: Phaser.GameObjects.Group;
    private gameUI: Phaser.GameObjects.Group;
    private gameOverText: Phaser.GameObjects.Text | null = null;
    private statsText: Phaser.GameObjects.Text;
    private directorStatsText: Phaser.GameObjects.Text;

    constructor() {
        super('Game');
    }

    preload() {
        this.load.setPath('assets');
        this.load.image('background', 'bg.png');
        this.load.image('logo', 'logo.png');
    }

    create() {
        // Background
        this.add.image(512, 384, 'background');
        
        // Initialize UI groups
        this.archetypeSelectionUI = this.add.group();
        this.gameUI = this.add.group();
        
        // Create archetype selection screen
        this.createArchetypeSelection();
        
        // Initialize systems (but don't start yet)
        this.enemySystem = new EnemySystem(this);
        this.aiDirector = new AIDirector();
        
        // Create game UI (initially hidden)
        this.createGameUI();
    }

    private createArchetypeSelection(): void {
        // Title
        const title = this.add.text(512, 150, 'AI Game Director Demo', {
            fontSize: '48px',
            color: '#ffffff',
            fontFamily: 'Arial Black'
        }).setOrigin(0.5);
        this.archetypeSelectionUI.add(title);

        // Subtitle
        const subtitle = this.add.text(512, 200, 'Choose Your Player Archetype', {
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.archetypeSelectionUI.add(subtitle);

        // Tank button
        const tankButton = this.createArchetypeButton(200, 350, 'TANK', 
            'High Health, Low Speed\nClose-range combat', 0x4169E1, PlayerArchetypeType.TANK);
        this.archetypeSelectionUI.add(tankButton);

        // Glass Cannon button
        const glassCannonButton = this.createArchetypeButton(512, 350, 'GLASS CANNON', 
            'Low Health, High Damage\nLong-range combat', 0xFF6347, PlayerArchetypeType.GLASS_CANNON);
        this.archetypeSelectionUI.add(glassCannonButton);

        // Evasive button
        const evasiveButton = this.createArchetypeButton(824, 350, 'EVASIVE', 
            'Medium Health, High Speed\nArea-of-effect combat', 0x32CD32, PlayerArchetypeType.EVASIVE);
        this.archetypeSelectionUI.add(evasiveButton);

        // Instructions
        const instructions = this.add.text(512, 550, 
            'The AI Director will observe your playstyle and adapt enemy spawning to counter your strategy.\n\n' +
            'Controls: WASD/Arrow Keys to move, SPACE to attack', {
            fontSize: '16px',
            color: '#cccccc',
            align: 'center'
        }).setOrigin(0.5);
        this.archetypeSelectionUI.add(instructions);
    }

    private createArchetypeButton(x: number, y: number, title: string, description: string, 
                                 color: number, archetype: PlayerArchetypeType): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);
        
        // Button background
        const bg = this.add.rectangle(0, 0, 180, 120, color, 0.8);
        bg.setStrokeStyle(3, 0xffffff);
        bg.setInteractive();
        
        // Title text
        const titleText = this.add.text(0, -30, title, {
            fontSize: '18px',
            color: '#ffffff',
            fontFamily: 'Arial Black'
        }).setOrigin(0.5);
        
        // Description text
        const descText = this.add.text(0, 10, description, {
            fontSize: '12px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        
        container.add([bg, titleText, descText]);
        
        // Button interaction
        bg.on('pointerover', () => {
            bg.setAlpha(1);
            container.setScale(1.05);
        });
        
        bg.on('pointerout', () => {
            bg.setAlpha(0.8);
            container.setScale(1);
        });
        
        bg.on('pointerdown', () => {
            this.startGame(archetype);
        });
        
        return container;
    }

    private createGameUI(): void {
        // Stats display
        this.statsText = this.add.text(10, 10, '', {
            fontSize: '14px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        });
        this.gameUI.add(this.statsText);

        // AI Director stats
        this.directorStatsText = this.add.text(10, 100, '', {
            fontSize: '12px',
            color: '#ffff00',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        });
        this.gameUI.add(this.directorStatsText);

        // Initially hide game UI
        this.gameUI.setVisible(false);
    }

    private startGame(archetypeType: PlayerArchetypeType): void {
        // Hide archetype selection
        this.archetypeSelectionUI.setVisible(false);
        
        // Show game UI
        this.gameUI.setVisible(true);
        
        // Create player
        this.player = new Player(this, 512, 384, archetypeType);
        
        // Reset and start AI Director
        this.aiDirector.resetGame();
        this.aiDirector.setTrainingMode(true); // Enable learning
        
        // Clear any existing enemies
        this.enemySystem.clearAllEnemies();
        
        this.gameStarted = true;
        
        // Add restart instruction
        this.add.text(512, 750, 'Press R to restart and choose a different archetype', {
            fontSize: '14px',
            color: '#cccccc'
        }).setOrigin(0.5);
        
        // Add restart key
        this.input.keyboard!.on('keydown-R', () => {
            this.restartGame();
        });
    }

    private restartGame(): void {
        // Clean up current game
        if (this.player) {
            this.player.destroy();
        }
        this.enemySystem.clearAllEnemies();
        
        // Remove game over text if it exists
        if (this.gameOverText) {
            this.gameOverText.destroy();
            this.gameOverText = null;
        }
        
        // Reset state
        this.gameStarted = false;
        
        // Show archetype selection again
        this.archetypeSelectionUI.setVisible(true);
        this.gameUI.setVisible(false);
    }

    update(): void {
        if (!this.gameStarted || !this.player) return;
        
        // Check if player is alive
        if (!this.player.isAlive()) {
            this.handleGameOver();
            return;
        }
        
        // Update game systems
        this.player.update(this.enemySystem.getEnemies());
        
        const playerPos = this.player.getPosition();
        this.enemySystem.update(playerPos.x, playerPos.y);
        
        // Check collisions
        this.player.checkCollisionWithEnemies(this.enemySystem.getEnemies());
        
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
        
        this.statsText.setText(
            `Health: ${health}/${maxHealth}\n` +
            `XP: ${xp}\n` +
            `Enemies: ${enemyCount}\n` +
            `Archetype: ${archetype.type.toUpperCase()}`
        );
        
        // AI Director stats
        const replayBufferSize = this.aiDirector.getReplayBufferSize();
        this.directorStatsText.setText(
            `AI Director Status:\n` +
            `Learning: Active\n` +
            `Experience Buffer: ${replayBufferSize}/10000\n` +
            `Adapting to: ${archetype.type.replace('_', ' ').toUpperCase()}`
        );
    }

    private handleGameOver(): void {
        if (this.gameOverText) return; // Already showing game over
        
        this.gameStarted = false;
        
        this.gameOverText = this.add.text(512, 384, 
            'GAME OVER\n\nThe AI Director learned from your playstyle!\n\nPress R to try a different archetype', {
            fontSize: '32px',
            color: '#ff0000',
            fontFamily: 'Arial Black',
            align: 'center',
            backgroundColor: '#000000',
            padding: { x: 20, y: 20 }
        }).setOrigin(0.5).setDepth(1000);
    }
}
