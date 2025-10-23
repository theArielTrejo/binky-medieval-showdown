import * as tf from '@tensorflow/tfjs';
import { Player } from './Player';
import { EnemySystem } from './EnemySystem';
import { EnemyType } from './types/EnemyTypes';

// Enhanced AI Director with improved architecture and training

export enum DirectorAction {
    SPAWN_SKELETON_VIKINGS = 0,
    SPAWN_ARCHERS = 1,
    SPAWN_GNOLLS = 2,
    SPAWN_GOLEMS = 3,
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
    enemyCountGolems: number;
    enemyCountArchers: number;
    enemyCountGnolls: number;
    difficultyLevel: number;
    playerStressLevel: number;
    engagementScore: number;
}

export interface TrainingMetrics {
    totalEpisodes: number;
    averageReward: number;
    explorationRate: number;
    lossValue: number;
    qValueMean: number;
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
    private models: Map<DifficultyLevel, tf.LayersModel | null> = new Map();
    private targetModels: Map<DifficultyLevel, tf.LayersModel | null> = new Map();
    private currentDifficulty: DifficultyLevel = DifficultyLevel.MEDIUM;
    private difficultyConfigs: Map<DifficultyLevel, DifficultyConfig> = new Map();
    private trainingMode: boolean = false;
    private gameStartTime: number;
    private lastActionTime: number = 0;
    private actionInterval: number = 3000; // 3 seconds between actions
    
    // Legacy properties for backward compatibility
    private get model(): tf.LayersModel | null {
        return this.models.get(this.currentDifficulty) || null;
    }
    
    private set model(value: tf.LayersModel | null) {
        this.models.set(this.currentDifficulty, value);
    }
    
    private get targetModel(): tf.LayersModel | null {
        return this.targetModels.get(this.currentDifficulty) || null;
    }
    
    private set targetModel(value: tf.LayersModel | null) {
        this.targetModels.set(this.currentDifficulty, value);
    }

    private stateHistory: GameState[] = [];
    private actionHistory: DirectorAction[] = [];
    
    // Enhanced training parameters
    private epsilon: number = 0.9; // Higher initial exploration
    private epsilonMin: number = 0.01;
    private epsilonDecay: number = 0.995;
    private learningRate: number = 0.0005; // Lower learning rate for stability
    private discountFactor: number = 0.99;
    private targetUpdateFreq: number = 1000; // Update target network every 1000 steps
    private trainSteps: number = 0;
    
    // Prioritized Experience Replay
    private replayBuffer: Array<{
        state: GameState;
        action: DirectorAction;
        reward: number;
        nextState: GameState;
        done: boolean;
        priority: number;
        tdError: number;
    }> = [];
    private maxReplayBufferSize: number = 50000;
    private alpha: number = 0.6; // Prioritization exponent
    private beta: number = 0.4; // Importance sampling exponent
    private betaIncrement: number = 0.001;
    private lastSaveTime: number = 0; // Last auto-save timestamp
    
    // Model persistence and metrics
    private modelConfig: ModelConfig;
    private trainingMetrics: TrainingMetrics;
    private autoSaveInterval: number = 10000; // Auto-save every 10k steps
    private modelVersion: string = '1.0.0';
    
    // Performance tracking
    private episodeRewards: number[] = [];
    private recentLosses: number[] = [];
    private qValues: number[] = [];
    
    // Resource Budget System
    private currentBudget: number = 0;
    private maxBudget: number = 500;
    private budgetRegenRate: number = 10; // Budget points per second
    private lastBudgetUpdate: number = 0;
    private budgetHistory: Array<{time: number, budget: number, spent: number}> = [];
    private emergencyBudgetMultiplier: number = 1.0;
    private budgetEfficiencyBonus: number = 1.0;
    
    // Tactical decision-making properties
    private tacticalMemory: Array<{gameState: GameState, action: DirectorAction, outcome: number}> = [];
    private playerBehaviorPattern: Map<string, number> = new Map();
    private threatAssessmentHistory: Array<{time: number, threat: number, response: DirectorAction}> = [];
    private adaptiveStrategy: 'aggressive' | 'defensive' | 'balanced' | 'counter' = 'balanced';
    private playerPerformanceMetrics: {
        averageSurvivalTime: number;
        damageDealtPerSecond: number;
        movementPatterns: string[];
        preferredPositions: {x: number, y: number}[];
        reactionTime: number;
    } = {
        averageSurvivalTime: 0,
        damageDealtPerSecond: 0,
        movementPatterns: [],
        preferredPositions: [],
        reactionTime: 0
    };
    private strategicObjectives: Array<{
        type: 'pressure' | 'overwhelm' | 'adapt' | 'counter';
        priority: number;
        conditions: (state: GameState) => boolean;
        actions: DirectorAction[];
    }> = [];

    constructor() {
        this.gameStartTime = Date.now();
        this.lastSaveTime = Date.now();
        this.lastBudgetUpdate = Date.now();
        this.clearOldIncompatibleModels(); // Clear models trained with old 10-action system
        this.initializeDifficultyConfigs();
        this.initializeMetrics();
        this.initializeBudgetSystem();
        this.initializeStrategicObjectives();
        this.initializeAllModels();
    }
    
    private async clearOldIncompatibleModels(): Promise<void> {
        // Clear any models trained with the old 10-action system
        // New system has 6 actions (SKELETON_VIKING, ARCHER, GNOLL, GOLEM, INCREASE_SPAWN_RATE, DO_NOTHING)
        const modelVersion = '2.0.0'; // Increment when action space changes
        
        if (typeof window !== 'undefined' && window.localStorage) {
            const storedVersion = localStorage.getItem('ai-director-version');
            if (storedVersion !== modelVersion) {
                console.log(`Clearing old AI models (version ${storedVersion} -> ${modelVersion})`);
                
                // Clear all models
                try {
                    const modelKeys = await tf.io.listModels();
                    for (const key of Object.keys(modelKeys)) {
                        if (key.includes('ai-director') || key.includes('easy') || key.includes('medium') || key.includes('hard')) {
                            await tf.io.removeModel(key);
                            console.log(`Removed old model: ${key}`);
                        }
                    }
                } catch (error) {
                    console.warn('Error clearing old models:', error);
                }
                
                // Update version
                localStorage.setItem('ai-director-version', modelVersion);
                this.modelVersion = modelVersion;
            }
        }
    }
    
    private initializeDifficultyConfigs(): void {
        // Easy difficulty - more forgiving, slower actions
        this.difficultyConfigs.set(DifficultyLevel.EASY, {
            name: 'Easy',
            epsilon: 0.7,
            epsilonDecay: 0.998,
            learningRate: 0.001,
            actionInterval: 5000,
            aggressiveness: 0.3,
            rewardMultiplier: 1.2
        });
        
        // Medium difficulty - balanced
        this.difficultyConfigs.set(DifficultyLevel.MEDIUM, {
            name: 'Medium',
            epsilon: 0.9,
            epsilonDecay: 0.995,
            learningRate: 0.0005,
            actionInterval: 3000,
            aggressiveness: 0.6,
            rewardMultiplier: 1.0
        });
        
        // Hard difficulty - aggressive, faster actions
        this.difficultyConfigs.set(DifficultyLevel.HARD, {
            name: 'Hard',
            epsilon: 0.95,
            epsilonDecay: 0.992,
            learningRate: 0.0003,
            actionInterval: 2000,
            aggressiveness: 0.9,
            rewardMultiplier: 0.8
        });
     }
     
     private initializeBudgetSystem(): void {
        // Initialize budget based on difficulty
        this.maxBudget = 300 + (this.currentDifficulty * 200); // Easy: 300, Medium: 500, Hard: 700
        this.budgetRegenRate = 8 + (this.currentDifficulty * 4); // Easy: 8/s, Medium: 12/s, Hard: 16/s
        this.currentBudget = this.maxBudget * 0.5; // Start with half budget
        
        console.log(`Budget system initialized: Max=${this.maxBudget}, Regen=${this.budgetRegenRate}/s`);
     }
     
