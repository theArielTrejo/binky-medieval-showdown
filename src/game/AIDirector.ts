import * as tf from '@tensorflow/tfjs';
import { Player } from './Player';
import { EnemySystem } from './EnemySystem';
import { EnemyType } from './types/EnemyTypes';

// AI Director using Contextual Bandits (Neural Bandit)
// Optimizes for immediate player engagement/flow rather than long-term returns.

export enum DirectorAction {
    SPAWN_SKELETON_VIKINGS = 0,
    SPAWN_ARCHERS = 1,
    SPAWN_GNOLLS = 2,
    SPAWN_OGRES = 3,
    INCREASE_SPAWN_RATE = 4,
    DO_NOTHING = 5
}

export enum DifficultyLevel {
    EASY = 0,
    MEDIUM = 1,
    HARD = 2
}

export interface DifficultyConfig {
    name: string;
    epsilon: number;
    epsilonDecay: number;
    learningRate: number;
    actionInterval: number;
    aggressiveness: number;
    rewardMultiplier: number;
}

export interface GameState {
    playerArchetype: number[];
    playerHealthPercent: number;
    playerDPS: number;
    playerPositionX: number;
    playerPositionY: number;
    damageTakenRecently: number;
    playerMovementDistance: number;
    resourceGeneration: number;
    gameTimer: number;
    enemyCountSkeletonVikings: number;
    enemyCountOgres: number;
    enemyCountArchers: number;
    enemyCountGnolls: number;
    difficultyLevel: number;
    playerStressLevel: number;
    engagementScore: number;
}

export interface TrainingMetrics {
    totalSteps: number;
    averageReward: number;
    explorationRate: number;
    lossValue: number;
    trainingTime: number;
}

export interface ModelConfig {
    name: string;
    version: string;
    architecture: string;
    hyperparameters: any;
    trainingMetrics: TrainingMetrics;
    createdAt: string;
}

export class AIDirector {
    // Contextual Bandit Model: Predicts Reward for each Action given State
    private models: Map<DifficultyLevel, tf.LayersModel | null> = new Map();
    private currentDifficulty: DifficultyLevel = DifficultyLevel.MEDIUM;
    private difficultyConfigs: Map<DifficultyLevel, DifficultyConfig> = new Map();
    
    private trainingMode: boolean = false;
    private isActive: boolean = true;
    private gameStartTime: number;
    private lastActionTime: number = 0;
    private actionInterval: number = 3000;
    
    private stateHistory: GameState[] = [];
    private actionHistory: DirectorAction[] = [];
    
    // Bandit Parameters
    private epsilon: number = 0.5; // Start high for exploration
    private epsilonMin: number = 0.05;
    private epsilonDecay: number = 0.99;
    private trainSteps: number = 0;
    
    // Simple Replay Buffer for Batch Training (Stability)
    private replayBuffer: Array<{
        state: GameState;
        action: DirectorAction;
        reward: number;
    }> = [];
    private maxReplayBufferSize: number = 1000; // Smaller buffer needed for bandits
    private batchSize: number = 32;

    // Model persistence and metrics
    private modelConfig: ModelConfig;
    private trainingMetrics: TrainingMetrics;
    private autoSaveInterval: number = 20; // Train/Save every 20 actions
    private modelVersion: string = '3.0.0-bandit'; // Version bump for new algorithm
    
    private recentRewards: number[] = [];
    private recentLosses: number[] = [];
    
    // Resource Budget System
    private currentBudget: number = 0;
    private maxBudget: number = 500;
    private budgetRegenRate: number = 10;
    private lastBudgetUpdate: number = 0;
    private emergencyBudgetMultiplier: number = 1.0;
    private budgetEfficiencyBonus: number = 1.0;
    
    // Tactical properties
    private adaptiveStrategy: 'aggressive' | 'defensive' | 'balanced' | 'counter' = 'balanced';
    private playerPerformanceMetrics: {
        averageSurvivalTime: number;
        damageDealtPerSecond: number;
        movementPatterns: string[];
        preferredPositions: {x: number, y: number}[];
    } = {
        averageSurvivalTime: 0,
        damageDealtPerSecond: 0,
        movementPatterns: [],
        preferredPositions: []
    };
    
