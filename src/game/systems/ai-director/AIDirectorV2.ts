/**
 * AI Director V2 - 3-Layer Architecture
 * 
 * Orchestrates the complete AI Director system:
 * - Layer A: RoundDirector (deterministic pacing)
 * - Layer B: PackageGenerator (spawn packages with constraints)
 * - Layer C: MLSelector (bandit with novelty penalties)
 * 
 * This provides adaptive, varied, and fair enemy spawning.
 */

import { Player } from '../../Player';
import { EnemySystem } from '../EnemySystem';
import { EnemyType } from '../../types/EnemyTypes';

import { RoundDirector } from './RoundDirector';
import { PackageGenerator } from './PackageGenerator';
import { MLSelector } from './MLSelector';
import {
    GameContext,
    SpawnCommand,
    PackageCandidate,
    IntensityLevel,
    PackageTag,
    RoundBudget
} from './AIDirectorTypes';

export class AIDirectorV2 {
    // The 3 layers
    private roundDirector: RoundDirector;
    private packageGenerator: PackageGenerator;
    private mlSelector: MLSelector;
    
    // State
    private isActive: boolean = true;
    private trainingMode: boolean = true;
    private lastDecisionTime: number = 0;
    private decisionInterval: number = 1800;  // ms between decisions (faster)
    
    // Context tracking
    private previousContext: GameContext | null = null;
    private lastSelectedPackageId: string | null = null;
    
    // Playstyle tracking (rolling windows)
    private playerPositionHistory: Array<{ x: number; y: number; time: number }> = [];
    private damageHistory: Array<{ damage: number; isAoE: boolean; time: number }> = [];
    private healthHistory: Array<{ health: number; time: number }> = [];
    
    // Metrics
    private totalDecisions: number = 0;
    
    // Elite tracking
    private hasSpawnedEliteThisRound: boolean = false;
    
    // Track spawned packages for logging
    private spawnedPackagesThisRound: Array<{ name: string; intensity: string; cost: number; tags: string[] }> = [];
    
    constructor() {
        // Initialize layers
        this.roundDirector = new RoundDirector();
        this.packageGenerator = new PackageGenerator();
        
        // Get exploration config from round director
        const config = this.roundDirector.getConfig();
        this.mlSelector = new MLSelector(config.explorationConfig);
        
        // Initialize ML model
        this.initializeML();
    }
    
    private async initializeML(): Promise<void> {
        await this.mlSelector.initialize();
        
        // Try to load saved model
        const loaded = await this.mlSelector.loadModel('ai-director-v2');
        if (loaded) {
            console.log('[AIDirectorV2] Loaded saved model');
        }
    }
    
    // ========================================================================
    // MAIN UPDATE LOOP
    // ========================================================================
    
