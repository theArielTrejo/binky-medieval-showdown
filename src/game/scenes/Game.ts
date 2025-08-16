import { Scene } from 'phaser';
import { Player } from '../Player';
import { EnemySystem } from '../EnemySystem';
import { AIDirector } from '../AIDirector';
import { PlayerArchetypeType } from '../PlayerArchetype';
import { AIMetricsDashboard } from '../../ui/AIMetricsDashboard';
import { ClassSelectionUI } from '../../ui/ClassSelectionUI';

export class Game extends Scene {
    private player!: Player;
    private enemySystem!: EnemySystem;
    private aiDirector!: AIDirector;
    private aiDashboard!: AIMetricsDashboard;
    private gameStarted: boolean = false;
    private classSelectionUI!: ClassSelectionUI;
    private gameUI: Phaser.GameObjects.Group;
    private gameOverText: Phaser.GameObjects.Text | null = null;
    private statsText: Phaser.GameObjects.Text;
    private directorStatsText: Phaser.GameObjects.Text;
    private aiControlsText!: Phaser.GameObjects.Text;

    constructor() {
        super('Game');
    }

    preload() {
        this.load.setPath('assets');
        this.load.image('background', 'bg.png');
        this.load.image('logo', 'logo.png');
        
        // Load Dark Oracle character sprites
        this.load.image('dark_oracle_1', 'characters/dark_oracle_1_idle.png');
        this.load.image('dark_oracle_2', 'characters/dark_oracle_2_idle.png');
        this.load.image('dark_oracle_3', 'characters/dark_oracle_3_idle.png');
        
        // Load animation frames for Dark Oracle 1 (only available character)
        for (let i = 0; i <= 17; i++) {
            const frameNum = i.toString().padStart(3, '0');
            this.load.image(`dark_oracle_1_idle_${frameNum}`, `characters/0_Dark_Oracle_Idle_${frameNum}.png`);
        }
        for (let i = 0; i <= 11; i++) {
            const frameNum = i.toString().padStart(3, '0');
            this.load.image(`dark_oracle_1_running_${frameNum}`, `characters/0_Dark_Oracle_Running_${frameNum}.png`);
        }
        
        // For Dark Oracle 2 and 3, we'll reuse Dark Oracle 1 frames
        // This ensures animations work for all character types
        for (let i = 0; i <= 17; i++) {
            const frameNum = i.toString().padStart(3, '0');
            this.load.image(`dark_oracle_2_idle_${frameNum}`, `characters/0_Dark_Oracle_Idle_${frameNum}.png`);
            this.load.image(`dark_oracle_3_idle_${frameNum}`, `characters/0_Dark_Oracle_Idle_${frameNum}.png`);
        }
        for (let i = 0; i <= 11; i++) {
            const frameNum = i.toString().padStart(3, '0');
            this.load.image(`dark_oracle_2_running_${frameNum}`, `characters/0_Dark_Oracle_Running_${frameNum}.png`);
            this.load.image(`dark_oracle_3_running_${frameNum}`, `characters/0_Dark_Oracle_Running_${frameNum}.png`);
        }
    }

