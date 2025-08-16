import * as tf from '@tensorflow/tfjs';
import { PlayerArchetype } from './PlayerArchetype';
import { EnemySystem, EnemyType } from './EnemySystem';

export enum DirectorAction {
    SPAWN_TANKS = 0,
    SPAWN_PROJECTILES = 1,
    SPAWN_SPEEDSTERS = 2,
    BOSS_ENCOUNTER = 3,
    INCREASE_SPAWN_RATE = 4,
    DO_NOTHING = 5
}

export interface GameState {
    playerArchetype: number[]; // One-hot encoded [tank, glass_cannon, evasive]
    playerHealthPercent: number;
    playerDPS: number;
    playerPositionX: number;
    playerPositionY: number;
    damageTakenRecently: number;
    playerMovementDistance: number;
    resourceGeneration: number;
    gameTimer: number;
    enemyCountTanks: number;
    enemyCountProjectiles: number;
    enemyCountSpeedsters: number;
    enemyCountBosses: number;
}

export class AIDirector {
    private model: tf.LayersModel | null = null;
    private isTraining: boolean = false;
    private gameStartTime: number;
    private lastActionTime: number = 0;
    private actionInterval: number = 3000; // 3 seconds between actions

    private stateHistory: GameState[] = [];
    private actionHistory: DirectorAction[] = [];
    
    // Training parameters
    private epsilon: number = 0.1; // Exploration rate
    private learningRate: number = 0.001;
    private discountFactor: number = 0.95;
    private replayBuffer: Array<{
        state: GameState;
        action: DirectorAction;
        reward: number;
        nextState: GameState;
        done: boolean;
    }> = [];
    private maxReplayBufferSize: number = 10000;

    constructor() {
        this.gameStartTime = Date.now();
        this.initializeModel();
    }

    private async initializeModel(): Promise<void> {
        // Create a simple neural network for the AI Director
        this.model = tf.sequential({
            layers: [
                tf.layers.dense({
                    inputShape: [13], // playerArchetype(3) + 10 other features = 13
                    units: 128,
                    activation: 'relu'
                }),
                tf.layers.dropout({ rate: 0.2 }),
                tf.layers.dense({
                    units: 64,
                    activation: 'relu'
                }),
                tf.layers.dropout({ rate: 0.2 }),
                tf.layers.dense({
                    units: 32,
                    activation: 'relu'
                }),
                tf.layers.dense({
                    units: 6, // Number of possible actions
                    activation: 'linear'
                })
            ]
        });

        this.model.compile({
            optimizer: tf.train.adam(this.learningRate),
            loss: 'meanSquaredError'
        });
    }

    public getGameState(player: PlayerArchetype, enemySystem: EnemySystem): GameState {
        const currentTime = Date.now();
        const gameTimer = (currentTime - this.gameStartTime) / 1000; // Game time in seconds

        return {
            playerArchetype: player.getArchetypeVector(),
            playerHealthPercent: player.getHealthPercentage(),
            playerDPS: player.getDPSOverLastTenSeconds(),
            playerPositionX: player.position.x / 1024, // Normalize to 0-1
            playerPositionY: player.position.y / 768, // Normalize to 0-1
            damageTakenRecently: player.getDamageTakenRecently(),
            playerMovementDistance: Math.min(player.getMovementDistanceLastTenSeconds() / 1000, 1), // Normalize
            resourceGeneration: Math.min(player.getXPGenerationRate() / 10, 1), // Normalize
            gameTimer: Math.min(gameTimer / 300, 1), // Normalize to 5 minutes max
            enemyCountTanks: Math.min(enemySystem.getEnemyCountByType(EnemyType.TANK) / 10, 1),
            enemyCountProjectiles: Math.min(enemySystem.getEnemyCountByType(EnemyType.PROJECTILE) / 20, 1),
            enemyCountSpeedsters: Math.min(enemySystem.getEnemyCountByType(EnemyType.SPEEDSTER) / 30, 1),
            enemyCountBosses: Math.min(enemySystem.getEnemyCountByType(EnemyType.BOSS) / 2, 1)
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
            state.enemyCountTanks,
            state.enemyCountProjectiles,
            state.enemyCountSpeedsters,
            state.enemyCountBosses
        ];
        
        // Debug: Check array length
        if (stateArray.length !== 13) {
            console.warn(`Expected 13 features, got ${stateArray.length}:`, stateArray);
            // Ensure exactly 13 features
            while (stateArray.length < 13) stateArray.push(0);
            if (stateArray.length > 13) stateArray.splice(13);
        }
        
        return tf.tensor2d([stateArray]);
    }

    public async chooseAction(gameState: GameState): Promise<DirectorAction> {
        try {
            if (!this.model) {
                return DirectorAction.DO_NOTHING;
            }

            // Epsilon-greedy action selection
            if (this.isTraining && Math.random() < this.epsilon) {
                // Random action for exploration
                return Math.floor(Math.random() * 6) as DirectorAction;
            }

            // Use the model to predict the best action
        const stateTensor = this.gameStateToTensor(gameState);
        const prediction = this.model.predict(stateTensor) as tf.Tensor;
        const actionValues = await prediction.data();
        stateTensor.dispose();
        prediction.dispose();

        // Choose action with highest Q-value
        let bestAction = 0;
        let bestValue = actionValues[0];
        for (let i = 1; i < actionValues.length; i++) {
            if (actionValues[i] > bestValue) {
                bestValue = actionValues[i];
                bestAction = i;
            }
        }

        return bestAction as DirectorAction;
        } catch (error) {
            console.warn('AI Director chooseAction failed:', error);
            // Fallback to random action if model fails
            return Math.floor(Math.random() * 6) as DirectorAction;
        }
    }