    /**
     * Main update called every frame from the game
     */
    public async update(player: Player, enemySystem: EnemySystem): Promise<void> {
        if (!this.isActive) return;
        
        const now = Date.now();
        
        // Check if enough time has passed for next decision
        if (now - this.lastDecisionTime < this.decisionInterval) {
            return;
        }
        
        // Build current game context
        const context = this.buildGameContext(player, enemySystem);
        
        // Calculate reward for previous decision
        if (this.previousContext && this.lastSelectedPackageId) {
            this.recordDecisionOutcome(this.previousContext, context);
        }
        
        // Get current budget and constraints from Round Director
        const budget = this.roundDirector.getCurrentBudget();
        if (!budget) {
            console.log('[AIDirectorV2] No budget - round not started?');
            this.previousContext = context;
            return;  // No active round
        }
        
        // Check safety rules
        if (this.roundDirector.shouldForceBreather(context)) {
            await this.executeBreatherBeat(enemySystem, context);
            this.previousContext = context;
            this.lastDecisionTime = now;
            return;
        }
        
        // Check if we can spawn more
        const currentEnemyCount = enemySystem.getEnemyCount();
        if (!this.roundDirector.canSpawnMore(currentEnemyCount)) {
            this.previousContext = context;
            return;  // At enemy cap
        }
        
        if (!this.roundDirector.canStartNewBeat()) {
            this.previousContext = context;
            return;  // Too soon since last beat
        }
        
        // Check if budget is exhausted BEFORE trying to spawn
        if (this.isRoundBudgetExhausted()) {
            this.previousContext = context;
            return;  // Budget exhausted, no more spawns this round
        }
        
        // Check for emergency spawn (log only once per round)
        if (this.roundDirector.shouldEmergencySpawn(currentEnemyCount)) {
            // Emergency spawn - arena is empty but budget remains
            // Just continue to spawn, no need to log every time
        }
        
        // Generate valid candidates from Package Generator
        // Use remaining budget, but not if already negative
        const remainingBudget = Math.max(0, this.roundDirector.getRemainingBudget());
        const candidates = this.packageGenerator.generateCandidates(
            context,
            this.roundDirector.getCurrentRound(),
            remainingBudget,
            currentEnemyCount,
            budget.maxConcurrentEnemies
        );
        
        if (candidates.length === 0) {
            console.log('[AIDirectorV2] No valid candidates! Round:', this.roundDirector.getCurrentRound(), 
                        'Budget:', this.roundDirector.getRemainingBudget());
            this.previousContext = context;
            return;  // No valid packages
        }
        
        // Let ML Selector choose the best package - but don't require ML to be initialized
        let selected: PackageCandidate | null = null;
        
        if (this.mlSelector.isInitialized()) {
            selected = await this.mlSelector.selectPackage(candidates, context);
        } else {
            // Fallback: pick first valid candidate if ML not ready
            console.log('[AIDirectorV2] ML not ready, using fallback selection');
            selected = candidates[0];
        }
        
        if (!selected) {
            console.log('[AIDirectorV2] No package selected');
            this.previousContext = context;
            return;
        }
        
        // HARD BUDGET CHECK - prevent overspending
        const currentBudget = this.roundDirector.getCurrentBudget();
        if (currentBudget && currentBudget.budgetSpent >= currentBudget.totalBudget) {
            this.previousContext = context;
            return;  // Stop - budget exceeded
        }
        
        // Execute the selected package
        await this.executePackage(selected, context, enemySystem);
        
        // Update state
        this.lastSelectedPackageId = selected.package.id;
        this.previousContext = context;
        this.lastDecisionTime = Date.now();
        this.totalDecisions++;
        
        // Train if in training mode
        if (this.trainingMode && this.totalDecisions % 5 === 0) {
            await this.mlSelector.train();
        }
        
        // Auto-save periodically
        if (this.totalDecisions % 50 === 0) {
            await this.mlSelector.saveModel('ai-director-v2');
        }
    }
    
    // ========================================================================
    // CONTEXT BUILDING
    // ========================================================================
    
