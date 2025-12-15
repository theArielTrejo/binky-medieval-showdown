/**
 * LAYER A: Round Director (Deterministic Pacing)
 * 
 * Controls global pacing without ML:
 * - Enemy budget per round
 * - Max concurrent enemies
 * - Spawn rate / intensity targets
 * - "Beats" (mini phases inside a round)
 * 
 * This ensures the game reliably ramps up every round.
 */

import { 
    RoundBudget, 
    DifficultyConfig, 
    SafetyRules,
    IntensityLevel,
    GameContext
} from './AIDirectorTypes';

export class RoundDirector {
    private difficultyConfigs: Map<string, DifficultyConfig> = new Map();
    private currentDifficulty: string = 'medium';
    private safetyRules: SafetyRules;
    
    // Round state
    private currentRound: number = 0;
    private currentBudget: RoundBudget | null = null;
    
    // Beat tracking
    private beatsThisRound: number = 0;
    private lastBeatTime: number = 0;
    
    // Adaptive scaling
    private performanceHistory: number[] = [];
    private adaptiveMultiplier: number = 1.0;
    
    constructor() {
        this.initializeDifficultyConfigs();
        this.safetyRules = this.createSafetyRules();
    }
    
    private initializeDifficultyConfigs(): void {
        // EASY - Casual, relaxed gameplay
        this.difficultyConfigs.set('easy', {
            name: 'Easy',
            baseBudget: 60,
            budgetPerRound: 15,
            budgetQuadratic: 0.5,
            baseMaxAlive: 5,
            maxAlivePerRound: 0.4,
            maxAliveHardCap: 15,
            baseSpawnCap: 10,
            spawnCapPerRound: 3,
            targetStressMin: 0.20,
            targetStressMax: 0.45,
            explorationConfig: {
                baseEpsilon: 0.4,
                minEpsilon: 0.1,
                epsilonDecay: 0.995,
                boredEpsilonBoost: 0.15,
                dangerEpsilonReduction: 0.2,
                useThompsonSampling: false,
                priorStrength: 1.0
            },
            rewardMultiplier: 1.2
        });
        
        // MEDIUM - Balanced challenge (default)
        this.difficultyConfigs.set('medium', {
            name: 'Medium',
            baseBudget: 80,
            budgetPerRound: 20,
            budgetQuadratic: 1.0,
            baseMaxAlive: 6,
            maxAlivePerRound: 0.5,
            maxAliveHardCap: 20,
            baseSpawnCap: 15,
            spawnCapPerRound: 5,
            targetStressMin: 0.40,
            targetStressMax: 0.65,
            explorationConfig: {
                baseEpsilon: 0.5,
                minEpsilon: 0.05,
                epsilonDecay: 0.99,
                boredEpsilonBoost: 0.2,
                dangerEpsilonReduction: 0.25,
                useThompsonSampling: true,
                priorStrength: 2.0
            },
            rewardMultiplier: 1.0
        });
        
        // HARD - Challenging for experienced players
        this.difficultyConfigs.set('hard', {
            name: 'Hard',
            baseBudget: 100,
            budgetPerRound: 25,
            budgetQuadratic: 1.5,
            baseMaxAlive: 8,
            maxAlivePerRound: 0.6,
            maxAliveHardCap: 25,
            baseSpawnCap: 20,
            spawnCapPerRound: 6,
            targetStressMin: 0.55,
            targetStressMax: 0.80,
            explorationConfig: {
                baseEpsilon: 0.6,
                minEpsilon: 0.03,
                epsilonDecay: 0.98,
                boredEpsilonBoost: 0.25,
                dangerEpsilonReduction: 0.15,
                useThompsonSampling: true,
                priorStrength: 3.0
            },
            rewardMultiplier: 0.8
        });
    }
    
    private createSafetyRules(): SafetyRules {
        return {
            absoluteMaxAlive: 50,
            minTimeBetweenBeats: 1500,        // 1.5 seconds minimum
            breatherHealthThreshold: 0.20,    // Force breather if < 20% HP
            breatherCooldown: 8000,           // 8 seconds between breathers
            emergencyBudgetBoost: 50,
            mercyModeThreshold: 0.15          // Reduce difficulty if < 15% HP
        };
    }
    