    private threatAssessmentHistory: Array<{time: number, threat: number, response: DirectorAction}> = [];
    private budgetHistory: Array<{time: number, budget: number, spent: number}> = [];
    private tacticalMemory: Array<{gameState: GameState, action: DirectorAction, outcome: number}> = [];
    private strategicObjectives: Array<{
        type: 'pressure' | 'overwhelm' | 'adapt' | 'counter';
        priority: number;
        conditions: (state: GameState) => boolean;
        actions: DirectorAction[];
    }> = [];
    private playerBehaviorPattern: Map<string, number> = new Map();

    // Adaptive Difficulty
    private adaptiveDifficultyEnabled: boolean = true;
    private performanceWindow: Array<{timestamp: number, performance: number}> = [];
    private lastDifficultyAdjustment: number = 0;
    private targetPerformanceRange = { min: 0.4, max: 0.7 };

    constructor() {
        this.gameStartTime = Date.now();
        this.lastBudgetUpdate = Date.now();
        this.initializeDifficultyConfigs();
        this.initializeMetrics();
        this.initializeBudgetSystem();
        this.initializeStrategicObjectives();
        
        // Initialize
        this.initializeAllModels().catch(err => console.error("Failed to init AI models:", err));
    }

    private initializeDifficultyConfigs(): void {
        this.difficultyConfigs.set(DifficultyLevel.EASY, {
            name: 'Easy',
            epsilon: 0.4,
            epsilonDecay: 0.995,
            learningRate: 0.01, // Higher LR for bandits
            actionInterval: 5000,
            aggressiveness: 0.3,
            rewardMultiplier: 1.2
        });
        
        this.difficultyConfigs.set(DifficultyLevel.MEDIUM, {
            name: 'Medium',
            epsilon: 0.5,
            epsilonDecay: 0.99,
            learningRate: 0.005,
            actionInterval: 3000,
            aggressiveness: 0.6,
            rewardMultiplier: 1.0
        });
        
        this.difficultyConfigs.set(DifficultyLevel.HARD, {
            name: 'Hard',
            epsilon: 0.6,
            epsilonDecay: 0.98,
            learningRate: 0.005,
            actionInterval: 2000,
            aggressiveness: 0.9,
            rewardMultiplier: 0.8
        });
     }

    private initializeMetrics(): void {
        this.trainingMetrics = {
            totalSteps: 0,
            averageReward: 0,
            explorationRate: this.epsilon,
            lossValue: 0,
            trainingTime: 0
        };
        
        this.modelConfig = {
            name: 'AI_Director_Contextual_Bandit',
            version: this.modelVersion,
            architecture: 'Neural_Contextual_Bandit_v1',
            hyperparameters: {
                epsilon: this.epsilon,
                epsilonDecay: this.epsilonDecay,
                epsilonMin: this.epsilonMin
            },
            trainingMetrics: this.trainingMetrics,
            createdAt: new Date().toISOString()
        };
    }

    private async initializeAllModels(): Promise<void> {
        for (const difficulty of [DifficultyLevel.EASY, DifficultyLevel.MEDIUM, DifficultyLevel.HARD]) {
            this.currentDifficulty = difficulty;
            await this.initializeModel();
            // Attempt to load existing model
            const loaded = await this.loadModel(`ai-director-bandit-${DifficultyLevel[difficulty]}`);
            if (loaded) {
                console.log(`Loaded existing bandit model for ${DifficultyLevel[difficulty]}`);
            }
        }
        this.currentDifficulty = DifficultyLevel.MEDIUM; // Default
    }

    private async initializeModel(): Promise<void> {
        const config = this.difficultyConfigs.get(this.currentDifficulty)!;
        
        // Neural Bandit Architecture
        // Input: 16 State Features
        // Output: 6 Predicted Rewards (one for each Action)
        const model = tf.sequential();
        
        model.add(tf.layers.dense({
            inputShape: [16],
            units: 32,
            activation: 'relu',
            kernelInitializer: 'heNormal'
        }));
        
        model.add(tf.layers.dropout({ rate: 0.1 }));
        
        model.add(tf.layers.dense({
            units: 24,
            activation: 'relu',
            kernelInitializer: 'heNormal'
        }));

        // Output layer: Linear activation to predict Reward value directly
        model.add(tf.layers.dense({
            units: 6, 
            activation: 'linear',
            kernelInitializer: 'zeros'
        }));

        model.compile({
            optimizer: tf.train.adam(config.learningRate),
            loss: 'meanSquaredError'
        });
        
        this.models.set(this.currentDifficulty, model);
    }

    // --- Core Bandit Logic ---