     private initializeStrategicObjectives(): void {
         // Define strategic objectives for tactical decision-making
         this.strategicObjectives = [
             {
                 type: 'pressure',
                 priority: 0.8,
                 conditions: (state: GameState) => state.playerHealthPercent > 0.7 && state.engagementScore < 0.5,
                actions: [DirectorAction.SPAWN_GNOLLS, DirectorAction.SPAWN_ARCHERS, DirectorAction.INCREASE_SPAWN_RATE]
             },
             {
                 type: 'overwhelm',
                 priority: 0.9,
                 conditions: (state: GameState) => state.playerDPS > 100 && state.playerHealthPercent > 0.5,
                actions: [DirectorAction.SPAWN_GOLEMS, DirectorAction.SPAWN_SKELETON_VIKINGS]
             },
             {
                 type: 'adapt',
                 priority: 0.7,
                 conditions: (state: GameState) => state.playerStressLevel < 0.3 && state.gameTimer > 30000,
                actions: [DirectorAction.SPAWN_ARCHERS, DirectorAction.SPAWN_SKELETON_VIKINGS]
             },
             {
                 type: 'counter',
                 priority: 1.0,
                 conditions: (state: GameState) => this.detectPlayerPattern(state),
                actions: [DirectorAction.SPAWN_GOLEMS, DirectorAction.SPAWN_ARCHERS, DirectorAction.SPAWN_GNOLLS]
             }
         ];
     }
     
     private detectPlayerPattern(state: GameState): boolean {
         // Analyze player behavior patterns
         const movementKey = `${Math.floor(state.playerPositionX / 50)}_${Math.floor(state.playerPositionY / 50)}`;
         const currentCount = this.playerBehaviorPattern.get(movementKey) || 0;
         this.playerBehaviorPattern.set(movementKey, currentCount + 1);
         
         // Detect if player is camping in one area
         return currentCount > 10;
     }
     
     private assessThreatLevel(state: GameState): number {
        // Calculate current threat level based on multiple factors
        let threatLevel = 0;
        
        // Player capability assessment
        const playerThreat = (state.playerDPS / 100) * (state.playerHealthPercent / 100);
         
         // Enemy presence assessment
         const totalEnemies = state.enemyCountSkeletonVikings + state.enemyCountGolems + 
                             state.enemyCountArchers + state.enemyCountGnolls;
         const enemyThreat = Math.min(totalEnemies / 20, 1.0);
         
         // Budget efficiency assessment
         const budgetEfficiency = this.currentBudget / this.maxBudget;
         
         // Combine factors
         threatLevel = (playerThreat * 0.4) + (enemyThreat * 0.3) + (budgetEfficiency * 0.3);
         
         // Store in history
         this.threatAssessmentHistory.push({
             time: Date.now(),
             threat: threatLevel,
             response: DirectorAction.DO_NOTHING // Will be updated when action is chosen
         });
         
         // Keep only recent history
         if (this.threatAssessmentHistory.length > 100) {
             this.threatAssessmentHistory = this.threatAssessmentHistory.slice(-100);
         }
         
         return threatLevel;
     }
     
     private updatePlayerPerformanceMetrics(state: GameState): void {
         // Update survival time
         const currentTime = Date.now() - this.gameStartTime;
         this.playerPerformanceMetrics.averageSurvivalTime = 
             (this.playerPerformanceMetrics.averageSurvivalTime + currentTime) / 2;
         
         // Update DPS tracking
         this.playerPerformanceMetrics.damageDealtPerSecond = 
             (this.playerPerformanceMetrics.damageDealtPerSecond + state.playerDPS) / 2;
         
         // Track movement patterns
         const movementPattern = this.categorizeMovement(state);
         if (!this.playerPerformanceMetrics.movementPatterns.includes(movementPattern)) {
             this.playerPerformanceMetrics.movementPatterns.push(movementPattern);
         }
         
         // Track preferred positions
         this.playerPerformanceMetrics.preferredPositions.push({
             x: state.playerPositionX,
             y: state.playerPositionY
         });
         
         // Keep only recent positions
         if (this.playerPerformanceMetrics.preferredPositions.length > 50) {
             this.playerPerformanceMetrics.preferredPositions = 
                 this.playerPerformanceMetrics.preferredPositions.slice(-50);
         }
     }
     
     private categorizeMovement(state: GameState): string {
         if (state.playerMovementDistance < 10) return 'stationary';
         if (state.playerMovementDistance < 50) return 'cautious';
         if (state.playerMovementDistance < 100) return 'moderate';
         return 'aggressive';
     }
     
     private selectStrategicAction(state: GameState, enemySystem: EnemySystem): DirectorAction | null {
         // Evaluate strategic objectives
         const applicableObjectives = this.strategicObjectives.filter(obj => obj.conditions(state));
         
         if (applicableObjectives.length === 0) {
             return null;
         }
         
         // Sort by priority
         applicableObjectives.sort((a, b) => b.priority - a.priority);
         
         // Select action from highest priority objective
         const selectedObjective = applicableObjectives[0];
         const availableActions = selectedObjective.actions.filter(action => {
             // Check if we have budget for this action
             const spawns = this.calculateOptimalSpawns(action, enemySystem);
             return spawns.totalCost <= this.currentBudget;
         });
         
         if (availableActions.length === 0) {
             return null;
         }
         
         // Select best action based on current strategy
        return this.selectActionByStrategy(availableActions);
     }
     
     private selectActionByStrategy(actions: DirectorAction[]): DirectorAction {
         switch (this.adaptiveStrategy) {
             case 'aggressive':
                const aggressiveActions = [DirectorAction.SPAWN_GOLEMS, DirectorAction.SPAWN_SKELETON_VIKINGS];
                 for (const action of aggressiveActions) {
                     if (actions.includes(action)) return action;
                 }
                 break;
                 
             case 'defensive':
                const defensiveActions = [DirectorAction.SPAWN_SKELETON_VIKINGS, DirectorAction.SPAWN_ARCHERS];
                 for (const action of defensiveActions) {
                     if (actions.includes(action)) return action;
                 }
                 break;
                 
             case 'counter':
                 if (this.playerPerformanceMetrics.movementPatterns.includes('stationary')) {
                    const counterStatic = [DirectorAction.SPAWN_ARCHERS, DirectorAction.SPAWN_GNOLLS];
                     for (const action of counterStatic) {
                         if (actions.includes(action)) return action;
                     }
                 }
                 break;
                 
             case 'balanced':
             default:
                 // Mix of different approaches
                 break;
         }
         
         // Default: random selection from available actions
         return actions[Math.floor(Math.random() * actions.length)];
     }
     
     private updateAdaptiveStrategy(state: GameState): void {
         const threatLevel = this.assessThreatLevel(state);
         
         // Adapt strategy based on player performance and threat level
         if (state.playerHealthPercent > 0.8 && state.playerDPS > 150) {
             this.adaptiveStrategy = 'aggressive';
         } else if (state.playerHealthPercent < 0.3 || threatLevel < 0.3) {
             this.adaptiveStrategy = 'defensive';
         } else if (this.detectPlayerPattern(state)) {
             this.adaptiveStrategy = 'counter';
         } else {
             this.adaptiveStrategy = 'balanced';
         }
     }
     
    private async initializeAllModels(): Promise<void> {
        // Initialize models for all difficulty levels
        for (const difficulty of [DifficultyLevel.EASY, DifficultyLevel.MEDIUM, DifficultyLevel.HARD]) {
            this.currentDifficulty = difficulty;
            await this.initializeModel();
            await this.tryLoadSavedModel();
        }
        // Reset to medium difficulty
        this.currentDifficulty = DifficultyLevel.MEDIUM;
     }