    /**
     * Build comprehensive game context for ML
     */
    private buildGameContext(player: Player, enemySystem: EnemySystem): GameContext {
        const now = Date.now();
        
        // Update tracking histories
        this.updatePositionHistory(player, now);
        this.updateDamageHistory(player, now);
        this.updateHealthHistory(player, now);
        
        // Calculate playstyle metrics
        const kitingScore = this.calculateKitingScore();
        const campingScore = this.calculateCampingScore();
        const aoeDamageRatio = this.calculateAoEDamageRatio();
        const singleTargetFocusScore = this.calculateSingleTargetFocus();
        const defensivePlayScore = this.calculateDefensivePlayScore();
        
        // Get enemy composition
        const enemyComposition = new Map<EnemyType, number>();
        for (const type of Object.values(EnemyType)) {
            enemyComposition.set(type as EnemyType, enemySystem.getEnemyCountByType(type as EnemyType));
        }
        
        // Get recent package history from generator
        const state = this.packageGenerator.getState();
        
        // Calculate time since each tag was used
        const timeSinceTagUsed = new Map<PackageTag, number>();
        state.tagUsageHistory.forEach((_count, tag) => {
            const lastNTags = state.lastNTags;
            const lastIndex = lastNTags.lastIndexOf(tag);
            timeSinceTagUsed.set(tag, lastIndex >= 0 ? lastNTags.length - lastIndex : 999);
        });
        
        // Stress calculation
        const healthPercent = player.getHealthPercentage();
        const enemyCount = enemySystem.getEnemyCount();
        const stress = Math.min(
            (1 - healthPercent) * 0.5 + 
            (enemyCount / 20) * 0.3 + 
            (player.getDamageTakenRecently() / 50) * 0.2,
            1
        );
        
        // Engagement
        const dps = player.getDPSOverLastTenSeconds();
        const moveDist = player.getMovementDistanceLastTenSeconds();
        const engagement = Math.min((dps / 50) * 0.5 + (moveDist / 500) * 0.5, 1);
        
        // Round progress
        const budget = this.roundDirector.getCurrentBudget();
        const roundProgress = budget 
            ? budget.budgetSpent / Math.max(1, budget.totalBudget)
            : 0;
        
        return {
            playerHealthPercent: healthPercent,
            playerArchetype: player.getArchetypeVector(),
            playerLevel: player.getLevel(),
            
            kitingScore,
            campingScore,
            aoeDamageRatio,
            singleTargetFocusScore,
            defensivePlayScore,
            
            totalEnemyCount: enemyCount,
            enemyComposition,
            
            currentRound: this.roundDirector.getCurrentRound(),
            roundProgress,
            
            playerStressLevel: stress,
            recentDamageTaken: Math.min(player.getDamageTakenRecently() / 100, 1),
            recentDamageDealt: Math.min(dps / 100, 1),
            engagementScore: engagement,
            
            recentPackageTags: state.lastNTags.slice(-10),
            recentPackageIds: state.lastNPackages,
            timeSinceTagUsed
        };
    }
    
    // ========================================================================
    // PLAYSTYLE TRACKING
    // ========================================================================
    
    private updatePositionHistory(player: Player, now: number): void {
        const pos = player.getPosition();
        this.playerPositionHistory.push({ x: pos.x, y: pos.y, time: now });
        
        // Keep last 30 seconds
        const cutoff = now - 30000;
        this.playerPositionHistory = this.playerPositionHistory.filter(p => p.time > cutoff);
    }
    
    private updateDamageHistory(player: Player, now: number): void {
        // This would need hooks into the damage system
        // For now, use DPS as a proxy
        const dps = player.getDPSOverLastTenSeconds();
        if (dps > 0) {
            this.damageHistory.push({ damage: dps, isAoE: false, time: now });
        }
        
        const cutoff = now - 30000;
        this.damageHistory = this.damageHistory.filter(d => d.time > cutoff);
    }
    
    private updateHealthHistory(player: Player, now: number): void {
        this.healthHistory.push({ health: player.getHealthPercentage(), time: now });
        
        const cutoff = now - 30000;
        this.healthHistory = this.healthHistory.filter(h => h.time > cutoff);
    }
    
    /**
     * Calculate kiting score: how much player moves while enemies are alive
     */
    private calculateKitingScore(): number {
        if (this.playerPositionHistory.length < 5) return 0.5;
        
        let totalDistance = 0;
        for (let i = 1; i < this.playerPositionHistory.length; i++) {
            const prev = this.playerPositionHistory[i - 1];
            const curr = this.playerPositionHistory[i];
            totalDistance += Math.sqrt(
                Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
            );
        }
        
        // Normalize: high movement = high kiting score
        const avgSpeed = totalDistance / (this.playerPositionHistory.length - 1);
        return Math.min(avgSpeed / 50, 1);  // 50 pixels/tick = max kiting
    }
    
