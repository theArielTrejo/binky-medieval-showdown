/**
 * LAYER C: ML Selector (Contextual Bandit)
 * 
 * The bandit chooses among candidate packages to maximize "flow."
 * ML is not inventing spawns; it is picking the next beat from a curated set.
 * 
 * Features:
 * - Neural network predicts reward for each package given context
 * - Thompson Sampling for principled exploration
 * - Novelty bonus + repetition penalty for variety
 * - Boredom-aware exploration rate adjustment
 */

import * as tf from '@tensorflow/tfjs';
import {
    PackageCandidate,
    GameContext,
    BanditMetrics,
    ExplorationConfig,
    RewardComponents,
    PackageTag
} from './AIDirectorTypes';

export class MLSelector {
    private model: tf.LayersModel | null = null;
    private explorationConfig: ExplorationConfig;
    private metrics: BanditMetrics;
    
    // Replay buffer for training
    private replayBuffer: Array<{
        contextFeatures: number[];
        packageId: string;
        reward: number;
    }> = [];
    private maxBufferSize: number = 2000;
    private batchSize: number = 32;
    
    // Uncertainty estimates for Thompson Sampling
    private packageUncertainty: Map<string, { mean: number; variance: number }> = new Map();
    private priorMean: number = 0;
    private priorVariance: number = 1.0;
    
    // Recent history for metrics
    private recentRewards: number[] = [];
    private recentLosses: number[] = [];
    
    constructor(explorationConfig: ExplorationConfig) {
        this.explorationConfig = explorationConfig;
        this.metrics = this.createInitialMetrics();
    }
    
    private createInitialMetrics(): BanditMetrics {
        return {
            explorationRate: this.explorationConfig.baseEpsilon,
            averageReward: 0,
            recentRewards: [],
            uncertaintyEstimates: new Map(),
            totalDecisions: 0,
            trainSteps: 0,
            avgLoss: 0
        };
    }
    
    // ========================================================================
    // MODEL INITIALIZATION
    // ========================================================================
    