    private initializeMetrics(): void {
        this.trainingMetrics = {
            totalEpisodes: 0,
            averageReward: 0,
            explorationRate: this.epsilon,
            lossValue: 0,
            qValueMean: 0,
            trainingTime: 0
        };
        
        this.modelConfig = {
            name: 'Enhanced_AI_Director',
            version: this.modelVersion,
            architecture: 'Double_DQN_with_Prioritized_Replay',
            hyperparameters: {
                learningRate: this.learningRate,
                discountFactor: this.discountFactor,
                epsilon: this.epsilon,
                epsilonDecay: this.epsilonDecay,
                targetUpdateFreq: this.targetUpdateFreq,
                alpha: this.alpha,
                beta: this.beta
            },
            trainingMetrics: this.trainingMetrics,
            createdAt: new Date().toISOString()
        };
    }

    private async initializeModel(): Promise<void> {
        const config = this.difficultyConfigs.get(this.currentDifficulty)!;
        
        // Create enhanced neural network with difficulty-specific architecture
        const modelArchitecture = {
            layers: [
                tf.layers.dense({
                    inputShape: [16], // Enhanced features: playerArchetype(3) + 13 other features = 16
                    units: this.currentDifficulty === DifficultyLevel.HARD ? 512 : 256,
                    activation: 'relu',
                    kernelInitializer: 'heNormal'
                }),
                tf.layers.batchNormalization(),
                tf.layers.dropout({ rate: this.currentDifficulty === DifficultyLevel.EASY ? 0.2 : 0.3 }),
                tf.layers.dense({
                    units: this.currentDifficulty === DifficultyLevel.HARD ? 256 : 128,
                    activation: 'relu',
                    kernelInitializer: 'heNormal'
                }),
                tf.layers.batchNormalization(),
                tf.layers.dropout({ rate: this.currentDifficulty === DifficultyLevel.EASY ? 0.2 : 0.3 }),
                tf.layers.dense({
                    units: this.currentDifficulty === DifficultyLevel.HARD ? 128 : 64,
                    activation: 'relu',
                    kernelInitializer: 'heNormal'
                }),
                tf.layers.dropout({ rate: this.currentDifficulty === DifficultyLevel.EASY ? 0.1 : 0.2 }),
                tf.layers.dense({
                    units: 32,
                    activation: 'relu',
                    kernelInitializer: 'heNormal'
                }),
                tf.layers.dense({
                    units: 6, // Number of possible actions
                    activation: 'linear',
                    kernelInitializer: 'glorotUniform'
                })
            ]
        };

        const mainModel = tf.sequential(modelArchitecture);
        const targetModel = tf.sequential(modelArchitecture);
        
        this.models.set(this.currentDifficulty, mainModel);
        this.targetModels.set(this.currentDifficulty, targetModel);

        const optimizer = tf.train.adam(config.learningRate);
        
        mainModel.compile({
            optimizer: optimizer,
            loss: 'meanSquaredError', // Standard loss for regression
            metrics: ['mae']
        });
        
        targetModel.compile({
            optimizer: optimizer,
            loss: 'meanSquaredError',
            metrics: ['mae']
        });
        
        // Initialize target model with same weights
        await this.updateTargetModel();
    }

    /**
     * Gets the current game state for AI processing
     * @param player - The player archetype instance
     * @param enemySystem - The enemy system instance
     * @returns Current game state object with normalized values
     */
    public getGameState(player: Player, enemySystem: EnemySystem): GameState {
        const currentTime = Date.now();
        const gameTimer = (currentTime - this.gameStartTime) / 1000; // Game time in seconds
        
        // Calculate enhanced metrics
        const healthPercent = player.getHealthPercentage();
        const playerDPS = player.getDPSOverLastTenSeconds();
        const movementDistance = player.getMovementDistanceLastTenSeconds();
        
        // Calculate difficulty level based on game progression
        const difficultyLevel = Math.min(gameTimer / 180, 1); // Ramp up over 3 minutes
        
        // Calculate player stress level (low health + high enemy count)
        const totalEnemies = enemySystem.getEnemyCount();
        const playerStressLevel = Math.min((1 - healthPercent) * 0.7 + (totalEnemies / 50) * 0.3, 1);
        
        // Calculate engagement score (movement + damage dealing)
        const engagementScore = Math.min(
            (Math.min(movementDistance / 500, 1) * 0.4) + 
            (Math.min(playerDPS / 100, 1) * 0.6), 1
        );

        return {
            playerArchetype: player.getArchetypeVector(),
            playerHealthPercent: healthPercent,
            playerDPS: Math.min(playerDPS / 100, 1), // Normalize
            playerPositionX: (player.position.x - player.getScene().physics.world.bounds.x) / player.getScene().physics.world.bounds.width, // Normalize to 0-1 using actual world bounds
            playerPositionY: (player.position.y - player.getScene().physics.world.bounds.y) / player.getScene().physics.world.bounds.height, // Normalize to 0-1 using actual world bounds
            damageTakenRecently: Math.min(player.getDamageTakenRecently() / 50, 1),
            playerMovementDistance: Math.min(movementDistance / 1000, 1), // Normalize
            resourceGeneration: Math.min(player.getXPGenerationRate() / 10, 1), // Normalize
            gameTimer: Math.min(gameTimer / 300, 1), // Normalize to 5 minutes max
            enemyCountSkeletonVikings: Math.min(enemySystem.getEnemyCountByType(EnemyType.SKELETON_VIKING) / 10, 1),
            enemyCountGolems: Math.min(enemySystem.getEnemyCountByType(EnemyType.GOLEM) / 8, 1),
            enemyCountArchers: Math.min(enemySystem.getEnemyCountByType(EnemyType.ARCHER) / 15, 1),
            enemyCountGnolls: Math.min(enemySystem.getEnemyCountByType(EnemyType.GNOLL) / 20, 1),
            difficultyLevel: difficultyLevel,
            playerStressLevel: playerStressLevel,
            engagementScore: engagementScore
        };
    }

    private gameStateToTensor(state: GameState): tf.Tensor2D {
        const stateArray = [
            ...state.playerArchetype, // 3 elements
            state.playerHealthPercent,
            state.playerDPS,
            state.playerPositionX,
            state.playerPositionY,
            state.damageTakenRecently,
            state.playerMovementDistance,
            state.resourceGeneration,
            state.gameTimer,
            state.enemyCountSkeletonVikings,
            state.enemyCountGolems,
            state.enemyCountArchers,
            state.enemyCountGnolls,
            state.difficultyLevel,
            state.playerStressLevel,
            state.engagementScore
        ];
        
        // Debug: Check array length
        if (stateArray.length !== 16) {
            console.warn(`Expected 16 features, got ${stateArray.length}:`, stateArray);
            // Ensure exactly 16 features
            while (stateArray.length < 16) stateArray.push(0);
            if (stateArray.length > 16) stateArray.splice(16);
        }
        
        return tf.tensor2d([stateArray]);
    }
    
    private async updateTargetModel(): Promise<void> {
        const currentModel = this.models.get(this.currentDifficulty);
        const currentTargetModel = this.targetModels.get(this.currentDifficulty);
        
        if (!currentModel || !currentTargetModel) return;
        
        const weights = currentModel.getWeights();
        currentTargetModel.setWeights(weights);
    }
    
    private async tryLoadSavedModel(): Promise<void> {
        try {
            const savedModel = localStorage.getItem('ai_director_model');
            const savedConfig = localStorage.getItem('ai_director_config');
            
            if (savedModel && savedConfig) {
                const config = JSON.parse(savedConfig);
                
                // Load model from IndexedDB or localStorage
                this.model = await tf.loadLayersModel('indexeddb://ai-director-model');
                this.targetModel = await tf.loadLayersModel('indexeddb://ai-director-target-model');
                
                this.modelConfig = config;
                this.trainingMetrics = config.trainingMetrics;
                
                console.log('Loaded saved AI Director model:', config.version);
            }
        } catch (error) {
            console.log('No saved model found or failed to load, using new model');
        }
    }

