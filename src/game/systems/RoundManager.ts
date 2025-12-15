import { Scene } from 'phaser';
import { EnemySystem } from './EnemySystem';
import { AIDirector } from './AIDirector';
import { AIDirectorV2 } from './ai-director/AIDirectorV2';
import { EnemyType } from '../types/EnemyTypes';
import { AudioManager } from './AudioManager';

export enum RoundState {
    WAITING_TO_START, // Initial state or between rounds
    SPAWNING,         // AI Director actively spawning beats
    IN_PROGRESS,      // Enemies are alive, fighting
    ROUND_COMPLETED   // All enemies dead
}

export class RoundManager {
    private scene: Scene;
    private enemySystem: EnemySystem;
    private aiDirector: AIDirector;
    private aiDirectorV2: AIDirectorV2;
    private player: any;  // Player reference for AI Director

    private currentRound: number = 0;
    private state: RoundState = RoundState.WAITING_TO_START;
    private stateTimer: number = 0;

    private roundText: Phaser.GameObjects.Text | null = null;
    private announcementText: Phaser.GameObjects.Text | null = null;

    // Config
    private timeBetweenRounds: number = 5; // Seconds
    private useNewAIDirector: boolean = true;  // Flag to use new 3-layer system

    constructor(scene: Scene, enemySystem: EnemySystem, aiDirector: AIDirector, player?: any) {
        this.scene = scene;
        this.enemySystem = enemySystem;
        this.aiDirector = aiDirector;
        this.player = player || null;
        
        // Initialize new AI Director V2
        this.aiDirectorV2 = new AIDirectorV2();

        this.createUI();
        
        // Also listen for playerReady in case player is set later
        scene.events.on('playerReady', (p: any) => {
            this.player = p;
            console.log('[RoundManager] Player reference received');
        });
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
        this.scene.registry.set("current_round", this.currentRound);

        // === Unlock additional spawn zones based on round number ===
        const zones = this.scene.registry.get("enemy_spawn_zones") || [];
        zones.forEach((z: any) => {
            const name = z.name;

            if (this.currentRound >= 1 && name === "zone_graveyard") {
                const prop = z.properties.find((p: any) => p.name === "active");
                if (prop) prop.value = true;
            }

            if (this.currentRound >= 6 && name === "zone_forest") {
                const prop = z.properties.find((p: any) => p.name === "active");
                if (prop) prop.value = true;
            }

            if (this.currentRound >= 11 && name === "zone_town") {
                const prop = z.properties.find((p: any) => p.name === "active");
                if (prop) prop.value = true;
            }

            if (this.currentRound >= 16 && name === "zone_water") {
                const prop = z.properties.find((p: any) => p.name === "active");
                if (prop) prop.value = true;
            }
        });

        this.state = RoundState.WAITING_TO_START;
        this.stateTimer = this.timeBetweenRounds;
        this.updateUI();
        AudioManager.getInstance().playSFX('new-round');
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

    public async update(deltaTime: number): Promise<void> {
        switch (this.state) {
            case RoundState.WAITING_TO_START:
                this.stateTimer -= deltaTime;
                if (this.stateTimer <= 0) {
                    this.spawnRound();
                }
                break;

            case RoundState.SPAWNING:
                // AI Director V2 handles spawning in beats
                if (this.useNewAIDirector && this.player) {
                    // Check if budget is exhausted BEFORE calling update
                    if (this.aiDirectorV2.isRoundBudgetExhausted()) {
                        this.state = RoundState.IN_PROGRESS;
                        console.log(`[RoundManager] Round ${this.currentRound} spawning complete, waiting for enemies to be cleared`);
                        break;  // Exit early
                    }
                    
                    await this.aiDirectorV2.update(this.player, this.enemySystem);
                    
                    // Safety check: if no enemies after 5 seconds, force a basic spawn
                    if (this.enemySystem.getEnemyCount() === 0 && this.stateTimer < -5) {
                        console.warn('[RoundManager] No enemies spawned after 5s, forcing basic spawn');
                        this.forceBasicSpawn();
                    }
                } else {
                    // Legacy: instant spawn (player not available)
                    console.log('[RoundManager] Using legacy spawn (no player ref)');
                    this.state = RoundState.IN_PROGRESS;
                }
                break;

            case RoundState.IN_PROGRESS:
                // Continue letting AI director spawn if budget remains
                if (this.useNewAIDirector && this.player && !this.aiDirectorV2.isRoundBudgetExhausted()) {
                    await this.aiDirectorV2.update(this.player, this.enemySystem);
                }
                
                // Check if all enemies are dead AND budget exhausted
                const budgetExhausted = this.useNewAIDirector ? this.aiDirectorV2.isRoundBudgetExhausted() : true;
                if (this.enemySystem.getEnemyCount() === 0 && budgetExhausted) {
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

        if (this.useNewAIDirector && this.player) {
            // Use new 3-layer AI Director
            const budget = this.aiDirectorV2.startRound(this.currentRound);
            console.log(`[RoundManager] Starting Round ${this.currentRound} with AI Director V2`);
            console.log(`  Budget: ${budget.totalBudget}, Max Alive: ${budget.maxConcurrentEnemies}, Spawn Cap: ${budget.spawnCap}`);
            
            // AI Director will handle spawning in beats during update()
            return;
        }
        
        // If player not available yet but using new director, fall through to legacy
        if (this.useNewAIDirector && !this.player) {
            console.warn('[RoundManager] Player not available, using legacy spawning');
        }

        // Legacy spawning (fallback)
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

        console.log(`Starting Round ${this.currentRound} with ${totalEnemies} enemies (legacy mode).`);

        types.forEach(wave => {
            if (wave.count > 0) {
                this.enemySystem.spawnWave(wave.type, wave.count, 'screen_edges');
            }
        });
    }

    private completeRound(): void {
        this.state = RoundState.ROUND_COMPLETED;
        this.showAnnouncement("Round Complete!", 2000);
        console.log(`Round ${this.currentRound} completed.`);
    }
    
    /**
     * Emergency fallback spawn if AI Director fails
     */
    private forceBasicSpawn(): void {
        const baseCount = 3 + Math.floor(this.currentRound * 0.5);
        console.log(`[RoundManager] Force spawning ${baseCount} gnolls`);
        this.enemySystem.spawnWave(EnemyType.GNOLL, baseCount, 'screen_edges');
        
        if (this.currentRound >= 2) {
            this.enemySystem.spawnWave(EnemyType.ARCHER, 1, 'screen_edges');
        }
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