    /**
     * Calculate camping score: how stationary the player is
     */
    private calculateCampingScore(): number {
        if (this.playerPositionHistory.length < 5) return 0.5;
        
        // Calculate variance of positions
        const avgX = this.playerPositionHistory.reduce((s, p) => s + p.x, 0) / this.playerPositionHistory.length;
        const avgY = this.playerPositionHistory.reduce((s, p) => s + p.y, 0) / this.playerPositionHistory.length;
        
        let variance = 0;
        for (const p of this.playerPositionHistory) {
            variance += Math.pow(p.x - avgX, 2) + Math.pow(p.y - avgY, 2);
        }
        variance /= this.playerPositionHistory.length;
        
        // Low variance = high camping score
        const spread = Math.sqrt(variance);
        return Math.max(0, 1 - spread / 200);  // 200 pixel spread = 0 camping
    }
    
    /**
     * Calculate AoE damage ratio
     */
    private calculateAoEDamageRatio(): number {
        // Would need actual damage type tracking
        // For now, return a default based on archetype
        return 0.5;  // Placeholder
    }
    
    /**
     * Calculate single target focus score
     */
    private calculateSingleTargetFocus(): number {
        // Would need target tracking
        return 0.5;  // Placeholder
    }
    
    /**
     * Calculate defensive play score
     */
    private calculateDefensivePlayScore(): number {
        if (this.healthHistory.length < 5) return 0.5;
        
        // High health maintained = defensive play
        const avgHealth = this.healthHistory.reduce((s, h) => s + h.health, 0) / this.healthHistory.length;
        return avgHealth;
    }
    
    // ========================================================================
    // PACKAGE EXECUTION
    // ========================================================================
    
    /**
     * Execute a selected package
     */
    private async executePackage(
        candidate: PackageCandidate,
        context: GameContext,
        enemySystem: EnemySystem
    ): Promise<void> {
        // PRE-CHECK: Don't execute if this would exceed budget significantly
        const currentBudget = this.roundDirector.getCurrentBudget();
        if (currentBudget) {
            const projectedSpent = currentBudget.budgetSpent + candidate.cost;
            if (projectedSpent > currentBudget.totalBudget * 1.15) {  // Allow 15% overage max
                return;
            }
        }
        
        const pkg = candidate.package;
        const intensity = candidate.intensity;
        const round = this.roundDirector.getCurrentRound();
        
        // Build the wave
        const commands = pkg.buildWave(context, round, intensity);
        
        // Execute each spawn command
        let totalSpawned = 0;
        for (const cmd of commands) {
            if (cmd.delay && cmd.delay > 0) {
                // Schedule delayed spawn
                setTimeout(() => {
                    this.executeSpawnCommand(cmd, enemySystem);
                }, cmd.delay);
            } else {
                this.executeSpawnCommand(cmd, enemySystem);
            }
            totalSpawned += cmd.count;
        }
        
        // Record in package generator
        this.packageGenerator.recordPackageSelection(pkg.id, intensity);
        
        // Spend budget
        this.roundDirector.spendBudget(candidate.cost, totalSpawned);
        
        // Track spawned package for logging
        this.spawnedPackagesThisRound.push({
            name: pkg.name,
            intensity: IntensityLevel[intensity],
            cost: candidate.cost,
            tags: pkg.tags as string[]
        });
    }
    
    /**
     * Execute a single spawn command
     */
    private executeSpawnCommand(cmd: SpawnCommand, enemySystem: EnemySystem): void {
        const round = this.roundDirector.getCurrentRound();
        
        // Calculate elite chance based on round
        // - No elites before round 5
        // - Guaranteed elite on round 5 (first spawn of round)
        // - Base chance of 5% starting round 5, increases by 2% per round after
        // - Package-specific elite chance is added on top
        let eliteChance = 0;
        
        if (round >= 5) {
            // Check if we need to guarantee an elite for round 5
            if (round === 5 && !this.hasSpawnedEliteThisRound) {
                // Force 100% elite chance for first enemy of round 5
                eliteChance = 1.0;
                this.hasSpawnedEliteThisRound = true;
                console.log('[AIDirectorV2] 🔴 Round 5 - Guaranteed Elite Spawn!');
            } else {
                const baseEliteChance = 0.05 + (round - 5) * 0.02;  // 5% + 2% per round
                const packageEliteChance = cmd.eliteChance || 0;
                eliteChance = Math.min(baseEliteChance + packageEliteChance, 0.5);  // Cap at 50%
            }
        }
        
        enemySystem.spawnWave(cmd.enemyType, cmd.count, cmd.spawnPattern, undefined, undefined, eliteChance);
    }
    