    public async chooseAction(gameState: GameState, enemySystem?: EnemySystem): Promise<DirectorAction> {
        try {
            const currentModel = this.models.get(this.currentDifficulty);
            if (!currentModel) {
                return DirectorAction.DO_NOTHING;
            }

            const config = this.difficultyConfigs.get(this.currentDifficulty)!;
            
            // Update tactical analysis
            this.updatePlayerPerformanceMetrics(gameState);
            this.updateAdaptiveStrategy(gameState);
            
            // Try strategic action selection first
            if (enemySystem) {
                const strategicAction = this.selectStrategicAction(gameState, enemySystem);
                if (strategicAction !== null) {
                    // Update threat assessment history with chosen action
                    if (this.threatAssessmentHistory.length > 0) {
                        this.threatAssessmentHistory[this.threatAssessmentHistory.length - 1].response = strategicAction;
                    }
                    
                    // Store tactical memory
                    this.tacticalMemory.push({
                        gameState: { ...gameState },
                        action: strategicAction,
                        outcome: 0 // Will be updated later with reward
                    });
                    
                    // Keep tactical memory size manageable
                    if (this.tacticalMemory.length > 1000) {
                        this.tacticalMemory = this.tacticalMemory.slice(-1000);
                    }
                    
                    return strategicAction;
                }
            }
            
            // Difficulty-specific epsilon-greedy action selection
            const currentEpsilon = Math.max(this.epsilonMin, config.epsilon * Math.pow(config.epsilonDecay, this.trainSteps));
            
            if (this.trainingMode && Math.random() < currentEpsilon) {
                // Random action (exploration)
                let action: DirectorAction;
                if (this.currentDifficulty === DifficultyLevel.HARD && Math.random() < config.aggressiveness) {
                    const aggressiveActions = [DirectorAction.SPAWN_GOLEMS, DirectorAction.SPAWN_GNOLLS, DirectorAction.INCREASE_SPAWN_RATE];
                    action = aggressiveActions[Math.floor(Math.random() * aggressiveActions.length)];
                } else if (this.currentDifficulty === DifficultyLevel.EASY && Math.random() < (1 - config.aggressiveness)) {
                    const passiveActions = [DirectorAction.DO_NOTHING, DirectorAction.SPAWN_ARCHERS];
                    action = passiveActions[Math.floor(Math.random() * passiveActions.length)];
                } else {
                    action = Math.floor(Math.random() * 6) as DirectorAction;
                }
                console.log(`AI Director: Random exploration - chose action ${DirectorAction[action]} (${action})`);
                return action;
            }

            // Use the model to predict the best action
            const stateTensor = this.gameStateToTensor(gameState);
            const prediction = currentModel.predict(stateTensor) as tf.Tensor;
            const actionValues = await prediction.data();
            
            // Store Q-values for metrics
            this.qValues.push(...Array.from(actionValues));
            if (this.qValues.length > 1000) {
                this.qValues = this.qValues.slice(-1000); // Keep last 1000 values
            }
            
            stateTensor.dispose();
            prediction.dispose();

            // Choose action with highest Q-value
            let bestAction = 0;
            let bestValue = actionValues[0];
            for (let i = 1; i < actionValues.length && i < 6; i++) { // Limit to 6 actions
                if (actionValues[i] > bestValue) {
                    bestValue = actionValues[i];
                    bestAction = i;
                }
            }
            
            // Clamp action to valid range (0-5)
            bestAction = Math.min(bestAction, 5);
            
            console.log(`AI Director: Model prediction - chose action ${DirectorAction[bestAction]} (${bestAction}), Q-value: ${bestValue.toFixed(3)}, actionValues length: ${actionValues.length}`);
            
            // Decay epsilon
            if (this.trainingMode && this.epsilon > this.epsilonMin) {
                this.epsilon *= this.epsilonDecay;
                this.trainingMetrics.explorationRate = this.epsilon;
            }

            return bestAction as DirectorAction;
        } catch (error) {
            console.warn('AI Director chooseAction failed:', error);
            // Fallback to random action if model fails
            return Math.floor(Math.random() * 6) as DirectorAction;
        }
    }