    // ========================================================================
    // ROUND BUDGET CALCULATION
    // ========================================================================
    
    /**
     * Calculate the budget for a new round
     * Formula: base + round * linear + round^2 * quadratic
     */
    public calculateRoundBudget(round: number): RoundBudget {
        const config = this.getConfig();
        
        // Apply adaptive multiplier based on player performance
        const adaptedMultiplier = this.adaptiveMultiplier;
        
        // Calculate total budget
        const rawBudget = config.baseBudget + 
                         (round * config.budgetPerRound) + 
                         (round * round * config.budgetQuadratic);
        const totalBudget = Math.floor(rawBudget * adaptedMultiplier);
        
        // Calculate max concurrent enemies
        const rawMaxAlive = config.baseMaxAlive + (round * config.maxAlivePerRound);
        const maxConcurrentEnemies = Math.min(
            Math.floor(rawMaxAlive),
            config.maxAliveHardCap,
            this.safetyRules.absoluteMaxAlive
        );
        
        // Calculate spawn cap
        const spawnCap = config.baseSpawnCap + (round * config.spawnCapPerRound);
        
        return {
            totalBudget,
            maxConcurrentEnemies,
            spawnCap: Math.floor(spawnCap),
            targetStressMin: config.targetStressMin,
            targetStressMax: config.targetStressMax,
            budgetSpent: 0,
            enemiesSpawned: 0
        };
    }
    
    /**
     * Start a new round and initialize its budget
     */
    public startRound(round: number): RoundBudget {
        this.currentRound = round;
        this.beatsThisRound = 0;
        this.currentBudget = this.calculateRoundBudget(round);
        
        console.log(`[RoundDirector] Starting Round ${round}`);
        console.log(`  Budget: ${this.currentBudget.totalBudget}`);
        console.log(`  Max Alive: ${this.currentBudget.maxConcurrentEnemies}`);
        console.log(`  Spawn Cap: ${this.currentBudget.spawnCap}`);
        console.log(`  Target Stress: ${this.currentBudget.targetStressMin.toFixed(2)} - ${this.currentBudget.targetStressMax.toFixed(2)}`);
        
        return this.currentBudget;
    }
    
    // ========================================================================
    // INTENSITY DETERMINATION
    // ========================================================================
    
    /**
     * Determine the recommended intensity based on current game state
     */
    public determineIntensity(context: GameContext): IntensityLevel {
        const config = this.getConfig();
        const stress = context.playerStressLevel;
        
        // Target stress band
        const targetMid = (config.targetStressMin + config.targetStressMax) / 2;
        
        // If player is in danger, reduce intensity
        if (context.playerHealthPercent < this.safetyRules.mercyModeThreshold) {
            return IntensityLevel.LOW;
        }
        
        // If below target stress, increase intensity
        if (stress < config.targetStressMin) {
            return IntensityLevel.HIGH;
        }
        
        // If above target stress, decrease intensity
        if (stress > config.targetStressMax) {
            return IntensityLevel.LOW;
        }
        
        // In the zone - use medium or vary slightly
        if (stress < targetMid) {
            return IntensityLevel.MEDIUM;
        }
        
        return IntensityLevel.MEDIUM;
    }
    
    // ========================================================================
    // BUDGET MANAGEMENT
    // ========================================================================
    
    /**
     * Check if we can afford to spawn with given cost
     */
    public canAfford(cost: number): boolean {
        if (!this.currentBudget) return false;
        return (this.currentBudget.totalBudget - this.currentBudget.budgetSpent) >= cost;
    }
    
    /**
     * Check if we've hit spawn cap
     */
    public hasReachedSpawnCap(): boolean {
        if (!this.currentBudget) return true;
        return this.currentBudget.enemiesSpawned >= this.currentBudget.spawnCap;
    }
    
    /**
     * Check if enough time has passed since last beat
     */
    public canStartNewBeat(): boolean {
        const now = Date.now();
        return (now - this.lastBeatTime) >= this.safetyRules.minTimeBetweenBeats;
    }
    