    /**
     * Execute a breather beat (low intensity)
     */
    private async executeBreatherBeat(enemySystem: EnemySystem, context: GameContext): Promise<void> {
        const breatherPkg = this.packageGenerator.getBreatherPackage();
        const round = this.roundDirector.getCurrentRound();
        const commands = breatherPkg.buildWave(context, round, IntensityLevel.LOW);
        
        for (const cmd of commands) {
            this.executeSpawnCommand(cmd, enemySystem);
        }
        
        const cost = breatherPkg.getCost(round, IntensityLevel.LOW);
        const totalSpawned = commands.reduce((s, c) => s + c.count, 0);
        
        this.packageGenerator.recordPackageSelection(breatherPkg.id, IntensityLevel.LOW);
        this.roundDirector.spendBudget(cost, totalSpawned);
        
        // Track spawned package
        this.spawnedPackagesThisRound.push({
            name: breatherPkg.name + ' (Breather)',
            intensity: 'LOW',
            cost: cost,
            tags: breatherPkg.tags as string[]
        });
    }
    
    // ========================================================================
    // REWARD & LEARNING
    // ========================================================================
    
    /**
     * Record the outcome of the previous decision
     */
    private recordDecisionOutcome(prevContext: GameContext, currContext: GameContext): void {
        const budget = this.roundDirector.getCurrentBudget();
        if (!budget) return;
        
        const boredomMetrics = this.packageGenerator.getBoredomMetrics();
        
        const rewardComponents = this.mlSelector.calculateReward(
            prevContext,
            currContext,
            budget.targetStressMin,
            budget.targetStressMax,
            boredomMetrics
        );
        
        // Record in ML selector
        if (this.lastSelectedPackageId) {
            this.mlSelector.recordOutcome(
                prevContext,
                this.lastSelectedPackageId,
                rewardComponents
            );
        }
        
        // Update round director's performance tracking
        const performance = this.calculatePerformance(currContext);
        this.roundDirector.updatePerformance(performance);
    }
    
    /**
     * Calculate overall performance metric
     */
    private calculatePerformance(context: GameContext): number {
        return (context.playerHealthPercent * 0.4) + 
               (context.engagementScore * 0.3) +
               ((1 - Math.abs(context.playerStressLevel - 0.6)) * 0.3);
    }
    
    // ========================================================================
    // ROUND MANAGEMENT
    // ========================================================================
    
    /**
     * Start a new round
     */
    public startRound(round: number): RoundBudget {
        // Log previous round's spawned packages (if any)
        if (round > 1 && this.spawnedPackagesThisRound.length > 0) {
            this.logPreviousRoundSpawns(round - 1);
        }
        
        // Reset tracking for new round
        this.spawnedPackagesThisRound = [];
        
        const budget = this.roundDirector.startRound(round);
        this.packageGenerator.startNewRound(round);
        
        // Adjust decision interval based on round (gets faster over time)
        this.decisionInterval = 1800 - (round * 80);
        this.decisionInterval = Math.max(800, this.decisionInterval);  // Min 0.8s
        
        // Reset decision time so first spawn happens immediately
        this.lastDecisionTime = 0;
        
        // Reset elite tracking for new round
        this.hasSpawnedEliteThisRound = false;
        
        // Log detailed AI analysis
        this.logRoundAnalysis(round, budget);
        
        return budget;
    }
    