    public executeAction(action: DirectorAction, enemySystem: EnemySystem): void {
        this.updateBudget();
        
        // Calculate optimal spawn counts based on budget and enemy costs
        const spawnPlans = this.calculateOptimalSpawns(action, enemySystem);
        
        if (spawnPlans.totalCost <= this.currentBudget) {
            // Execute the spawn plan
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
                case DirectorAction.SPAWN_GOLEMS:
                    if (spawnPlans.golems > 0) {
                        enemySystem.spawnWave(EnemyType.GOLEM, spawnPlans.golems, 'near_player');
                        this.spendBudget(spawnPlans.golemCost);
                    }
                    break;
                case DirectorAction.INCREASE_SPAWN_RATE:
                    enemySystem.increaseSpawnRate(10);
                    this.budgetEfficiencyBonus = Math.min(this.budgetEfficiencyBonus + 0.1, 2.0);
                    break;
                case DirectorAction.DO_NOTHING:
                    break;
            }
        } else {
            // Not enough budget - consider emergency spending or wait
            if (this.shouldUseEmergencyBudget(enemySystem)) {
                this.activateEmergencyBudget();
                this.executeAction(action, enemySystem); // Retry with emergency budget
            }
        }
    }

    public calculateReward(previousState: GameState, currentState: GameState): number {
        let reward = 0;

        // Enhanced reward system based on engagement and difficulty balance
        const config = this.difficultyConfigs.get(this.currentDifficulty)!;
        
        // Difficulty-specific optimal stress levels
        let optimalStress: number;
        switch (this.currentDifficulty) {
            case DifficultyLevel.EASY:
                optimalStress = 0.4; // Lower stress for easy mode
                break;
            case DifficultyLevel.HARD:
                optimalStress = 0.8; // Higher stress for hard mode
                break;
            default:
                optimalStress = 0.6; // Medium stress for normal mode
        }
        
        // Reward for optimal stress level (challenging but not overwhelming)
        const stressDiff = Math.abs(currentState.playerStressLevel - optimalStress);
        reward += (1 - stressDiff) * 15 * config.rewardMultiplier; // Max 15 points for optimal stress
        
        // Reward for high engagement score
        reward += currentState.engagementScore * 10 * config.rewardMultiplier;
        
        // Difficulty-specific health thresholds
        const dangerZoneMin = this.currentDifficulty === DifficultyLevel.EASY ? 0.3 : 0.2;
        const dangerZoneMax = this.currentDifficulty === DifficultyLevel.HARD ? 0.6 : 0.7;
        const safeZoneThreshold = this.currentDifficulty === DifficultyLevel.EASY ? 0.8 : 0.9;
        
        // Reward for maintaining health in danger zone (exciting gameplay)
        if (currentState.playerHealthPercent > dangerZoneMin && currentState.playerHealthPercent < dangerZoneMax) {
            reward += 8 * config.rewardMultiplier;
        }
        
        // Penalty for player being too safe (boring)
        if (currentState.playerHealthPercent > safeZoneThreshold) {
            reward -= 10 * config.aggressiveness;
        }
        
        // Penalty for player being overwhelmed (too difficult)
        const overwhelmedThreshold = this.currentDifficulty === DifficultyLevel.HARD ? 0.9 : 0.8;
        if (currentState.playerStressLevel > overwhelmedThreshold) {
            reward -= 8 * config.rewardMultiplier;
        }
        
        // Large penalty if player dies (scaled by difficulty)
        if (currentState.playerHealthPercent === 0) {
            reward -= 100 * config.rewardMultiplier;
        }
        
        // Reward for forcing movement (anti-camping)
        const movementIncrease = currentState.playerMovementDistance - previousState.playerMovementDistance;
        
        // Update tactical outcome for strategic learning
        this.updateTacticalOutcome(reward);
        if (movementIncrease > 0.05) {
            reward += movementIncrease * 20 * config.rewardMultiplier;
        }
        
        // Reward for appropriate difficulty scaling
        const expectedDifficulty = currentState.difficultyLevel;
        const actualDifficulty = currentState.playerStressLevel;
        const difficultyBalance = 1 - Math.abs(expectedDifficulty - actualDifficulty);
        reward += difficultyBalance * 5 * config.rewardMultiplier;
        
        // Bonus for sustained engagement over time
        if (currentState.gameTimer > 60 && currentState.engagementScore > 0.5) {
            reward += 3 * config.rewardMultiplier;
        }

        return reward;
    }

    public async update(player: Player, enemySystem: EnemySystem): Promise<void> {
        const currentTime = Date.now();
        
        // Only take action every few seconds
        if (currentTime - this.lastActionTime < this.actionInterval) {
            return;
        }

        const currentState = this.getGameState(player, enemySystem);
        
        // Choose and execute action
        const action = await this.chooseAction(currentState, enemySystem);
        this.executeAction(action, enemySystem);
        
        // Store for training with prioritized experience replay
        if (this.stateHistory.length > 0) {
            const previousState = this.stateHistory[this.stateHistory.length - 1];
            const reward = this.calculateReward(previousState, currentState);
            const done = player.currentHealth <= 0;
            
            // Calculate initial priority (TD error approximation)
            const priority = Math.abs(reward) + 0.01; // Small constant to ensure non-zero priority
            
            this.replayBuffer.push({
                state: previousState,
                action: this.actionHistory[this.actionHistory.length - 1],
                reward: reward,
                nextState: currentState,
                done: done,
                priority: priority,
                tdError: 0 // Will be updated during training
            });
            
            // Track episode rewards
            this.episodeRewards.push(reward);
            if (this.episodeRewards.length > 1000) {
                this.episodeRewards = this.episodeRewards.slice(-1000);
            }
            
            // Limit replay buffer size
            if (this.replayBuffer.length > this.maxReplayBufferSize) {
                this.replayBuffer.shift();
            }
            
            // Update metrics
            this.trainingMetrics.averageReward = this.episodeRewards.reduce((a, b) => a + b, 0) / this.episodeRewards.length;
            this.trainingMetrics.qValueMean = this.qValues.length > 0 ? this.qValues.reduce((a, b) => a + b, 0) / this.qValues.length : 0;
        }
        
        this.stateHistory.push(currentState);
        this.actionHistory.push(action);
        this.lastActionTime = currentTime;
        
        // Train the model periodically
        if (this.trainingMode && this.replayBuffer.length >= 64) {
            await this.trainModelEnhanced();
            this.trainSteps++;
            
            // Update target network periodically
            if (this.trainSteps % this.targetUpdateFreq === 0) {
                await this.updateTargetModel();
            }
            
            // Auto-save model periodically
            if (this.trainSteps % this.autoSaveInterval === 0) {
                await this.autoSaveModel();
            }
        }
        
        // Update training metrics
        this.trainingMetrics.totalEpisodes = this.trainSteps;
        this.trainingMetrics.explorationRate = this.epsilon;
        
        // Adaptive difficulty monitoring and adjustment
        if (this.adaptiveDifficultyEnabled) {
            const performance = this.calculatePlayerPerformance(currentState);
            this.updatePerformanceWindow(performance);
            
            if (this.shouldAdjustDifficulty()) {
                this.adjustDifficultyBasedOnPerformance();
            }
        }
    }

    private async trainModelEnhanced(): Promise<void> {
        const currentModel = this.models.get(this.currentDifficulty);
        const currentTargetModel = this.targetModels.get(this.currentDifficulty);
        
        if (!currentModel || !currentTargetModel || this.replayBuffer.length < 64) return;

        const startTime = Date.now();
        const batchSize = Math.min(64, this.replayBuffer.length);
        
        // Prioritized sampling
        const batch = this.samplePrioritizedBatch(batchSize);
        
        // Prepare training data
        const states = batch.map(exp => this.gameStateToTensor(exp.experience.state));
        const nextStates = batch.map(exp => this.gameStateToTensor(exp.experience.nextState));
        
        const statesBatch = tf.concat(states);
        const nextStatesBatch = tf.concat(nextStates);
        
        // Double DQN: Use main network to select actions, target network to evaluate
        const currentQValues = currentModel.predict(statesBatch) as tf.Tensor;
        const nextQValuesMain = currentModel.predict(nextStatesBatch) as tf.Tensor;
        const nextQValuesTarget = currentTargetModel.predict(nextStatesBatch) as tf.Tensor;
        
        const currentQData = await currentQValues.data();
        const nextQMainData = await nextQValuesMain.data();
        const nextQTargetData = await nextQValuesTarget.data();
        
        // Update Q-values using Double DQN
        const updatedQValues = new Float32Array(currentQData);
        const tdErrors: number[] = [];
        
        for (let i = 0; i < batch.length; i++) {
            const experience = batch[i].experience;
            const actionIndex = experience.action;
            const reward = experience.reward;
            
            let targetValue = reward;
            if (!experience.done) {
                // Double DQN: Select action with main network, evaluate with target network
                const nextQMain = Array.from(nextQMainData.slice(i * 6, (i + 1) * 6));
                const bestNextAction = nextQMain.indexOf(Math.max(...nextQMain));
                const nextQTarget = Array.from(nextQTargetData.slice(i * 6, (i + 1) * 6));
                targetValue += this.discountFactor * nextQTarget[bestNextAction];
            }
            
            const currentQ = currentQData[i * 6 + actionIndex];
            const tdError = Math.abs(targetValue - currentQ);
            tdErrors.push(tdError);
            
            updatedQValues[i * 6 + actionIndex] = targetValue;
        }
        
        // Update priorities in replay buffer
        for (let i = 0; i < batch.length; i++) {
            const bufferIndex = batch[i].index;
            this.replayBuffer[bufferIndex].tdError = tdErrors[i];
            this.replayBuffer[bufferIndex].priority = Math.pow(tdErrors[i] + 0.01, this.alpha);
        }
        
        // Importance sampling weights
        const maxWeight = Math.max(...batch.map(b => b.weight));
        const weights = batch.map(b => b.weight / maxWeight);
        const weightsTensor = tf.tensor1d(weights);
        
        const targetTensor = tf.tensor2d(Array.from(updatedQValues), [batchSize, 6]);
        
        // Train the model with importance sampling
        const history = await currentModel.fit(statesBatch, targetTensor, {
            epochs: 1,
            verbose: 0,
            sampleWeight: weightsTensor
        });
        
        // Update training metrics
        const loss = Array.isArray(history.history.loss) ? history.history.loss[0] : history.history.loss;
        this.recentLosses.push(loss as number);
        if (this.recentLosses.length > 100) {
            this.recentLosses = this.recentLosses.slice(-100);
        }
        this.trainingMetrics.lossValue = this.recentLosses.reduce((a, b) => a + b, 0) / this.recentLosses.length;
        this.trainingMetrics.trainingTime += Date.now() - startTime;
        
        // Update beta for importance sampling
        this.beta = Math.min(1.0, this.beta + this.betaIncrement);
        
        // Clean up tensors
        states.forEach(tensor => tensor.dispose());
        nextStates.forEach(tensor => tensor.dispose());
        statesBatch.dispose();
        nextStatesBatch.dispose();
        currentQValues.dispose();
        nextQValuesMain.dispose();
        nextQValuesTarget.dispose();
        targetTensor.dispose();
        weightsTensor.dispose();
    }
    
    private samplePrioritizedBatch(batchSize: number): Array<{experience: any, index: number, weight: number}> {
        // Calculate total priority
        const totalPriority = this.replayBuffer.reduce((sum, exp) => sum + exp.priority, 0);
        
        const batch = [];
        const segment = totalPriority / batchSize;
        
        for (let i = 0; i < batchSize; i++) {
            const a = segment * i;
            const b = segment * (i + 1);
            const value = Math.random() * (b - a) + a;
            
            let cumulativePriority = 0;
            for (let j = 0; j < this.replayBuffer.length; j++) {
                cumulativePriority += this.replayBuffer[j].priority;
                if (cumulativePriority >= value) {
                    const probability = this.replayBuffer[j].priority / totalPriority;
                    const weight = Math.pow(this.replayBuffer.length * probability, -this.beta);
                    
                    batch.push({
                        experience: this.replayBuffer[j],
                        index: j,
                        weight: weight
                    });
                    break;
                }
            }
        }
        
        return batch;
    }

    /**
     * Sets the training mode for the AI Director
     * @param training - Whether to enable training mode
     */
    public setTrainingMode(training: boolean): void {
        this.trainingMode = training;
    }

    /**
     * Gets the current training mode status
     * @returns True if training mode is enabled, false otherwise
     */
    public isTraining(): boolean {
        return this.trainingMode;
    }

    public setDifficulty(difficulty: DifficultyLevel): void {
        const oldDifficulty = this.currentDifficulty;
        this.currentDifficulty = difficulty;
        const config = this.difficultyConfigs.get(difficulty)!;
        
        // Update action interval based on difficulty
        this.actionInterval = config.actionInterval;
        
        // Reset epsilon for new difficulty
        this.epsilon = config.epsilon;
        
        console.log(`AI Director difficulty changed from ${this.difficultyConfigs.get(oldDifficulty)?.name} to ${config.name}`);
        
        // If model doesn't exist for this difficulty, initialize it
        if (!this.models.has(difficulty)) {
            this.initializeModel().catch(error => {
                console.error(`Failed to initialize model for ${config.name} difficulty:`, error);
            });
        }
    }

    public getCurrentDifficulty(): DifficultyLevel {
        return this.currentDifficulty;
    }

    public getDifficultyConfig(difficulty?: DifficultyLevel): DifficultyConfig {
        const targetDifficulty = difficulty || this.currentDifficulty;
        return { ...this.difficultyConfigs.get(targetDifficulty)! };
    }

    /**
     * Gets all difficulty configurations
     * @returns Map containing all difficulty level configurations
     */
    public getAllDifficultyConfigs(): Map<DifficultyLevel, DifficultyConfig> {
        return this.difficultyConfigs;
    }
    
    /**
     * Cycles through difficulty levels in order (Easy -> Medium -> Hard -> Easy)
     */
    public cycleDifficulty(): void {
        const difficulties = [DifficultyLevel.EASY, DifficultyLevel.MEDIUM, DifficultyLevel.HARD];
        const currentIndex = difficulties.indexOf(this.currentDifficulty);
        const nextIndex = (currentIndex + 1) % difficulties.length;
        this.setDifficulty(difficulties[nextIndex]);
    }
    
    public getDifficultyStats(): string {
        const stats = [];
        for (const [difficulty, config] of this.difficultyConfigs.entries()) {
            const model = this.models.get(difficulty);
            const status = model ? 'Ready' : 'Not Loaded';
            const current = difficulty === this.currentDifficulty ? ' (Current)' : '';
            stats.push(`${config.name}: ${status}${current}`);
        }
        return stats.join(' | ');
    }



    public getReplayBufferSize(): number {
        return this.replayBuffer.length;
    }

    public resetGame(): void {
        this.gameStartTime = Date.now();
        this.lastActionTime = 0;
        this.stateHistory = [];
        this.actionHistory = [];
    }

    public getTrainingStatus(): string {
        const status = [];
        status.push(`Training: ${this.trainingMode ? 'ON' : 'OFF'}`);
        status.push(`Difficulty: ${this.difficultyConfigs.get(this.currentDifficulty)?.name || 'Unknown'}`);
        
        const currentModel = this.models.get(this.currentDifficulty);
        status.push(`Model: ${currentModel ? 'Loaded' : 'Not Loaded'}`);
        
        const config = this.difficultyConfigs.get(this.currentDifficulty);
        if (config) {
            status.push(`ε: ${config.epsilon.toFixed(3)}`);
        }
        
        const bufferFill = (this.replayBuffer.length / this.maxReplayBufferSize * 100).toFixed(1);
        status.push(`Buffer: ${bufferFill}%`);
        status.push(`Steps: ${this.trainSteps}`);
        
        if (this.recentLosses.length > 0) {
            const avgLoss = this.recentLosses.reduce((a, b) => a + b, 0) / this.recentLosses.length;
            status.push(`Loss: ${avgLoss.toFixed(4)}`);
        }
        
        const avgReward = this.trainingMetrics.averageReward.toFixed(2);
        status.push(`Avg Reward: ${avgReward}`);
        
        return status.join(' | ');
    }
    
    // Model persistence methods
    public async saveModel(modelName?: string): Promise<boolean> {
        try {
            const name = modelName || `ai-director-model-v${this.modelVersion}`;
            
            // Update model config before saving
            this.modelConfig.version = this.modelVersion;
            this.modelConfig.trainingMetrics = { ...this.trainingMetrics };
            this.modelConfig.createdAt = new Date().toISOString();
            
            // Save models for all difficulty levels
            for (const [difficulty, model] of this.models.entries()) {
                if (model) {
                    const difficultyName = this.difficultyConfigs.get(difficulty)!.name.toLowerCase();
                    const mainModelUrl = `indexeddb://${name}-${difficultyName}`;
                    await model.save(mainModelUrl);
                    
                    const targetModel = this.targetModels.get(difficulty);
                    if (targetModel) {
                        const targetModelUrl = `indexeddb://${name}-${difficultyName}-target`;
                        await targetModel.save(targetModelUrl);
                    }
                }
            }
            
            // Save model configuration and training data
            await this.saveModelMetadata(name);
            
            console.log(`All difficulty models saved successfully as: ${name}`);
            return true;
        } catch (error) {
            console.error('Failed to save models:', error);
            return false;
        }
    }
    
    public async loadModel(modelName: string): Promise<boolean> {
        try {
            // Load models for all difficulty levels
            for (const [difficulty, config] of this.difficultyConfigs.entries()) {
                const difficultyName = config.name.toLowerCase();
                const mainModelUrl = `indexeddb://${modelName}-${difficultyName}`;
                
                try {
                    // Load the main model
                    const model = await tf.loadLayersModel(mainModelUrl);
                    this.models.set(difficulty, model);
                    
                    // Try to load the target model
                    try {
                        const targetModelUrl = `indexeddb://${modelName}-${difficultyName}-target`;
                        const targetModel = await tf.loadLayersModel(targetModelUrl);
                        this.targetModels.set(difficulty, targetModel);
                    } catch {
                        // If target model doesn't exist, create a copy of the main model
                        const targetModel = tf.sequential();
                        for (const layer of model.layers) {
                            targetModel.add(layer);
                        }
                        targetModel.compile({
                            optimizer: tf.train.adam(config.learningRate),
                            loss: 'meanSquaredError',
                            metrics: ['mae']
                        });
                        this.targetModels.set(difficulty, targetModel);
                    }
                } catch (error) {
                    console.warn(`Failed to load model for ${difficultyName} difficulty:`, error);
                    // Initialize new model for this difficulty if loading fails
                    const originalDifficulty = this.currentDifficulty;
                    this.currentDifficulty = difficulty;
                    await this.initializeModel();
                    this.currentDifficulty = originalDifficulty;
                }
            }
            
            // Load model metadata
            await this.loadModelMetadata(modelName);
            
            console.log(`Models loaded successfully: ${modelName}`);
            return true;
        } catch (error) {
            console.error('Failed to load models:', error);
            return false;
        }
    }
    
    /**
     * Lists all saved AI Director models
     * @returns Promise resolving to array of saved model names
     */
    public async listSavedModels(): Promise<string[]> {
        try {
            const models = await tf.io.listModels();
            return Object.keys(models)
                .filter(key => key.includes('ai-director-model'))
                .map(key => key.replace('indexeddb://', ''));
        } catch (error) {
            console.error('Failed to list models:', error);
            return [];
        }
    }
    
    /**
     * Deletes a saved AI Director model and its metadata
     * @param modelName - Name of the model to delete
     * @returns Promise resolving to true if deletion was successful, false otherwise
     */
    public async deleteModel(modelName: string): Promise<boolean> {
        try {
            // Delete models for all difficulty levels
            for (const [, config] of this.difficultyConfigs.entries()) {
                const difficultyName = config.name.toLowerCase();
                
                try {
                    await tf.io.removeModel(`indexeddb://${modelName}-${difficultyName}`);
                    await tf.io.removeModel(`indexeddb://${modelName}-${difficultyName}-target`);
                } catch (error) {
                    console.warn(`Failed to delete ${difficultyName} model:`, error);
                }
            }
            
            // Remove metadata
            if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.removeItem(`ai-director-metadata-${modelName}`);
            }
            
            console.log(`All difficulty models deleted successfully: ${modelName}`);
            return true;
        } catch (error) {
            console.error('Failed to delete models:', error);
            return false;
        }
    }
    
    private async saveModelMetadata(modelName: string): Promise<void> {
        const metadata = {
            modelConfig: this.modelConfig,
            trainingMetrics: this.trainingMetrics,
            hyperparameters: {
                learningRate: this.learningRate,
                discountFactor: this.discountFactor,
                epsilon: this.epsilon,
                epsilonDecay: this.epsilonDecay,
                epsilonMin: this.epsilonMin,
                alpha: this.alpha,
                beta: this.beta,
                targetUpdateFreq: this.targetUpdateFreq
            },
            replayBufferSize: this.replayBuffer.length,
            modelVersion: this.modelVersion
        };
        
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(`ai-director-metadata-${modelName}`, JSON.stringify(metadata));
        }
    }
    
    private async loadModelMetadata(modelName: string): Promise<void> {
        if (typeof window !== 'undefined' && window.localStorage) {
            const metadataStr = localStorage.getItem(`ai-director-metadata-${modelName}`);
            if (metadataStr) {
                const metadata = JSON.parse(metadataStr);
                this.modelConfig = metadata.modelConfig || this.modelConfig;
                this.trainingMetrics = metadata.trainingMetrics || this.trainingMetrics;
                this.modelVersion = metadata.modelVersion || this.modelVersion;
                
                // Restore hyperparameters
                if (metadata.hyperparameters) {
                    this.learningRate = metadata.hyperparameters.learningRate || this.learningRate;
                    this.epsilon = metadata.hyperparameters.epsilon || this.epsilon;
                    this.alpha = metadata.hyperparameters.alpha || this.alpha;
                    this.beta = metadata.hyperparameters.beta || this.beta;
                }
            }
        }
    }
    
    // Training data export functionality
    public exportTrainingData(): any {
        return {
            modelConfig: this.modelConfig,
            trainingMetrics: this.trainingMetrics,
            replayBuffer: this.replayBuffer.slice(-1000), // Export last 1000 experiences
            hyperparameters: {
                learningRate: this.learningRate,
                discountFactor: this.discountFactor,
                epsilon: this.epsilon,
                epsilonDecay: this.epsilonDecay,
                epsilonMin: this.epsilonMin,
                alpha: this.alpha,
                beta: this.beta,
                targetUpdateFreq: this.targetUpdateFreq
            },
            episodeRewards: this.episodeRewards,
            recentLosses: this.recentLosses,
            exportedAt: new Date().toISOString()
        };
    }
    
    public getTrainingMetrics(): TrainingMetrics {
        return { ...this.trainingMetrics };
    }
    
    public getModelConfig(): ModelConfig {
        return { ...this.modelConfig };
    }

    private async autoSaveModel(): Promise<void> {
        const currentTime = Date.now();
        if (currentTime - this.lastSaveTime > this.autoSaveInterval) {
            await this.saveModel(`ai-director-autosave-${Date.now()}`);
            this.lastSaveTime = currentTime;
        }
    }

    // Budget Management Methods
    private updateBudget(): void {
        const currentTime = Date.now();
        const deltaTime = (currentTime - this.lastBudgetUpdate) / 1000; // Convert to seconds
        
        if (deltaTime > 0) {
            const regenAmount = this.budgetRegenRate * deltaTime * this.budgetEfficiencyBonus;
            this.currentBudget = Math.min(this.currentBudget + regenAmount, this.maxBudget);
            this.lastBudgetUpdate = currentTime;
            
            // Track budget history
            this.budgetHistory.push({
                time: currentTime,
                budget: this.currentBudget,
                spent: 0
            });
            
            // Keep only last 100 entries
            if (this.budgetHistory.length > 100) {
                this.budgetHistory = this.budgetHistory.slice(-100);
            }
        }
    }
    
    private spendBudget(amount: number): boolean {
        if (this.currentBudget >= amount) {
            this.currentBudget -= amount;
            
            // Update last budget history entry with spent amount
            if (this.budgetHistory.length > 0) {
                this.budgetHistory[this.budgetHistory.length - 1].spent += amount;
            }
            
            return true;
        }
        return false;
    }
    
    private calculateOptimalSpawns(action: DirectorAction, enemySystem: EnemySystem): {
        skeletonVikings: number;
        archers: number;
        gnolls: number;
        golems: number;
        skeletonVikingCost: number;
        archerCost: number;
        gnollCost: number;
        golemCost: number;
         totalCost: number;
     } {
         const enemyCosts = {
            skeletonViking: 50,
            archer: 30,
            gnoll: 20,
            golem: 100
        };
       
         const currentEnemies = {
            skeletonVikings: enemySystem.getEnemyCountByType(EnemyType.SKELETON_VIKING),
            archers: enemySystem.getEnemyCountByType(EnemyType.ARCHER),
            gnolls: enemySystem.getEnemyCountByType(EnemyType.GNOLL),
            golems: enemySystem.getEnemyCountByType(EnemyType.GOLEM)
        };
        
         const maxSpawns = {
            skeletonVikings: Math.min(Math.floor(this.currentBudget / enemyCosts.skeletonViking), Math.max(0, 8 - currentEnemies.skeletonVikings)),
            archers: Math.min(Math.floor(this.currentBudget / enemyCosts.archer), Math.max(0, 12 - currentEnemies.archers)),
            gnolls: Math.min(Math.floor(this.currentBudget / enemyCosts.gnoll), Math.max(0, 15 - currentEnemies.gnolls)),
            golems: Math.min(Math.floor(this.currentBudget / enemyCosts.golem), Math.max(0, 4 - currentEnemies.golems))
         };
        
        let spawns = { skeletonVikings: 0, archers: 0, gnolls: 0, golems: 0 };
         
         switch (action) {
            case DirectorAction.SPAWN_SKELETON_VIKINGS:
                spawns.skeletonVikings = Math.min(3, maxSpawns.skeletonVikings);
                 break;
            case DirectorAction.SPAWN_ARCHERS:
                spawns.archers = Math.min(5, maxSpawns.archers);
                 break;
            case DirectorAction.SPAWN_GNOLLS:
                spawns.gnolls = Math.min(8, maxSpawns.gnolls);
                 break;
            case DirectorAction.SPAWN_GOLEMS:
                spawns.golems = Math.min(2, maxSpawns.golems);
                 break;
         }
        
         const costs = {
            skeletonVikingCost: spawns.skeletonVikings * enemyCosts.skeletonViking,
            archerCost: spawns.archers * enemyCosts.archer,
            gnollCost: spawns.gnolls * enemyCosts.gnoll,
            golemCost: spawns.golems * enemyCosts.golem
         };
         
         return {
             ...spawns,
             ...costs,
            totalCost: costs.skeletonVikingCost + costs.archerCost + costs.gnollCost + costs.golemCost
         };
    }
    
    private shouldUseEmergencyBudget(enemySystem: EnemySystem): boolean {
        // Use emergency budget if player is doing too well (low stress, high health)
        const totalEnemies = enemySystem.getEnemyCount();
        const lowEnemyCount = totalEnemies < 5;
        const budgetStarved = this.currentBudget < (this.maxBudget * 0.1);
        
        return lowEnemyCount && budgetStarved && this.emergencyBudgetMultiplier === 1.0;
    }
    
    private activateEmergencyBudget(): void {
        this.emergencyBudgetMultiplier = 2.0;
        this.currentBudget *= this.emergencyBudgetMultiplier;
        
        console.log('Emergency budget activated! Current budget:', this.currentBudget);
        
        // Reset emergency budget after some time
        setTimeout(() => {
            this.emergencyBudgetMultiplier = 1.0;
        }, 30000); // 30 seconds
    }
    
    public getBudgetStatus(): string {
        const budgetPercent = (this.currentBudget / this.maxBudget * 100).toFixed(1);
        const regenRate = (this.budgetRegenRate * this.budgetEfficiencyBonus).toFixed(1);
        const emergency = this.emergencyBudgetMultiplier > 1.0 ? ' (EMERGENCY)' : '';
        
        return `Budget: ${this.currentBudget.toFixed(0)}/${this.maxBudget} (${budgetPercent}%) | Regen: ${regenRate}/s${emergency}`;
    }
    
    public getCurrentBudget(): number {
        return this.currentBudget;
    }
    
    public getMaxBudget(): number {
        return this.maxBudget;
    }
    
    public getBudgetHistory(): Array<{time: number, budget: number, spent: number}> {
        return this.budgetHistory;
    }
    
    // Tactical decision-making information methods
    public getTacticalStatus(): string {
        const recentActions = this.tacticalMemory.slice(-10);
        const avgOutcome = recentActions.length > 0 ? 
            recentActions.reduce((sum, mem) => sum + mem.outcome, 0) / recentActions.length : 0;
        
        return `Strategy: ${this.adaptiveStrategy.toUpperCase()} | ` +
               `Threat Level: ${this.threatAssessmentHistory.length > 0 ? 
                   this.threatAssessmentHistory[this.threatAssessmentHistory.length - 1].threat.toFixed(2) : '0.00'} | ` +
               `Tactical Memory: ${this.tacticalMemory.length} | ` +
               `Avg Outcome: ${avgOutcome.toFixed(2)}`;
    }
    
    public getAdaptiveStrategy(): string {
        return this.adaptiveStrategy;
    }
    
    public getPlayerPerformanceMetrics(): any {
        return { ...this.playerPerformanceMetrics };
    }
    
    public getThreatAssessmentHistory(): Array<{time: number, threat: number, response: DirectorAction}> {
        return [...this.threatAssessmentHistory];
    }
    
    public updateTacticalOutcome(reward: number): void {
        // Update the most recent tactical memory with the outcome
        if (this.tacticalMemory.length > 0) {
            this.tacticalMemory[this.tacticalMemory.length - 1].outcome = reward;
        }
    }
    
    public getStrategicObjectivesStatus(): string {
        const activeObjectives = this.strategicObjectives.filter(obj => {
            // We need a dummy state to test conditions, using last known state
            if (this.stateHistory.length === 0) return false;
            const lastState = this.stateHistory[this.stateHistory.length - 1];
            return obj.conditions(lastState);
        });
        
        return `Active Objectives: ${activeObjectives.map(obj => obj.type).join(', ')} | ` +
               `Total Objectives: ${this.strategicObjectives.length}`;
    }

    // Adaptive Difficulty Scaling System
    private adaptiveDifficultyEnabled: boolean = true;
    private performanceWindow: Array<{timestamp: number, performance: number}> = [];
    private difficultyAdjustmentCooldown: number = 30000; // 30 seconds
    private lastDifficultyAdjustment: number = 0;
    private targetPerformanceRange = { min: 0.4, max: 0.7 }; // Target player performance range

    private calculatePlayerPerformance(state: GameState): number {
        // Calculate normalized performance score (0-1)
        const healthScore = state.playerHealthPercent;
        const stressScore = 1 - Math.min(state.playerStressLevel, 1);
        const engagementScore = Math.min(state.engagementScore / 100, 1);
        
        return (healthScore * 0.4 + stressScore * 0.3 + engagementScore * 0.3);
    }

    private updatePerformanceWindow(performance: number): void {
        const now = Date.now();
        this.performanceWindow.push({ timestamp: now, performance });
        
        // Keep only last 2 minutes of data
        const cutoff = now - 120000;
        this.performanceWindow = this.performanceWindow.filter(entry => entry.timestamp > cutoff);
    }

    private getAveragePerformance(): number {
        if (this.performanceWindow.length === 0) return 0.5;
        
        const sum = this.performanceWindow.reduce((acc, entry) => acc + entry.performance, 0);
        return sum / this.performanceWindow.length;
    }

    private shouldAdjustDifficulty(): boolean {
        const now = Date.now();
        if (now - this.lastDifficultyAdjustment < this.difficultyAdjustmentCooldown) {
            return false;
        }
        
        if (this.performanceWindow.length < 10) {
            return false; // Need enough data
        }
        
        const avgPerformance = this.getAveragePerformance();
        return avgPerformance < this.targetPerformanceRange.min || avgPerformance > this.targetPerformanceRange.max;
    }

    private adjustDifficultyBasedOnPerformance(): void {
        const avgPerformance = this.getAveragePerformance();
        const now = Date.now();
        
        if (avgPerformance < this.targetPerformanceRange.min) {
            // Player struggling - reduce difficulty
            this.maxBudget = Math.max(300, this.maxBudget - 50);
            this.budgetRegenRate = Math.max(5, this.budgetRegenRate - 1);
            this.emergencyBudgetMultiplier = Math.max(0.8, this.emergencyBudgetMultiplier - 0.1);
        } else if (avgPerformance > this.targetPerformanceRange.max) {
            // Player doing too well - increase difficulty
            this.maxBudget = Math.min(800, this.maxBudget + 50);
            this.budgetRegenRate = Math.min(20, this.budgetRegenRate + 1);
            this.emergencyBudgetMultiplier = Math.min(2.0, this.emergencyBudgetMultiplier + 0.1);
        }
        
        this.lastDifficultyAdjustment = now;
    }

    public enableAdaptiveDifficulty(enabled: boolean): void {
        this.adaptiveDifficultyEnabled = enabled;
    }

    public getAdaptiveDifficultyStatus(): string {
        const avgPerformance = this.getAveragePerformance();
        const status = this.adaptiveDifficultyEnabled ? 'Enabled' : 'Disabled';
        return `Adaptive Difficulty: ${status}, Avg Performance: ${(avgPerformance * 100).toFixed(1)}%, Budget: ${this.maxBudget}, Regen: ${this.budgetRegenRate}/s`;
    }

    public setTargetPerformanceRange(min: number, max: number): void {
        this.targetPerformanceRange = { min: Math.max(0, min), max: Math.min(1, max) };
    }

    /**
     * Get consolidated metrics for the AI Director
     * This method provides a comprehensive overview of all AI Director metrics
     */
    public getMetrics(): any {
        const avgPerformance = this.getAveragePerformance();
        const recentThreat = this.threatAssessmentHistory.length > 0 ? 
            this.threatAssessmentHistory[this.threatAssessmentHistory.length - 1].threat : 0;
        
        return {
            // Training metrics
            training: this.getTrainingMetrics(),
            
            // Model configuration
            model: this.getModelConfig(),
            
            // Training status
            trainingStatus: this.getTrainingStatus(),
            
            // Budget information
            budget: {
                current: this.currentBudget,
                max: this.maxBudget,
                percentage: (this.currentBudget / this.maxBudget) * 100,
                regenRate: this.budgetRegenRate,
                efficiency: this.budgetEfficiencyBonus,
                emergency: this.emergencyBudgetMultiplier > 1.0,
                status: this.getBudgetStatus()
            },
            
            // Tactical information
            tactical: {
                strategy: this.adaptiveStrategy,
                threatLevel: recentThreat,
                memorySize: this.tacticalMemory.length,
                status: this.getTacticalStatus()
            },
            
            // Adaptive difficulty
            adaptiveDifficulty: {
                enabled: this.adaptiveDifficultyEnabled,
                performance: avgPerformance,
                performancePercent: avgPerformance * 100,
                targetRange: this.targetPerformanceRange,
                status: this.getAdaptiveDifficultyStatus()
            },
            
            // Player performance
            playerPerformance: this.getPlayerPerformanceMetrics(),
            
            // Strategic objectives
            strategicObjectives: {
                total: this.strategicObjectives.length,
                status: this.getStrategicObjectivesStatus()
            },
            
            // History data
            history: {
                threatAssessment: this.getThreatAssessmentHistory(),
                budget: this.getBudgetHistory(),
                performanceWindow: [...this.performanceWindow]
            },
            
            // Timestamp
            timestamp: Date.now()
        };
    }
}