    /**
     * Initialize the neural network model
     */
    public async initialize(): Promise<void> {
        // Input: 20 context features
        // Output: 1 predicted reward value
        // We'll use this to predict reward for (context, package) pairs
        
        const model = tf.sequential();
        
        // Input layer - context features + package embedding
        model.add(tf.layers.dense({
            inputShape: [24],  // 20 context + 4 package features
            units: 64,
            activation: 'relu',
            kernelInitializer: 'heNormal',
            kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
        }));
        
        model.add(tf.layers.dropout({ rate: 0.1 }));
        
        model.add(tf.layers.dense({
            units: 32,
            activation: 'relu',
            kernelInitializer: 'heNormal'
        }));
        
        model.add(tf.layers.dropout({ rate: 0.1 }));
        
        // Output: predicted reward
        model.add(tf.layers.dense({
            units: 1,
            activation: 'linear',
            kernelInitializer: 'zeros'
        }));
        
        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'meanSquaredError'
        });
        
        this.model = model;
        
        console.log('[MLSelector] Model initialized');
    }
    
    // ========================================================================
    // SELECTION LOGIC
    // ========================================================================
    
    /**
     * Select the best package from candidates
     */
    public async selectPackage(
        candidates: PackageCandidate[],
        context: GameContext
    ): Promise<PackageCandidate | null> {
        if (candidates.length === 0) return null;
        
        this.metrics.totalDecisions++;
        
        // Score all candidates
        const scoredCandidates = await this.scoreAllCandidates(candidates, context);
        
        // Apply exploration strategy
        const selected = this.applyExplorationStrategy(scoredCandidates, context);
        
        // Update metrics
        this.updateExplorationRate(context);
        
        return selected;
    }
    
    /**
     * Score all candidates using ML + novelty/repetition
     */
    private async scoreAllCandidates(
        candidates: PackageCandidate[],
        context: GameContext
    ): Promise<PackageCandidate[]> {
        const contextFeatures = this.contextToFeatures(context);
        
        for (const candidate of candidates) {
            // Get ML prediction
            const mlScore = await this.predictReward(contextFeatures, candidate);
            candidate.mlScore = mlScore;
            
            // Calculate final score
            candidate.finalScore = this.calculateFinalScore(candidate);
        }
        
        // Sort by final score (highest first)
        candidates.sort((a, b) => b.finalScore - a.finalScore);
        
        return candidates;
    }
    
    /**
     * Predict reward for a specific candidate
     */
    private async predictReward(
        contextFeatures: number[],
        candidate: PackageCandidate
    ): Promise<number> {
        if (!this.model) return 0;
        
        const packageFeatures = this.packageToFeatures(candidate);
        const inputFeatures = [...contextFeatures, ...packageFeatures];
        
        const inputTensor = tf.tensor2d([inputFeatures]);
        const prediction = this.model.predict(inputTensor) as tf.Tensor;
        const value = (await prediction.data())[0];
        
        inputTensor.dispose();
        prediction.dispose();
        
        return value;
    }
    
    /**
     * Calculate final score combining ML + novelty - repetition
     */
    private calculateFinalScore(candidate: PackageCandidate): number {
        const mlWeight = 1.0;
        const noveltyWeight = 0.3;
        const repetitionWeight = 0.4;
        
        return (candidate.mlScore * mlWeight) +
               (candidate.noveltyBonus * noveltyWeight) -
               (candidate.repetitionPenalty * repetitionWeight);
    }
    
    // ========================================================================
    // EXPLORATION STRATEGIES
    // ========================================================================
    
    /**
     * Apply exploration strategy to select final candidate
     */
    private applyExplorationStrategy(
        candidates: PackageCandidate[],
        context: GameContext
    ): PackageCandidate {
        if (this.explorationConfig.useThompsonSampling) {
            return this.thompsonSampling(candidates);
        } else {
            return this.epsilonGreedy(candidates, context);
        }
    }
    
    /**
     * Thompson Sampling: Sample from posterior distributions
     */
    private thompsonSampling(candidates: PackageCandidate[]): PackageCandidate {
        let bestCandidate = candidates[0];
        let bestSample = -Infinity;
        
        for (const candidate of candidates) {
            const packageId = candidate.package.id;
            
            // Get or initialize uncertainty estimate
            let estimate = this.packageUncertainty.get(packageId);
            if (!estimate) {
                estimate = { mean: this.priorMean, variance: this.priorVariance };
                this.packageUncertainty.set(packageId, estimate);
            }
            
            // Sample from Gaussian posterior
            // Use Box-Muller transform for normal sampling
            const u1 = Math.random();
            const u2 = Math.random();
            const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            
            // Sample = mean + sqrt(variance) * z
            const sample = estimate.mean + Math.sqrt(estimate.variance) * z;
            
            // Add the pre-computed final score as a "boost"
            const adjustedSample = sample + candidate.noveltyBonus - candidate.repetitionPenalty;
            
            if (adjustedSample > bestSample) {
                bestSample = adjustedSample;
                bestCandidate = candidate;
            }
        }
        
        return bestCandidate;
    }
    
    /**
     * Epsilon-Greedy with context-aware epsilon
     */
    private epsilonGreedy(
        candidates: PackageCandidate[],
        context: GameContext
    ): PackageCandidate {
        const epsilon = this.getContextAwareEpsilon(context);
        
        if (Math.random() < epsilon) {
            // Explore: random selection (weighted by score)
            const totalScore = candidates.reduce((sum, c) => sum + Math.max(0.1, c.finalScore + 1), 0);
            let r = Math.random() * totalScore;
            
            for (const candidate of candidates) {
                r -= Math.max(0.1, candidate.finalScore + 1);
                if (r <= 0) return candidate;
            }
            
            // Fallback to random
            return candidates[Math.floor(Math.random() * candidates.length)];
        } else {
            // Exploit: best candidate
            return candidates[0];
        }
    }
    
    /**
     * Get context-aware exploration rate
     */
    private getContextAwareEpsilon(context: GameContext): number {
        let epsilon = this.metrics.explorationRate;
        
        // Increase exploration when player seems bored (low engagement)
        if (context.engagementScore < 0.3) {
            epsilon += this.explorationConfig.boredEpsilonBoost;
        }
        
        // Decrease exploration when player is in danger
        if (context.playerHealthPercent < 0.25) {
            epsilon -= this.explorationConfig.dangerEpsilonReduction;
        }
        
        // Clamp to valid range
        return Math.max(0.01, Math.min(0.8, epsilon));
    }
    
    /**
     * Update exploration rate (decay over time)
     */
    private updateExplorationRate(_context: GameContext): void {
        // Base decay
        this.metrics.explorationRate = Math.max(
            this.explorationConfig.minEpsilon,
            this.metrics.explorationRate * this.explorationConfig.epsilonDecay
        );
    }
    
    // ========================================================================
    // TRAINING
    // ========================================================================
    
    /**
     * Record a decision outcome for learning
     */
    public recordOutcome(
        context: GameContext,
        packageId: string,
        rewardComponents: RewardComponents
    ): void {
        const contextFeatures = this.contextToFeatures(context);
        
        // Store in replay buffer
        this.replayBuffer.push({
            contextFeatures,
            packageId,
            reward: rewardComponents.totalReward
        });
        
        // Trim buffer if too large
        while (this.replayBuffer.length > this.maxBufferSize) {
            this.replayBuffer.shift();
        }
        
        // Update uncertainty estimates for Thompson Sampling
        this.updateUncertaintyEstimate(packageId, rewardComponents.totalReward);
        
        // Update metrics
        this.recentRewards.push(rewardComponents.totalReward);
        if (this.recentRewards.length > 100) this.recentRewards.shift();
        this.metrics.averageReward = this.recentRewards.reduce((a, b) => a + b, 0) / this.recentRewards.length;
        this.metrics.recentRewards = [...this.recentRewards.slice(-20)];
    }
    
    /**
     * Update Bayesian uncertainty estimate for a package
     */
    private updateUncertaintyEstimate(packageId: string, reward: number): void {
        let estimate = this.packageUncertainty.get(packageId);
        if (!estimate) {
            estimate = { mean: this.priorMean, variance: this.priorVariance };
        }
        
        // Bayesian update with fixed observation variance
        const observationVariance = 0.5;
        const priorPrecision = 1 / estimate.variance;
        const obsPrecision = 1 / observationVariance;
        
        const newPrecision = priorPrecision + obsPrecision;
        const newMean = (priorPrecision * estimate.mean + obsPrecision * reward) / newPrecision;
        const newVariance = 1 / newPrecision;
        
        // Limit variance from getting too small (maintain exploration)
        const minVariance = 0.1 / this.explorationConfig.priorStrength;
        
        this.packageUncertainty.set(packageId, {
            mean: newMean,
            variance: Math.max(minVariance, newVariance)
        });
    }
    
    /**
     * Train the model on recent experiences
     */
    public async train(): Promise<number> {
        if (!this.model || this.replayBuffer.length < this.batchSize) {
            return 0;
        }
        
        try {
            // Sample random batch
            const batch = this.sampleBatch(this.batchSize);
            
            // Prepare tensors
            const inputs: number[][] = [];
            const targets: number[] = [];
            
            for (const exp of batch) {
                // We need to reconstruct package features from packageId
                // For simplicity, use a hash-based embedding
                const packageFeatures = this.packageIdToFeatures(exp.packageId);
                inputs.push([...exp.contextFeatures, ...packageFeatures]);
                targets.push(exp.reward);
            }
            
            const inputTensor = tf.tensor2d(inputs);
            const targetTensor = tf.tensor2d(targets, [targets.length, 1]);
            
            // Train
            const history = await this.model.fit(inputTensor, targetTensor, {
                epochs: 1,
                verbose: 0
            });
            
            // Cleanup
            inputTensor.dispose();
            targetTensor.dispose();
            
            // Update metrics
            const loss = Array.isArray(history.history.loss) 
                ? history.history.loss[0] 
                : history.history.loss;
            
            this.recentLosses.push(loss as number);
            if (this.recentLosses.length > 50) this.recentLosses.shift();
            this.metrics.avgLoss = this.recentLosses.reduce((a, b) => a + b, 0) / this.recentLosses.length;
            this.metrics.trainSteps++;
            
            return loss as number;
        } catch (error) {
            console.warn('[MLSelector] Training error (non-fatal):', error);
            return 0;
        }
    }
    
    /**
     * Sample a random batch from replay buffer
     */
    private sampleBatch(size: number): typeof this.replayBuffer {
        const batch: typeof this.replayBuffer = [];
        const indices = new Set<number>();
        
        while (batch.length < size && indices.size < this.replayBuffer.length) {
            const idx = Math.floor(Math.random() * this.replayBuffer.length);
            if (!indices.has(idx)) {
                indices.add(idx);
                batch.push(this.replayBuffer[idx]);
            }
        }
        
        return batch;
    }
    
    // ========================================================================
    // FEATURE ENGINEERING
    // ========================================================================
    
    /**
     * Convert game context to feature vector
     */
    private contextToFeatures(context: GameContext): number[] {
        return [
            // Player state (5)
            context.playerHealthPercent,
            ...context.playerArchetype,  // 3 values
            context.playerLevel / 20,    // Normalized player level
            
            // Playstyle metrics (5)
            context.kitingScore,
            context.campingScore,
            context.aoeDamageRatio,
            context.singleTargetFocusScore,
            context.defensivePlayScore,
            
            // Battlefield (3)
            Math.min(context.totalEnemyCount / 20, 1),
            context.roundProgress,
            context.currentRound / 30,  // Normalize to ~30 rounds
            
            // Flow metrics (4)
            context.playerStressLevel,
            context.recentDamageTaken,
            context.recentDamageDealt,
            context.engagementScore,
            
            // History (3)
            context.recentPackageIds.length / 10,
            this.tagDiversityScore(context.recentPackageTags),
            this.avgTimeSinceTagUsed(context.timeSinceTagUsed)
        ];
    }
    
    /**
     * Convert package to feature vector
     */
    private packageToFeatures(candidate: PackageCandidate): number[] {
        const pkg = candidate.package;
        
        return [
            // Cost (normalized)
            candidate.cost / 200,
            
            // Intensity
            candidate.intensity / 2,
            
            // Tag presence (simplified encoding)
            this.tagPresenceScore(pkg.tags, ['antiKite', 'antiCamp', 'swarm']),
            this.tagPresenceScore(pkg.tags, ['antiAoE', 'antiTank', 'elite'])
        ];
    }
    
    /**
     * Convert package ID to simple feature vector
     */
    private packageIdToFeatures(packageId: string): number[] {
        // Simple hash-based embedding
        let hash = 0;
        for (let i = 0; i < packageId.length; i++) {
            hash = ((hash << 5) - hash) + packageId.charCodeAt(i);
            hash |= 0;
        }
        
        // Convert to 4 features in range [0, 1]
        return [
            ((hash & 0xFF) / 255),
            (((hash >> 8) & 0xFF) / 255),
            (((hash >> 16) & 0xFF) / 255),
            (((hash >> 24) & 0xFF) / 255)
        ];
    }
    
    /**
     * Calculate tag diversity score
     */
    private tagDiversityScore(tags: PackageTag[]): number {
        if (tags.length === 0) return 1.0;
        const unique = new Set(tags).size;
        return unique / tags.length;
    }
    
    /**
     * Calculate average time since tag was used
     */
    private avgTimeSinceTagUsed(timeSince: Map<PackageTag, number>): number {
        if (timeSince.size === 0) return 1.0;
        let sum = 0;
        timeSince.forEach(t => sum += Math.min(t, 10));
        return (sum / timeSince.size) / 10;
    }
    
    /**
     * Check if any of the target tags are present
     */
    private tagPresenceScore(tags: PackageTag[], targets: string[]): number {
        let count = 0;
        for (const t of targets) {
            if (tags.includes(t as PackageTag)) count++;
        }
        return count / targets.length;
    }
    
    // ========================================================================
    // REWARD CALCULATION
    // ========================================================================
    
    /**
     * Calculate reward components from game state transition
     */
    public calculateReward(
        _prevContext: GameContext,
        currContext: GameContext,
        targetStressMin: number,
        targetStressMax: number,
        boredomMetrics: { samePackageStreak: number; sameTagStreak: number; entropy: number }
    ): RewardComponents {
        const components: RewardComponents = {
            flowReward: 0,
            engagementBonus: 0,
            survivalPenalty: 0,
            varietyBonus: 0,
            noveltyBonus: 0,
            repetitionPenalty: 0,
            totalReward: 0
        };
        
        // 1. Flow Reward (being in the target stress zone)
        const targetMid = (targetStressMin + targetStressMax) / 2;
        const stressDist = Math.abs(currContext.playerStressLevel - targetMid);
        
        if (stressDist < 0.1) {
            components.flowReward = 1.0;  // Perfect zone
        } else if (stressDist < 0.2) {
            components.flowReward = 0.5;
        } else {
            components.flowReward = -0.5;  // Too far from target
        }
        
        // 2. Engagement Bonus
        components.engagementBonus = currContext.engagementScore * 0.5;
        
        // 3. Survival Penalty
        if (currContext.playerHealthPercent <= 0) {
            components.survivalPenalty = -5.0;  // Player died
        } else if (currContext.playerHealthPercent < 0.15) {
            components.survivalPenalty = -0.5;  // Near death
        }
        
        // 4. Variety Bonus (enemy type mix)
        const activeTypes = Array.from(currContext.enemyComposition.values()).filter(c => c > 0).length;
        if (activeTypes >= 3) {
            components.varietyBonus = 0.3;
        } else if (activeTypes >= 2) {
            components.varietyBonus = 0.1;
        }
        
        // 5. Novelty Bonus (from boredom metrics)
        components.noveltyBonus = boredomMetrics.entropy * 0.2;
        
        // 6. Repetition Penalty
        components.repetitionPenalty = 
            (boredomMetrics.samePackageStreak * 0.1) +
            (boredomMetrics.sameTagStreak * 0.05);
        
        // Total
        components.totalReward = 
            components.flowReward +
            components.engagementBonus +
            components.survivalPenalty +
            components.varietyBonus +
            components.noveltyBonus -
            components.repetitionPenalty;
        
        return components;
    }
    
    // ========================================================================
    // PERSISTENCE
    // ========================================================================
    
    /**
     * Save model to IndexedDB
     */
    public async saveModel(name: string): Promise<void> {
        if (!this.model) return;
        
        try {
            await this.model.save(`indexeddb://${name}`);
            console.log(`[MLSelector] Model saved: ${name}`);
        } catch (e) {
            console.error('[MLSelector] Failed to save model:', e);
        }
    }
    
    /**
     * Load model from IndexedDB
     */
    public async loadModel(name: string): Promise<boolean> {
        try {
            this.model = await tf.loadLayersModel(`indexeddb://${name}`);
            
            // Recompile the loaded model (required for training)
            this.model.compile({
                optimizer: tf.train.adam(0.001),
                loss: 'meanSquaredError'
            });
            
            console.log(`[MLSelector] Model loaded: ${name}`);
            return true;
        } catch (e) {
            console.log(`[MLSelector] No saved model found: ${name}`);
            return false;
        }
    }
    
    // ========================================================================
    // GETTERS
    // ========================================================================
    
    public getMetrics(): BanditMetrics {
        return this.metrics;
    }
    
    public getExplorationRate(): number {
        return this.metrics.explorationRate;
    }
    
    public isInitialized(): boolean {
        return this.model !== null;
    }
}

