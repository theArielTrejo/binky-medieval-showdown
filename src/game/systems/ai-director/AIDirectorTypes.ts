/**
 * AI Director Types and Interfaces
 * Defines the core data structures for the 3-layer AI Director system
 */

import { EnemyType } from '../../types/EnemyTypes';

// ============================================================================
// PACKAGE TAGS - Define what gameplay challenge each package poses
// ============================================================================

export type PackageTag = 
    | 'antiKite'      // Counters players who stay at range and run
    | 'antiCamp'      // Counters players who stay in one spot
    | 'antiAoE'       // Counters players who rely on area damage
    | 'antiSingleTarget' // Counters players who focus one enemy at a time
    | 'antiTank'      // Counters players who facetank damage
    | 'poke'          // Light harassment from range
    | 'swarm'         // Many weak enemies
    | 'elite'         // Fewer, stronger enemies
    | 'mixed'         // Balanced composition
    | 'flanker'       // Attacks from multiple angles
    | 'zoner';        // Controls space with hazards

// ============================================================================
// INTENSITY LEVELS - How aggressive the package execution is
// ============================================================================

export enum IntensityLevel {
    LOW = 0,
    MEDIUM = 1,
    HIGH = 2
}

// ============================================================================
// SPAWN COMMAND - Individual enemy spawn instruction
// ============================================================================

export interface SpawnCommand {
    enemyType: EnemyType;
    count: number;
    spawnPattern: 'near_player' | 'screen_edges' | 'random_ambush' | 'flanking' | 'behind_player';
    delay?: number;           // Delay before spawning (ms)
    eliteChance?: number;     // 0-1, chance to upgrade to elite variant
    formation?: 'spread' | 'clustered' | 'line' | 'arc';
}

// ============================================================================
// GAME CONTEXT - Rich context for ML decision making
// ============================================================================

export interface GameContext {
    // Player state
    playerHealthPercent: number;
    playerArchetype: number[];     // One-hot encoded archetype
    playerLevel: number;           // Player's current level
    
    // Playstyle metrics (slow-moving, window-based)
    kitingScore: number;           // 0-1: how much player runs from enemies
    campingScore: number;          // 0-1: how stationary the player is
    aoeDamageRatio: number;        // 0-1: proportion of damage from AoE
    singleTargetFocusScore: number;// 0-1: how much player focuses single targets
    defensivePlayScore: number;    // 0-1: how defensively player plays
    
    // Current battlefield
    totalEnemyCount: number;
    enemyComposition: Map<EnemyType, number>;
    
    // Round/time info
    currentRound: number;
    roundProgress: number;         // 0-1: how far into the round
    
    // Stress/flow
    playerStressLevel: number;     // 0-1: current stress
    recentDamageTaken: number;     // Normalized
    recentDamageDealt: number;     // Normalized
    engagementScore: number;       // 0-1: player activity level
    
    // Director history (for pattern detection)
    recentPackageTags: PackageTag[];
    recentPackageIds: string[];
    timeSinceTagUsed: Map<PackageTag, number>;
}

// ============================================================================
// SPAWN PACKAGE - A "combat question" posed to the player
// ============================================================================

export interface SpawnPackage {
    id: string;
    name: string;
    description: string;
    tags: PackageTag[];
    
    // Constraints
    baseCost: number;
    minRound: number;
    maxRound?: number;             // undefined = no max
    cooldownBeats: number;         // Minimum beats before reuse
    
    // Synergy/anti-synergy
    synergyTags?: PackageTag[];    // Pairs well with these
    antiSynergyTags?: PackageTag[];// Don't use right after these
    
    // Dynamic cost based on context
    getCost: (round: number, intensity: IntensityLevel) => number;
    
    // Generate the actual spawn commands
    buildWave: (context: GameContext, round: number, intensity: IntensityLevel) => SpawnCommand[];
}

// ============================================================================
// PACKAGE CANDIDATE - A package ready for ML selection
// ============================================================================

export interface PackageCandidate {
    package: SpawnPackage;
    intensity: IntensityLevel;
    cost: number;
    
    // Pre-computed scores for selection
    mlScore: number;               // From neural network
    noveltyBonus: number;          // Variety reward
    repetitionPenalty: number;     // Repetition punishment
    finalScore: number;            // Combined score
}

// ============================================================================
// ROUND BUDGET - Budget configuration for a round
// ============================================================================