    /**
     * Log packages spawned in the previous round
     */
    private logPreviousRoundSpawns(previousRound: number): void {
        const totalCost = this.spawnedPackagesThisRound.reduce((sum, pkg) => sum + pkg.cost, 0);
        const totalWaves = this.spawnedPackagesThisRound.length;
        
        // Get player playstyle
        const playstyle = this.analyzePlayerPlaystyle();
        
        // Group by package name for cleaner output, keeping tags
        const packageCounts = new Map<string, { count: number; totalCost: number; tags: string[] }>();
        this.spawnedPackagesThisRound.forEach(pkg => {
            const key = pkg.name;
            const existing = packageCounts.get(key) || { count: 0, totalCost: 0, tags: pkg.tags };
            packageCounts.set(key, { 
                count: existing.count + 1, 
                totalCost: existing.totalCost + pkg.cost,
                tags: pkg.tags 
            });
        });
        
        console.log('\n' + '─'.repeat(60));
        console.log(`📋 ROUND ${previousRound} COMPLETED`);
        console.log(`   💰 Budget Spent: ${totalCost} | Spawn Waves: ${totalWaves}`);
        console.log(`   🎯 Player: ${playstyle.category} | Kite: ${(playstyle.kitingScore * 100).toFixed(0)}% | Camp: ${(playstyle.campingScore * 100).toFixed(0)}% | AoE: ${(playstyle.aoeRatio * 100).toFixed(0)}% | Def: ${(playstyle.defensiveScore * 100).toFixed(0)}%`);
        console.log(`   📦 Packages Used:`);
        packageCounts.forEach((value, name) => {
            const counterLabel = this.getCounterLabel(value.tags);
            console.log(`      • ${name} x${value.count} (${counterLabel})`);
        });
        console.log('─'.repeat(60));
    }
    
    /**
     * Get human-readable counter label from package tags
     */
    private getCounterLabel(tags: string[]): string {
        const counterMap: { [key: string]: string } = {
            'antiKite': 'vs Kiters',
            'antiCamp': 'vs Campers',
            'antiAoE': 'vs AoE',
            'antiSingleTarget': 'vs Single-Target',
            'antiTank': 'vs Tanks',
            'swarm': 'Swarm',
            'elite': 'Elite',
            'poke': 'Poke/Harass',
            'flanker': 'Flanking',
            'zoner': 'Zone Control',
            'mixed': 'Mixed'
        };
        
        // Find the most relevant counter tag
        for (const tag of tags) {
            if (tag.startsWith('anti') && counterMap[tag]) {
                return counterMap[tag];
            }
        }
        
        // If no anti- tag, use first available tag
        for (const tag of tags) {
            if (counterMap[tag]) {
                return counterMap[tag];
            }
        }
        
        return tags.join(', ');
    }
    
    /**
     * Log detailed AI analysis for the round
     */
    private logRoundAnalysis(round: number, budget: RoundBudget): void {
        // Analyze player playstyle from history
        const playstyle = this.analyzePlayerPlaystyle();
        
        console.log('\n' + '='.repeat(60));
        console.log(`🎮 ROUND ${round} | Budget: ${budget.totalBudget} | Max: ${budget.maxConcurrentEnemies} | Cap: ${budget.spawnCap}`);
        console.log(`🎯 Playstyle: ${playstyle.category} → ${playstyle.counterStrategy}`);
        console.log('='.repeat(60));
    }
    
