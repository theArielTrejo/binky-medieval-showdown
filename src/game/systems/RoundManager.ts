import { Scene } from 'phaser';
import { EnemySystem } from './EnemySystem';
import { AIDirector } from './AIDirector';
import { EnemyType } from '../types/EnemyTypes';

export enum RoundState {
    WAITING_TO_START, // Initial state or between rounds
    SPAWNING,         // Spawning enemies
    IN_PROGRESS,      // Enemies are alive, fighting
    ROUND_COMPLETED   // All enemies dead
}

export class RoundManager {
    private scene: Scene;
    private enemySystem: EnemySystem;
    private aiDirector: AIDirector;
    
    private currentRound: number = 0;
    private state: RoundState = RoundState.WAITING_TO_START;
    private stateTimer: number = 0;
    
    private roundText: Phaser.GameObjects.Text | null = null;
    private announcementText: Phaser.GameObjects.Text | null = null;
    
    // Config
    private timeBetweenRounds: number = 5; // Seconds
    
    constructor(scene: Scene, enemySystem: EnemySystem, aiDirector: AIDirector) {
        this.scene = scene;
        this.enemySystem = enemySystem;
        this.aiDirector = aiDirector;
        
        this.createUI();
    }
    
    private createUI(): void {
        const width = this.scene.cameras.main.width;
        
        // Round Counter (Top Center)
        this.roundText = this.scene.add.text(width / 2, 50, 'Round: 0', {
            fontSize: '32px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2000);
        
        // Announcement Text (Center Screen)
        this.announcementText = this.scene.add.text(width / 2, this.scene.cameras.main.height / 2 - 100, '', {
            fontSize: '64px',
            color: '#ffdd00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2000).setVisible(false);
    }
    
    public start(): void {
        // Disable standard AI Director behavior initially
        if (this.aiDirector.setActive) {
            this.aiDirector.setActive(false);
        }
        
        this.startNextRound();
    }

    public getCurrentRound(): number {
        return this.currentRound;
    }
    
    private startNextRound(): void {
        this.currentRound++;
        this.state = RoundState.WAITING_TO_START;
        this.stateTimer = this.timeBetweenRounds;
        
        this.updateUI();
        this.showAnnouncement(`Round ${this.currentRound}`, 3000);
    }
    
    private showAnnouncement(text: string, duration: number): void {
        if (!this.announcementText) return;
        
        this.announcementText.setText(text);
        this.announcementText.setVisible(true);
        this.announcementText.setAlpha(1);
        
        this.scene.tweens.add({
            targets: this.announcementText,
            alpha: 0,
            duration: 1000,
            delay: duration - 1000,
            onComplete: () => {
                this.announcementText?.setVisible(false);
            }
        });
    }
    
    public update(deltaTime: number): void {
        switch (this.state) {
            case RoundState.WAITING_TO_START:
                this.stateTimer -= deltaTime;
                if (this.stateTimer <= 0) {
                    this.spawnRound();
                }
                break;
                
            case RoundState.SPAWNING:
                // Spawning is instant for now, but could be staggered
                this.state = RoundState.IN_PROGRESS;
                break;
                
            case RoundState.IN_PROGRESS:
                // Check if all enemies are dead
                if (this.enemySystem.getEnemyCount() === 0) {
                    this.completeRound();
                }
                break;
                
            case RoundState.ROUND_COMPLETED:
                // Transition to next round
                this.startNextRound();
                break;
        }
    }
    
    private spawnRound(): void {
        this.state = RoundState.SPAWNING;
        
        // Calculate difficulty based on round
        // Simple formula: Round * 2 enemies, introducing new types
        
        // Base: 3 enemies
        let totalEnemies = 3 + Math.floor(this.currentRound * 1.5);
        
        // Cap enemies to prevent lag
        totalEnemies = Math.min(totalEnemies, 50);
        
        // Types
        const types: { type: EnemyType; count: number }[] = [];
        
        // Always have Gnolls (fodder)
        const gnollCount = Math.ceil(totalEnemies * 0.6);
        types.push({ type: EnemyType.GNOLL, count: gnollCount });
        
        let remaining = totalEnemies - gnollCount;
        
        // Round 2+: Add Archers
        if (this.currentRound >= 2 && remaining > 0) {
            const archerCount = Math.ceil(remaining * 0.5);
            types.push({ type: EnemyType.ARCHER, count: archerCount });
            remaining -= archerCount;
        }
        
        // Round 3+: Add Vikings
        if (this.currentRound >= 3 && remaining > 0) {
             const vikingCount = Math.ceil(remaining * 0.5);
             types.push({ type: EnemyType.SKELETON_VIKING, count: vikingCount });
             remaining -= vikingCount;
        }
        
        // Round 5+: Add Ogres (Mini-Boss)
        if (this.currentRound % 5 === 0) {
            types.push({ type: EnemyType.OGRE, count: Math.ceil(this.currentRound / 5) });
        }
        
        // Round 4+: Add Mages
        if (this.currentRound >= 4 && remaining > 0) {
             const mageCount = remaining;
             types.push({ type: EnemyType.LIGHTNING_MAGE, count: mageCount });
             remaining = 0;
        }
        
        // Remainder to Gnolls
        if (remaining > 0) {
            types[0].count += remaining;
        }
        
        console.log(`Starting Round ${this.currentRound} with ${totalEnemies} enemies.`);
        
        types.forEach(wave => {
            if (wave.count > 0) {
                this.enemySystem.spawnWave(wave.type, wave.count, 'screen_edges');
            }
        });
        
        // Optional: Enable AI Director for dynamic adjustment during the round?
        // For now, let's keep it controlled purely by waves to ensure clear rounds.
    }
    
    private completeRound(): void {
        this.state = RoundState.ROUND_COMPLETED;
        this.showAnnouncement("Round Complete!", 2000);
        console.log(`Round ${this.currentRound} completed.`);
    }
    
    private updateUI(): void {
        if (this.roundText) {
            this.roundText.setText(`Round: ${this.currentRound}`);
        }
    }
    
    public destroy(): void {
        if (this.roundText) this.roundText.destroy();
        if (this.announcementText) this.announcementText.destroy();
    }
}