    public async update(player: Player, enemySystem: EnemySystem): Promise<void> {
        if (!this.isActive) return;

        const currentTime = Date.now();
        if (currentTime - this.lastActionTime < this.actionInterval) return;

        // 1. Get Context (State)
        const currentState = this.getGameState(player, enemySystem);
        
        // 2. Update Last Action's Outcome (if exists)
        // In Bandits, we need to link (State_t, Action_t) -> Reward_t.
        // Since rewards are calculated based on the change/impact over the interval,
        // we calculate the reward for the action taken at t-1 now at time t.
        if (this.stateHistory.length > 0 && this.actionHistory.length > 0) {
            const lastState = this.stateHistory[this.stateHistory.length - 1];
            const lastAction = this.actionHistory[this.actionHistory.length - 1];
            
            const reward = this.calculateReward(lastState, currentState);
            
            // Store experience
            this.replayBuffer.push({
                state: lastState,
                action: lastAction,
                reward: reward
            });

            if (this.replayBuffer.length > this.maxReplayBufferSize) {
                this.replayBuffer.shift();
            }
            
            // Update metrics
            this.recentRewards.push(reward);
            if (this.recentRewards.length > 100) this.recentRewards.shift();
            this.trainingMetrics.averageReward = this.recentRewards.reduce((a,b)=>a+b,0) / this.recentRewards.length;

            // Update Tactical Outcome
            this.updateTacticalOutcome(reward);
        }

        // 3. Train Model (Online Learning)
        if (this.trainingMode && this.replayBuffer.length >= this.batchSize) {
             await this.trainBandit();
             this.trainSteps++;
             
             // Auto-save occasionally
             if (this.trainSteps % this.autoSaveInterval === 0) {
                 await this.saveModel(`ai-director-bandit-${DifficultyLevel[this.currentDifficulty]}`);
             }
        }

        // 4. Select New Action
        const action = await this.chooseAction(currentState, enemySystem);
        
        // 5. Execute Action
        this.executeAction(action, enemySystem);
        
        // 6. Store History
        this.stateHistory.push(currentState);
        this.actionHistory.push(action);
        this.lastActionTime = currentTime;
        
        // 7. Adaptive Logic
        if (this.adaptiveDifficultyEnabled) {
            this.updatePerformanceWindow(this.calculatePlayerPerformance(currentState));
            if (this.shouldAdjustDifficulty()) {
                this.adjustDifficultyBasedOnPerformance();
            }
        }
    }

    private async chooseAction(state: GameState, enemySystem?: EnemySystem): Promise<DirectorAction> {
        const config = this.difficultyConfigs.get(this.currentDifficulty)!;
        const model = this.models.get(this.currentDifficulty);

        // Update strategy
        this.updatePlayerPerformanceMetrics(state);
        this.updateAdaptiveStrategy(state);

        // Strategic Override (Rule-based high priority actions)
        if (enemySystem) {
            const strategicAction = this.selectStrategicAction(state, enemySystem);
            if (strategicAction !== null) {
                // Log intent but don't force it 100% of the time if we want to learn new things
                // But for a Director, rules usually trump learning if critical
                return strategicAction;
            }
        }

        // Exploration (Epsilon-Greedy)
        if (this.trainingMode && Math.random() < this.epsilon) {
            // Decay epsilon
            this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay);
            this.trainingMetrics.explorationRate = this.epsilon;
            
            // Random action
            return Math.floor(Math.random() * 6) as DirectorAction;
        }

        // Exploitation (Model Prediction)
        if (model) {
            const stateTensor = this.gameStateToTensor(state);
            const prediction = model.predict(stateTensor) as tf.Tensor;
            const predictedRewards = await prediction.data();
            
            stateTensor.dispose();
            prediction.dispose();

            // Find action with max predicted reward
            let bestAction = 0;
            let maxReward = -Infinity;
            
            for (let i = 0; i < 6; i++) {
                if (predictedRewards[i] > maxReward) {
                    maxReward = predictedRewards[i];
                    bestAction = i;
                }
            }
            
            return bestAction as DirectorAction;
        }