    /**
     * Analyze player's playstyle from tracked history
     */
    private analyzePlayerPlaystyle(): {
        category: string;
        counterStrategy: string;
        kitingScore: number;
        campingScore: number;
        aoeRatio: number;
        defensiveScore: number;
    } {
        const kitingScore = this.calculateKitingScore();
        const campingScore = this.calculateCampingScore();
        const aoeRatio = this.calculateAoEDamageRatio();
        const defensiveScore = this.calculateDefensivePlayScore();
        
        // Determine dominant playstyle
        let category = 'Balanced';
        let counterStrategy = 'Mixed threats to test adaptability';
        
        if (kitingScore > 0.6) {
            category = 'Kiter';
            counterStrategy = 'Fast flankers + ranged to cut off escape routes';
        } else if (campingScore > 0.6) {
            category = 'Camper';
            counterStrategy = 'Multi-angle rushers to force movement';
        } else if (aoeRatio > 0.7) {
            category = 'AoE Specialist';
            counterStrategy = 'Spread formations with elite units';
        } else if (defensiveScore > 0.7) {
            category = 'Tank/Defensive';
            counterStrategy = 'Armor shredders + sustained DPS';
        } else if (kitingScore < 0.3 && campingScore < 0.3) {
            category = 'Aggressive';
            counterStrategy = 'Ranged poke + zone control';
        }
        
        return { category, counterStrategy, kitingScore, campingScore, aoeRatio, defensiveScore };
    }
    
    /**
     * Check if round budget is exhausted
     */
    public isRoundBudgetExhausted(): boolean {
        const budget = this.roundDirector.getCurrentBudget();
        if (!budget) return true;
        
        return budget.budgetSpent >= budget.totalBudget || 
               budget.enemiesSpawned >= budget.spawnCap;
    }
    
    // ========================================================================
    // PUBLIC API
    // ========================================================================
    
    public setActive(active: boolean): void {
        this.isActive = active;
    }
    
    public setTrainingMode(training: boolean): void {
        this.trainingMode = training;
    }
    
    public isTraining(): boolean {
        return this.trainingMode;
    }
    
    public setDifficulty(difficulty: string): void {
        this.roundDirector.setDifficulty(difficulty);
        // Note: ML selector exploration config would be updated on next round start
    }
    
    public getDifficulty(): string {
        return this.roundDirector.getDifficulty();
    }
    
    public getCurrentRound(): number {
        return this.roundDirector.getCurrentRound();
    }
    
    public getCurrentBudget(): number {
        return this.roundDirector.getRemainingBudget();
    }
    
    public getMaxBudget(): number {
        const budget = this.roundDirector.getCurrentBudget();
        return budget ? budget.totalBudget : 0;
    }
    
    // ========================================================================
    // STATUS & DEBUGGING
    // ========================================================================
    
    public getStatus(): string {
        const mlMetrics = this.mlSelector.getMetrics();
        return `[AIDirectorV2] Decisions: ${this.totalDecisions} | ` +
               `ε: ${mlMetrics.explorationRate.toFixed(3)} | ` +
               `Avg Reward: ${mlMetrics.averageReward.toFixed(2)} | ` +
               this.roundDirector.getStatus();
    }
    
    public getBudgetStatus(): string {
        const budget = this.roundDirector.getCurrentBudget();
        if (!budget) return 'No active round';
        return `Budget: ${this.roundDirector.getRemainingBudget()}/${budget.totalBudget}`;
    }
    
    public getTacticalStatus(): string {
        const state = this.packageGenerator.getState();
        const lastPkg = state.lastPackageId || 'none';
        const streak = state.samePackageStreak;
        return `Last: ${lastPkg} | Streak: ${streak} | Beats: ${state.totalBeatsThisRound}`;
    }
    
    public getAdaptiveStrategy(): string {
        return `Adaptive: ${this.roundDirector.getAdaptiveMultiplier().toFixed(2)}x`;
    }
    
    public getTrainingStatus(): string {
        const metrics = this.mlSelector.getMetrics();
        return `Train Steps: ${metrics.trainSteps} | Loss: ${metrics.avgLoss.toFixed(4)}`;
    }
    
    public getTrainingMetrics() {
        return this.mlSelector.getMetrics();
    }
    
    // ========================================================================
    // PERSISTENCE
    // ========================================================================
    
    public async saveModel(name: string): Promise<void> {
        await this.mlSelector.saveModel(name);
    }
    
    public async loadModel(name: string): Promise<boolean> {
        return await this.mlSelector.loadModel(name);
    }
}