    create() {
        // Background
        this.add.image(512, 384, 'background');
        
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
        
        // Initialize AI Dashboard
        this.aiDashboard = new AIMetricsDashboard(this, this.aiDirector, {
            position: { x: 10, y: 10 },
            size: { width: 500, height: 400 },
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





    private createGameUI(): void {
        // Stats display with elegant styling
        this.statsText = this.add.text(20, 20, '', {
            fontSize: '16px',
            color: '#d4af37',
            fontFamily: 'Cinzel, serif',
            backgroundColor: 'rgba(26, 26, 26, 0.9)',
            padding: { x: 15, y: 10 },
            stroke: '#d4af37',
            strokeThickness: 1
        });
        this.gameUI.add(this.statsText);

        // AI Director stats with elegant styling
        this.directorStatsText = this.add.text(20, 120, '', {
            fontSize: '14px',
            color: '#c9b037',
            fontFamily: 'Cinzel, serif',
            backgroundColor: 'rgba(26, 26, 26, 0.9)',
            padding: { x: 15, y: 10 },
            stroke: '#c9b037',
            strokeThickness: 1
        });
        this.gameUI.add(this.directorStatsText);

        // Initially hide game UI
        this.gameUI.setVisible(false);
    }

    private createAnimations(): void {
        // Create idle animation for Dark Oracle 1
        this.anims.create({
            key: 'dark_oracle_1_idle',
            frames: [
                { key: 'dark_oracle_1_idle_000' },
                { key: 'dark_oracle_1_idle_001' },
                { key: 'dark_oracle_1_idle_002' },
                { key: 'dark_oracle_1_idle_003' },
                { key: 'dark_oracle_1_idle_004' },
                { key: 'dark_oracle_1_idle_005' },
                { key: 'dark_oracle_1_idle_006' },
                { key: 'dark_oracle_1_idle_007' },
                { key: 'dark_oracle_1_idle_008' },
                { key: 'dark_oracle_1_idle_009' },
                { key: 'dark_oracle_1_idle_010' },
                { key: 'dark_oracle_1_idle_011' },
                { key: 'dark_oracle_1_idle_012' },
                { key: 'dark_oracle_1_idle_013' },
                { key: 'dark_oracle_1_idle_014' },
                { key: 'dark_oracle_1_idle_015' },
                { key: 'dark_oracle_1_idle_016' },
                { key: 'dark_oracle_1_idle_017' }
            ],
            frameRate: 12,
            repeat: -1
        });
        
        // Create running animation for Dark Oracle 1
        this.anims.create({
            key: 'dark_oracle_1_running',
            frames: [
                { key: 'dark_oracle_1_running_000' },
                { key: 'dark_oracle_1_running_001' },
                { key: 'dark_oracle_1_running_002' },
                { key: 'dark_oracle_1_running_003' },
                { key: 'dark_oracle_1_running_004' },
                { key: 'dark_oracle_1_running_005' },
                { key: 'dark_oracle_1_running_006' },
                { key: 'dark_oracle_1_running_007' },
                { key: 'dark_oracle_1_running_008' },
                { key: 'dark_oracle_1_running_009' },
                { key: 'dark_oracle_1_running_010' },
                { key: 'dark_oracle_1_running_011' }
            ],
            frameRate: 15,
            repeat: -1
        });
        
        // Create animations for Dark Oracle 2
        this.anims.create({
            key: 'dark_oracle_2_idle',
            frames: [
                { key: 'dark_oracle_2_idle_000' },
                { key: 'dark_oracle_2_idle_001' },
                { key: 'dark_oracle_2_idle_002' },
                { key: 'dark_oracle_2_idle_003' },
                { key: 'dark_oracle_2_idle_004' },
                { key: 'dark_oracle_2_idle_005' },
                { key: 'dark_oracle_2_idle_006' },
                { key: 'dark_oracle_2_idle_007' },
                { key: 'dark_oracle_2_idle_008' },
                { key: 'dark_oracle_2_idle_009' },
                { key: 'dark_oracle_2_idle_010' },
                { key: 'dark_oracle_2_idle_011' },
                { key: 'dark_oracle_2_idle_012' },
                { key: 'dark_oracle_2_idle_013' },
                { key: 'dark_oracle_2_idle_014' },
                { key: 'dark_oracle_2_idle_015' },
                { key: 'dark_oracle_2_idle_016' },
                { key: 'dark_oracle_2_idle_017' }
            ],
            frameRate: 12,
            repeat: -1
        });
        
        this.anims.create({
            key: 'dark_oracle_2_running',
            frames: [
                { key: 'dark_oracle_2_running_000' },
                { key: 'dark_oracle_2_running_001' },
                { key: 'dark_oracle_2_running_002' },
                { key: 'dark_oracle_2_running_003' },
                { key: 'dark_oracle_2_running_004' },
                { key: 'dark_oracle_2_running_005' },
                { key: 'dark_oracle_2_running_006' },
                { key: 'dark_oracle_2_running_007' },
                { key: 'dark_oracle_2_running_008' },
                { key: 'dark_oracle_2_running_009' },
                { key: 'dark_oracle_2_running_010' },
                { key: 'dark_oracle_2_running_011' }
            ],
            frameRate: 15,
            repeat: -1
        });
        
        // Create animations for Dark Oracle 3
        this.anims.create({
            key: 'dark_oracle_3_idle',
            frames: [
                { key: 'dark_oracle_3_idle_000' },
                { key: 'dark_oracle_3_idle_001' },
                { key: 'dark_oracle_3_idle_002' },
                { key: 'dark_oracle_3_idle_003' },
                { key: 'dark_oracle_3_idle_004' },
                { key: 'dark_oracle_3_idle_005' },
                { key: 'dark_oracle_3_idle_006' },
                { key: 'dark_oracle_3_idle_007' },
                { key: 'dark_oracle_3_idle_008' },
                { key: 'dark_oracle_3_idle_009' },
                { key: 'dark_oracle_3_idle_010' },
                { key: 'dark_oracle_3_idle_011' },
                { key: 'dark_oracle_3_idle_012' },
                { key: 'dark_oracle_3_idle_013' },
                { key: 'dark_oracle_3_idle_014' },
                { key: 'dark_oracle_3_idle_015' },
                { key: 'dark_oracle_3_idle_016' },
                { key: 'dark_oracle_3_idle_017' }
            ],
            frameRate: 12,
            repeat: -1
        });
        
        this.anims.create({
            key: 'dark_oracle_3_running',
            frames: [
                { key: 'dark_oracle_3_running_000' },
                { key: 'dark_oracle_3_running_001' },
                { key: 'dark_oracle_3_running_002' },
                { key: 'dark_oracle_3_running_003' },
                { key: 'dark_oracle_3_running_004' },
                { key: 'dark_oracle_3_running_005' },
                { key: 'dark_oracle_3_running_006' },
                { key: 'dark_oracle_3_running_007' },
                { key: 'dark_oracle_3_running_008' },
                { key: 'dark_oracle_3_running_009' },
                { key: 'dark_oracle_3_running_010' },
                { key: 'dark_oracle_3_running_011' }
            ],
            frameRate: 15,
            repeat: -1
        });
    }

    private startGame(archetypeType: PlayerArchetypeType): void {
        // Hide class selection
        this.classSelectionUI.hide();
        
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
        
        // Show AI dashboard when game starts
        this.aiDashboard.show();
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
        
        // Clean up AI controls text
        if (this.aiControlsText) {
            this.aiControlsText.destroy();
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
        
        this.gameOverText = this.add.text(512, 384, 
            'GAME OVER\n\nThe AI Director learned from your playstyle!\n\nPress R to try a different archetype', {
            fontSize: '36px',
            color: '#d4af37',
            fontFamily: 'Cinzel, serif',
            align: 'center',
            backgroundColor: 'rgba(26, 26, 26, 0.95)',
            padding: { x: 30, y: 25 },
            stroke: '#d4af37',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(1000);
    }
    
    private setupAIControls(): void {
        // Add AI controls text
        this.aiControlsText = this.add.text(20, 680, 
            'AI Controls: F1-Dashboard | F2-Save | F3-Load | F4-Export | F5-Training | F6-Difficulty', 
            {
                fontSize: '14px',
                color: '#c9b037',
                backgroundColor: 'rgba(26, 26, 26, 0.9)',
                padding: { x: 12, y: 8 },
                fontFamily: 'Cinzel, serif',
                stroke: '#c9b037',
                strokeThickness: 1
            }
        ).setDepth(1000);
        
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
            const isTraining = this.aiDirector.getIsTraining();
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