        return DirectorAction.DO_NOTHING;
    }

    private async trainBandit(): Promise<void> {
        const model = this.models.get(this.currentDifficulty);
        if (!model) return;

        const startTime = Date.now();
        
        // Sample batch from buffer (random sampling to break correlations)
        const batchSize = Math.min(this.batchSize, this.replayBuffer.length);
        const batch = [];
        const indices = new Set<number>();
        while(batch.length < batchSize) {
            const idx = Math.floor(Math.random() * this.replayBuffer.length);
            if (!indices.has(idx)) {
                indices.add(idx);
                batch.push(this.replayBuffer[idx]);
            }
        }

        // Prepare Tensors
        // Inputs: States
        const statesTensor = tf.concat(batch.map(exp => this.gameStateToTensor(exp.state)));
        
        // Targets: This is the "Contextual Bandit" trick.
        // We want to train ONLY the output neuron corresponding to the action taken.
        // We do this by predicting current values, replacing the value for the taken action with the actual reward,
        // and training on that.
        const predictionsTensor = model.predict(statesTensor) as tf.Tensor;
        const predictions = await predictionsTensor.array() as number[][];
        
        const targets = predictions.map((predRow, i) => {
            const experience = batch[i];
            const newRow = [...predRow];
            // Set the target for the taken action to the actual reward observed
            newRow[experience.action] = experience.reward; 
            return newRow;
        });

        const targetsTensor = tf.tensor2d(targets);

        // Train
        const history = await model.fit(statesTensor, targetsTensor, {
            epochs: 1,
            verbose: 0,
            shuffle: true
        });

        // Cleanup
        statesTensor.dispose();
        predictionsTensor.dispose();
        targetsTensor.dispose();

        // Update Metrics
        const loss = Array.isArray(history.history.loss) ? history.history.loss[0] : history.history.loss;
        this.recentLosses.push(loss as number);
        if (this.recentLosses.length > 50) this.recentLosses.shift();
        
        this.trainingMetrics.lossValue = this.recentLosses.reduce((a,b)=>a+b,0)/this.recentLosses.length;
        this.trainingMetrics.trainingTime += Date.now() - startTime;
        this.trainingMetrics.totalSteps = this.trainSteps;
    }

    // --- State & Reward ---

    public getGameState(player: Player, enemySystem: EnemySystem): GameState {
        const currentTime = Date.now();
        const gameTimer = (currentTime - this.gameStartTime) / 1000;
        const healthPercent = player.getHealthPercentage();
        
        // Calculate difficulty progression (0 to 1)
        const progression = Math.min(gameTimer / 300, 1); // 5 min cap
        
        // Stress Level (The "Flow" Channel)
        const enemies = enemySystem.getEnemyCount();
        const stress = Math.min((1 - healthPercent) * 0.6 + (enemies / 20) * 0.4, 1);

        // Engagement (Movement + DPS)
        const dps = player.getDPSOverLastTenSeconds();
        const moveDist = player.getMovementDistanceLastTenSeconds();
        const engagement = Math.min((dps/50)*0.5 + (moveDist/500)*0.5, 1);

        return {
            playerArchetype: player.getArchetypeVector(),
            playerHealthPercent: healthPercent,
            playerDPS: Math.min(dps / 100, 1),
            playerPositionX: (player.position.x) / 2000, // Approx world width
            playerPositionY: (player.position.y) / 2000,
            damageTakenRecently: Math.min(player.getDamageTakenRecently() / 50, 1),
            playerMovementDistance: Math.min(moveDist / 1000, 1),
            resourceGeneration: Math.min(player.getXPGenerationRate() / 10, 1),
            gameTimer: progression,
            enemyCountSkeletonVikings: Math.min(enemySystem.getEnemyCountByType(EnemyType.SKELETON_VIKING) / 10, 1),
            enemyCountOgres: Math.min(enemySystem.getEnemyCountByType(EnemyType.OGRE) / 5, 1),
            enemyCountArchers: Math.min(enemySystem.getEnemyCountByType(EnemyType.ARCHER) / 10, 1),
            enemyCountGnolls: Math.min(enemySystem.getEnemyCountByType(EnemyType.GNOLL) / 15, 1),
            difficultyLevel: progression,
            playerStressLevel: stress,
            engagementScore: engagement
        };
    }

    private gameStateToTensor(state: GameState): tf.Tensor2D {
        // Flatten state to vector
        const arr = [
            ...state.playerArchetype, // 3
            state.playerHealthPercent,
            state.playerDPS,
            state.playerPositionX,
            state.playerPositionY,
            state.damageTakenRecently,
            state.playerMovementDistance,
            state.resourceGeneration,
            state.gameTimer,
            state.enemyCountSkeletonVikings,
            state.enemyCountOgres,
            state.enemyCountArchers,
            state.enemyCountGnolls,
            state.difficultyLevel,
            state.playerStressLevel,
            state.engagementScore
        ];
        
        // Padding/Truncating just in case
        while(arr.length < 16) arr.push(0);
        return tf.tensor2d([arr.slice(0, 16)]);
    }

    public calculateReward(prevState: GameState, currState: GameState): number {
        // Bandit Reward Function
        // We want to maximize "Fun/Flow".
        // Flow is defined as: Challenging but not impossible.
        
        let reward = 0;
        const config = this.difficultyConfigs.get(this.currentDifficulty)!;

        // 1. Target Stress Level
        // Easy: 0.3-0.5, Medium: 0.5-0.7, Hard: 0.7-0.9
        let targetStress = 0.6;
        if (this.currentDifficulty === DifficultyLevel.EASY) targetStress = 0.4;
        if (this.currentDifficulty === DifficultyLevel.HARD) targetStress = 0.8;
        
        const stressDist = Math.abs(currState.playerStressLevel - targetStress);
        
        // High reward for being close to target stress (The "Zone")
        if (stressDist < 0.1) reward += 1.0;
        else if (stressDist < 0.2) reward += 0.5;
        else reward -= 0.5; // Too boring or too hard

        // 2. Engagement Bonus
        reward += currState.engagementScore * 0.5;

        // 3. Survival Penalty (Immediate Death is bad, but low health is exciting)
        if (currState.playerHealthPercent <= 0) reward -= 5.0; // Player died, very bad for "fun" usually (unless roguelike)
        
        // 4. Variety Bonus (Simple implementation)
        // Checks if enemy composition is mixed
        const enemies = [
            currState.enemyCountSkeletonVikings, 
            currState.enemyCountArchers, 
            currState.enemyCountGnolls, 
            currState.enemyCountOgres
        ];
        const activeTypes = enemies.filter(c => c > 0).length;
        if (activeTypes >= 3) reward += 0.3;

        return reward * config.rewardMultiplier;
    }

    // --- Execution & Budget ---

    public executeAction(action: DirectorAction, enemySystem: EnemySystem): void {
        this.updateBudget();
        
        const spawnPlans = this.calculateOptimalSpawns(action, enemySystem);
        
        // Budget Check
        if (spawnPlans.totalCost <= this.currentBudget) {
            switch (action) {
                case DirectorAction.SPAWN_SKELETON_VIKINGS:
                    if (spawnPlans.skeletonVikings > 0) {
                        enemySystem.spawnWave(EnemyType.SKELETON_VIKING, spawnPlans.skeletonVikings, 'near_player');
                        this.spendBudget(spawnPlans.skeletonVikingCost);
                    }
                    break;
                case DirectorAction.SPAWN_ARCHERS:
                    if (spawnPlans.archers > 0) {
                        enemySystem.spawnWave(EnemyType.ARCHER, spawnPlans.archers, 'screen_edges');
                        this.spendBudget(spawnPlans.archerCost);
                    }
                    break;
                case DirectorAction.SPAWN_GNOLLS:
                    if (spawnPlans.gnolls > 0) {
                        enemySystem.spawnWave(EnemyType.GNOLL, spawnPlans.gnolls, 'random_ambush');
                        this.spendBudget(spawnPlans.gnollCost);
                    }
                    break;
                case DirectorAction.SPAWN_OGRES:
                    if (spawnPlans.ogres > 0) {
                        enemySystem.spawnWave(EnemyType.OGRE, spawnPlans.ogres, 'near_player');
                        this.spendBudget(spawnPlans.ogreCost);
                    }
                    break;
                case DirectorAction.INCREASE_SPAWN_RATE:
                    enemySystem.increaseSpawnRate(10);
                    break;
            }
        } else {
            // Emergency Handling
            if (this.shouldUseEmergencyBudget(enemySystem)) {
                this.activateEmergencyBudget();
                // Try again immediately
                this.executeAction(action, enemySystem); 
            }
        }
    }
    
    private initializeBudgetSystem(): void {
        this.maxBudget = 300 + (this.currentDifficulty * 200);
        this.budgetRegenRate = 8 + (this.currentDifficulty * 4);
        this.currentBudget = this.maxBudget * 0.5;
    }

    private updateBudget(): void {
        const now = Date.now();
        const dt = (now - this.lastBudgetUpdate) / 1000;
        if (dt > 0) {
            this.currentBudget = Math.min(this.currentBudget + (this.budgetRegenRate * dt * this.budgetEfficiencyBonus), this.maxBudget);
            this.lastBudgetUpdate = now;
            
            this.budgetHistory.push({time: now, budget: this.currentBudget, spent: 0});
            if (this.budgetHistory.length > 50) this.budgetHistory.shift();
        }
    }

    private spendBudget(amount: number): void {
        this.currentBudget = Math.max(0, this.currentBudget - amount);
        if (this.budgetHistory.length > 0) {
            this.budgetHistory[this.budgetHistory.length-1].spent += amount;
        }
    }

    // --- Helper Logic (Tactical/Strategic) ---

    private initializeStrategicObjectives(): void {
        this.strategicObjectives = [
            {
                type: 'pressure',
                priority: 0.8,
                conditions: (state) => state.playerHealthPercent > 0.8 && state.enemyCountGnolls < 0.2,
                actions: [DirectorAction.SPAWN_GNOLLS, DirectorAction.SPAWN_ARCHERS]
            },
            {
                type: 'overwhelm',
                priority: 0.9,
                conditions: (state) => state.gameTimer > 0.8 && state.playerStressLevel < 0.5,
                actions: [DirectorAction.SPAWN_OGRES, DirectorAction.SPAWN_SKELETON_VIKINGS]
            }
        ];
    }

    private selectStrategicAction(state: GameState, enemySystem: EnemySystem): DirectorAction | null {
        const validObjectives = this.strategicObjectives
            .filter(o => o.conditions(state))
            .sort((a,b) => b.priority - a.priority);
            
        if (validObjectives.length > 0) {
            const obj = validObjectives[0];
            // Pick random valid action from objective
            const action = obj.actions[Math.floor(Math.random() * obj.actions.length)];
            return action;
        }
        return null;
    }

    private updatePlayerPerformanceMetrics(state: GameState): void {
        // Update rolling averages
        this.playerPerformanceMetrics.damageDealtPerSecond = 
            (this.playerPerformanceMetrics.damageDealtPerSecond * 0.9) + (state.playerDPS * 100 * 0.1);
    }

    private updateAdaptiveStrategy(state: GameState): void {
        // Simple heuristic
        if (state.playerHealthPercent > 0.8) this.adaptiveStrategy = 'aggressive';
        else if (state.playerHealthPercent < 0.3) this.adaptiveStrategy = 'defensive';
        else this.adaptiveStrategy = 'balanced';
    }
    
    private detectPlayerPattern(state: GameState): boolean {
         const movementKey = `${Math.floor(state.playerPositionX * 40)}_${Math.floor(state.playerPositionY * 40)}`;
         const currentCount = this.playerBehaviorPattern.get(movementKey) || 0;
         this.playerBehaviorPattern.set(movementKey, currentCount + 1);
         return currentCount > 10; // Camping check
    }
    
    private shouldUseEmergencyBudget(enemySystem: EnemySystem): boolean {
        return enemySystem.getEnemyCount() < 3 && this.currentBudget < 50 && this.emergencyBudgetMultiplier === 1.0;
    }
    
    private activateEmergencyBudget(): void {
        this.emergencyBudgetMultiplier = 2.0;
        this.currentBudget += 100;
        console.log("Director: Emergency Budget Activated");
        setTimeout(() => this.emergencyBudgetMultiplier = 1.0, 15000);
    }

    private calculateOptimalSpawns(action: DirectorAction, enemySystem: EnemySystem) {
        // Simplified costs for brevity
        const costs = { skeletonViking: 50, archer: 30, gnoll: 20, ogre: 100 };
        
        const spawn = { skeletonVikings: 0, archers: 0, gnolls: 0, ogres: 0, skeletonVikingCost: 0, archerCost: 0, gnollCost: 0, ogreCost: 0, totalCost: 0 };
        
        // How many can we afford?
        const budget = this.currentBudget;
        
        if (action === DirectorAction.SPAWN_SKELETON_VIKINGS) spawn.skeletonVikings = Math.min(3, Math.floor(budget / costs.skeletonViking));
        if (action === DirectorAction.SPAWN_ARCHERS) spawn.archers = Math.min(5, Math.floor(budget / costs.archer));
        if (action === DirectorAction.SPAWN_GNOLLS) spawn.gnolls = Math.min(8, Math.floor(budget / costs.gnoll));
        if (action === DirectorAction.SPAWN_OGRES) spawn.ogres = Math.min(2, Math.floor(budget / costs.ogre));
        
        spawn.skeletonVikingCost = spawn.skeletonVikings * costs.skeletonViking;
        spawn.archerCost = spawn.archers * costs.archer;
        spawn.gnollCost = spawn.gnolls * costs.gnoll;
        spawn.ogreCost = spawn.ogres * costs.ogre;
        spawn.totalCost = spawn.skeletonVikingCost + spawn.archerCost + spawn.gnollCost + spawn.ogreCost;
        
        return spawn;
    }
    
    private updateTacticalOutcome(reward: number): void {
        if (this.tacticalMemory.length > 0) {
            this.tacticalMemory[this.tacticalMemory.length - 1].outcome = reward;
        }
    }

    // --- Adaptive Difficulty Scaling ---
    
    private calculatePlayerPerformance(state: GameState): number {
        return (state.playerHealthPercent * 0.5) + (state.engagementScore * 0.5);
    }

    private updatePerformanceWindow(perf: number): void {
        this.performanceWindow.push({timestamp: Date.now(), performance: perf});
        if (this.performanceWindow.length > 20) this.performanceWindow.shift();
    }
    
    private shouldAdjustDifficulty(): boolean {
        return (Date.now() - this.lastDifficultyAdjustment) > 30000;
    }
    
    private adjustDifficultyBasedOnPerformance(): void {
        const avg = this.performanceWindow.reduce((a,b) => a + b.performance, 0) / this.performanceWindow.length;
        if (avg < this.targetPerformanceRange.min) {
             // Make easier
             this.maxBudget = Math.max(200, this.maxBudget - 50);
             console.log("Director: Adapting - Difficulty Decreased");
        } else if (avg > this.targetPerformanceRange.max) {
             // Make harder
             this.maxBudget = Math.min(1000, this.maxBudget + 50);
             console.log("Director: Adapting - Difficulty Increased");
        }
        this.lastDifficultyAdjustment = Date.now();
    }

    // --- Public Getters/Setters ---

    public setActive(active: boolean): void { this.isActive = active; }
    public setTrainingMode(training: boolean): void { this.trainingMode = training; }
    public isTraining(): boolean { return this.trainingMode; }
    
    public getTrainingMetrics(): TrainingMetrics { return this.trainingMetrics; }
    public getModelConfig(): ModelConfig { return this.modelConfig; }
    public getTrainingStatus(): string {
        return `Mode: ${this.trainingMode ? 'Bandit Learning' : 'Inference'} | Steps: ${this.trainSteps} | Avg Reward: ${this.trainingMetrics.averageReward.toFixed(2)}`;
    }
    
    public getBudgetStatus(): string {
        return `Budget: ${this.currentBudget.toFixed(0)}/${this.maxBudget}`;
    }
    public getCurrentBudget(): number { return this.currentBudget; }
    public getMaxBudget(): number { return this.maxBudget; }
    
    public getTacticalStatus(): string {
        return `Strategy: ${this.adaptiveStrategy} | Stress: ${this.stateHistory.length > 0 ? this.stateHistory[this.stateHistory.length-1].playerStressLevel.toFixed(2) : 0}`;
    }
    
    public getAdaptiveStrategy(): string { return this.adaptiveStrategy; }
    public getAdaptiveDifficultyStatus(): string { return this.adaptiveDifficultyEnabled ? "Active" : "Disabled"; }
    
    // Persistence
    public async saveModel(name: string): Promise<void> {
        if (typeof window !== 'undefined' && window.localStorage) {
            const model = this.models.get(this.currentDifficulty);
            if (model) await model.save(`indexeddb://${name}`);
        }
    }
    
    public async loadModel(name: string): Promise<boolean> {
        try {
            const model = await tf.loadLayersModel(`indexeddb://${name}`);
            this.models.set(this.currentDifficulty, model);
            return true;
        } catch (e) { return false; }
    }
    
    // Legacy/Compatibility Getters
    public getPlayerPerformanceMetrics(): any { return this.playerPerformanceMetrics; }
    public getThreatAssessmentHistory(): any[] { return this.threatAssessmentHistory; }
    public getBudgetHistory(): any[] { return this.budgetHistory; }
    public getStrategicObjectivesStatus(): string { return `${this.strategicObjectives.length} objectives active`; }
}