export interface RoundBudget {
    totalBudget: number;           // Total spawn points this round
    maxConcurrentEnemies: number;  // Max enemies alive at once
    spawnCap: number;              // Total spawns allowed this round
    targetStressMin: number;       // Lower bound of target stress
    targetStressMax: number;       // Upper bound of target stress
    
    // Dynamic tracking
    budgetSpent: number;
    enemiesSpawned: number;
}

// ============================================================================
// BEAT - A mini-phase within a round
// ============================================================================

export interface Beat {
    id: string;
    packageId: string;
    intensity: IntensityLevel;
    spawnCommands: SpawnCommand[];
    startTime: number;
    completed: boolean;
}

// ============================================================================
// DIRECTOR STATE - Complete state of the AI director
// ============================================================================

export interface DirectorState {
    // Current round info
    currentRound: number;
    roundBudget: RoundBudget;
    
    // Beat history
    currentBeat: Beat | null;
    beatHistory: Beat[];
    totalBeatsThisRound: number;
    
    // Novelty tracking
    packageUsageHistory: Map<string, number>;  // package id -> times used
    tagUsageHistory: Map<PackageTag, number>;  // tag -> times used
    lastNPackages: string[];                   // Last N package IDs
    lastNTags: PackageTag[];                   // Last N tags used
    
    // Boredom metrics
    samePackageStreak: number;
    sameTagStreak: number;
    lastPackageId: string | null;
    lastTags: PackageTag[];
}

// ============================================================================
// ML MODEL METRICS - For bandit learning
// ============================================================================

export interface BanditMetrics {
    explorationRate: number;
    averageReward: number;
    recentRewards: number[];
    uncertaintyEstimates: Map<string, number>;  // Per-package uncertainty
    
    // Training stats
    totalDecisions: number;
    trainSteps: number;
    avgLoss: number;
}

// ============================================================================
// REWARD COMPONENTS - Breakdown of reward calculation
// ============================================================================

export interface RewardComponents {
    flowReward: number;            // Core "in the zone" reward
    engagementBonus: number;       // Player activity reward
    survivalPenalty: number;       // Death penalty
    varietyBonus: number;          // Mix of enemy types
    noveltyBonus: number;          // Package variety bonus
    repetitionPenalty: number;     // Same package penalty
    totalReward: number;           // Sum of all components
}

// ============================================================================
// EXPLORATION CONFIG - How the bandit explores
// ============================================================================

export interface ExplorationConfig {
    baseEpsilon: number;           // Starting exploration rate
    minEpsilon: number;            // Minimum exploration rate
    epsilonDecay: number;          // Decay per decision
    
    // Adaptive exploration
    boredEpsilonBoost: number;     // Boost when player seems bored
    dangerEpsilonReduction: number;// Reduce when player is in danger
    
    // Thompson sampling params (if using)
    useThompsonSampling: boolean;
    priorStrength: number;         // How strong initial beliefs are
}

// ============================================================================
// DIFFICULTY SCALING - Per-difficulty configuration
// ============================================================================

export interface DifficultyConfig {
    name: string;
    
    // Budget scaling
    baseBudget: number;
    budgetPerRound: number;
    budgetQuadratic: number;       // Small quadratic term
    
    // Enemy limits
    baseMaxAlive: number;
    maxAlivePerRound: number;
    maxAliveHardCap: number;
    
    // Spawn rates
    baseSpawnCap: number;
    spawnCapPerRound: number;
    
    // Stress targets
    targetStressMin: number;
    targetStressMax: number;
    
    // ML params
    explorationConfig: ExplorationConfig;
    rewardMultiplier: number;
}

// ============================================================================
// SAFETY RULES - Hard limits that ML cannot override
// ============================================================================

export interface SafetyRules {
    absoluteMaxAlive: number;      // Never exceed this many enemies
    minTimeBetweenBeats: number;   // Minimum ms between spawns
    breatherHealthThreshold: number; // Force breather if HP below this
    breatherCooldown: number;      // Min time between breathers (ms)
    
    // Emergency responses
    emergencyBudgetBoost: number;  // Budget boost if arena is empty
    mercyModeThreshold: number;    // Reduce difficulty if HP below this
}

// ============================================================================
// PACKAGE LIBRARY ENTRY - For registering packages
// ============================================================================

export interface PackageLibraryEntry {
    package: SpawnPackage;
    enabled: boolean;
    lastUsedRound: number;
    lastUsedBeat: number;
    timesUsed: number;
}