    public executeAction(action: DirectorAction, enemySystem: EnemySystem): void {
        switch (action) {
            case DirectorAction.SPAWN_TANKS:
                enemySystem.spawnWave(EnemyType.TANK, 3, 'near_player');
                break;
            case DirectorAction.SPAWN_PROJECTILES:
                enemySystem.spawnWave(EnemyType.PROJECTILE, 8, 'screen_edges');
                break;
            case DirectorAction.SPAWN_SPEEDSTERS:
                enemySystem.spawnWave(EnemyType.SPEEDSTER, 15, 'random_ambush');
                break;
            case DirectorAction.BOSS_ENCOUNTER:
                enemySystem.startSpecialEvent('boss_encounter');
                break;
            case DirectorAction.INCREASE_SPAWN_RATE:
                enemySystem.increaseSpawnRate(10);
                break;
            case DirectorAction.DO_NOTHING:
                // Intentionally do nothing
                break;
        }
    }

    public calculateReward(previousState: GameState, currentState: GameState): number {
        let reward = 0;

        // Positive rewards for creating pressure
        if (currentState.playerHealthPercent < 0.6 && currentState.playerHealthPercent > 0) {
            reward += 10; // Player is in danger zone but alive
        }

        // Reward for forcing movement (anti-turtling)
        if (currentState.playerMovementDistance > previousState.playerMovementDistance + 0.1) {
            reward += 5;
        }

        // Negative rewards for poor game balance
        if (currentState.playerHealthPercent === 1.0) {
            reward -= 5; // Game is too easy
        }

        if (currentState.playerDPS > 0.8) {
            reward -= 3; // Player is killing everything too easily
        }

        // Large penalty if player dies (health reaches 0)
        if (currentState.playerHealthPercent === 0) {
            reward -= 50;
        }

        // Reward for maintaining engagement
        if (currentState.playerHealthPercent > 0.2 && currentState.playerHealthPercent < 0.8) {
            reward += 2; // Sweet spot for engagement
        }

        return reward;
    }

    public async update(player: PlayerArchetype, enemySystem: EnemySystem): Promise<void> {
        const currentTime = Date.now();
        
        // Only take action every few seconds
        if (currentTime - this.lastActionTime < this.actionInterval) {
            return;
        }

        const currentState = this.getGameState(player, enemySystem);
        
        // Choose and execute action
        const action = await this.chooseAction(currentState);
        this.executeAction(action, enemySystem);
        
        // Store for training
        if (this.stateHistory.length > 0) {
            const previousState = this.stateHistory[this.stateHistory.length - 1];
            const reward = this.calculateReward(previousState, currentState);
            
            this.replayBuffer.push({
                state: previousState,
                action: this.actionHistory[this.actionHistory.length - 1],
                reward: reward,
                nextState: currentState,
                done: player.currentHealth <= 0
            });
            
            // Limit replay buffer size
            if (this.replayBuffer.length > this.maxReplayBufferSize) {
                this.replayBuffer.shift();
            }
        }
        
        this.stateHistory.push(currentState);
        this.actionHistory.push(action);
        this.lastActionTime = currentTime;
        
        // Train the model periodically
        if (this.isTraining && this.replayBuffer.length > 32) {
            await this.trainModel();
        }
    }

    private async trainModel(): Promise<void> {
        if (!this.model || this.replayBuffer.length < 32) return;

        // Sample a batch from replay buffer
        const batchSize = Math.min(32, this.replayBuffer.length);
        const batch = [];
        for (let i = 0; i < batchSize; i++) {
            const randomIndex = Math.floor(Math.random() * this.replayBuffer.length);
            batch.push(this.replayBuffer[randomIndex]);
        }

        // Prepare training data
        const states = batch.map(experience => this.gameStateToTensor(experience.state));
        const nextStates = batch.map(experience => this.gameStateToTensor(experience.nextState));
        
        const statesBatch = tf.concat(states);
        const nextStatesBatch = tf.concat(nextStates);
        
        // Get current Q-values and next Q-values
        const currentQValues = this.model.predict(statesBatch) as tf.Tensor;
        const nextQValues = this.model.predict(nextStatesBatch) as tf.Tensor;
        
        const currentQData = await currentQValues.data();
        const nextQData = await nextQValues.data();
        
        // Update Q-values using Bellman equation
        const updatedQValues = new Float32Array(currentQData);
        
        for (let i = 0; i < batch.length; i++) {
            const experience = batch[i];
            const actionIndex = experience.action;
            const reward = experience.reward;
            
            let targetValue = reward;
            if (!experience.done) {
                const nextMaxQ = Math.max(...Array.from(nextQData.slice(i * 6, (i + 1) * 6)));
                targetValue += this.discountFactor * nextMaxQ;
            }
            
            updatedQValues[i * 6 + actionIndex] = targetValue;
        }
        
        const targetTensor = tf.tensor2d(Array.from(updatedQValues), [batchSize, 6]);
        
        // Train the model
        await this.model.fit(statesBatch, targetTensor, {
            epochs: 1,
            verbose: 0
        });
        
        // Clean up tensors
        states.forEach(tensor => tensor.dispose());
        nextStates.forEach(tensor => tensor.dispose());
        statesBatch.dispose();
        nextStatesBatch.dispose();
        currentQValues.dispose();
        nextQValues.dispose();
        targetTensor.dispose();
    }

    public setTrainingMode(training: boolean): void {
        this.isTraining = training;
    }

    public async saveModel(path: string): Promise<void> {
        if (this.model) {
            await this.model.save(path);
        }
    }

    public async loadModel(path: string): Promise<void> {
        this.model = await tf.loadLayersModel(path);
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
}