    /**
     * Check if current enemy count is below max
     */
    public canSpawnMore(currentEnemyCount: number): boolean {
        if (!this.currentBudget) return false;
        return currentEnemyCount < this.currentBudget.maxConcurrentEnemies;
    }
    
    /**
     * Spend budget after spawning
     */
    public spendBudget(cost: number, enemyCount: number): void {
        if (!this.currentBudget) return;
        
        this.currentBudget.budgetSpent += cost;
        this.currentBudget.enemiesSpawned += enemyCount;
        this.lastBeatTime = Date.now();
        this.beatsThisRound++;
    }
    
    /**
     * Get remaining budget
     */
    public getRemainingBudget(): number {
        if (!this.currentBudget) return 0;
        return this.currentBudget.totalBudget - this.currentBudget.budgetSpent;
    }
    
    // ========================================================================
    // SAFETY CHECKS
    // ========================================================================
    
    /**
     * Check if we should force a breather (low intensity pause)
     */
    public shouldForceBreather(context: GameContext): boolean {
        return context.playerHealthPercent < this.safetyRules.breatherHealthThreshold;
    }
    
    /**
     * Check if arena is empty and needs emergency spawns
     */
    public shouldEmergencySpawn(currentEnemyCount: number): boolean {
        // Arena is empty but round isn't over
        return currentEnemyCount === 0 && 
               this.currentBudget !== null && 
               this.currentBudget.budgetSpent < this.currentBudget.totalBudget * 0.9;
    }
    
    /**
     * Get emergency budget boost if needed
     */
    public getEmergencyBudget(): number {
        return this.safetyRules.emergencyBudgetBoost;
    }
    
    // ========================================================================
    // ADAPTIVE DIFFICULTY
    // ========================================================================
    
    /**
     * Update performance history for adaptive scaling
     */
    public updatePerformance(performance: number): void {
        this.performanceHistory.push(performance);
        if (this.performanceHistory.length > 10) {
            this.performanceHistory.shift();
        }
        
        // Recalculate adaptive multiplier
        if (this.performanceHistory.length >= 5) {
            const avg = this.performanceHistory.reduce((a, b) => a + b, 0) / 
                       this.performanceHistory.length;
            
            // If player is struggling (low performance), reduce multiplier
            if (avg < 0.3) {
                this.adaptiveMultiplier = Math.max(0.7, this.adaptiveMultiplier - 0.05);
            }
            // If player is dominating (high performance), increase multiplier
            else if (avg > 0.7) {
                this.adaptiveMultiplier = Math.min(1.5, this.adaptiveMultiplier + 0.05);
            }
            // Otherwise, drift back towards 1.0
            else {
                this.adaptiveMultiplier = this.adaptiveMultiplier * 0.95 + 1.0 * 0.05;
            }
        }
    }
    
    // ========================================================================
    // GETTERS & SETTERS
    // ========================================================================
    
    public setDifficulty(difficulty: string): void {
        if (this.difficultyConfigs.has(difficulty)) {
            this.currentDifficulty = difficulty;
        }
    }
    
    public getDifficulty(): string {
        return this.currentDifficulty;
    }
    
    public getConfig(): DifficultyConfig {
        return this.difficultyConfigs.get(this.currentDifficulty)!;
    }
    
    public getSafetyRules(): SafetyRules {
        return this.safetyRules;
    }
    
    public getCurrentRound(): number {
        return this.currentRound;
    }
    
    public getCurrentBudget(): RoundBudget | null {
        return this.currentBudget;
    }
    
    public getBeatsThisRound(): number {
        return this.beatsThisRound;
    }
    
    public getAdaptiveMultiplier(): number {
        return this.adaptiveMultiplier;
    }
    
    /**
     * Get status string for debugging
     */
    public getStatus(): string {
        if (!this.currentBudget) {
            return `[RoundDirector] No active round`;
        }
        
        return `[RoundDirector] Round ${this.currentRound} | ` +
               `Budget: ${this.getRemainingBudget()}/${this.currentBudget.totalBudget} | ` +
               `Spawned: ${this.currentBudget.enemiesSpawned}/${this.currentBudget.spawnCap} | ` +
               `Beats: ${this.beatsThisRound} | ` +
               `Adaptive: ${this.adaptiveMultiplier.toFixed(2)}x`;
    }
}

