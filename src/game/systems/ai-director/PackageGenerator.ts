/**
 * LAYER B: Package Generator (Rules + Constraints)
 * 
 * Defines what is allowed right now:
 * - Spawn packages (enemy mixes + formation + timing)
 * - Counters available based on player build/state
 * - Cooldowns, variety constraints, "no-repeat" rules
 * 
 * This prevents repetitiveness through constraints, not ML.
 */

import { EnemyType } from '../../types/EnemyTypes';
import {
    SpawnPackage,
    SpawnCommand,
    PackageTag,
    PackageCandidate,
    PackageLibraryEntry,
    GameContext,
    IntensityLevel,
    DirectorState
} from './AIDirectorTypes';

export class PackageGenerator {
    private packageLibrary: Map<string, PackageLibraryEntry> = new Map();
    private directorState: DirectorState;
    
    // Variety constraints
    private readonly NO_REPEAT_LAST_N = 3;           // Don't repeat same package in last N beats
    private readonly DIVERSITY_PENALTY_WINDOW = 5;   // Check tag diversity in last N beats
    // TAG_COOLDOWN_BEATS reserved for future tag cooldown feature
    
    constructor() {
        this.directorState = this.createInitialState();
        this.initializePackageLibrary();
    }
    
    private createInitialState(): DirectorState {
        return {
            currentRound: 0,
            roundBudget: {
                totalBudget: 0,
                maxConcurrentEnemies: 0,
                spawnCap: 0,
                targetStressMin: 0,
                targetStressMax: 1,
                budgetSpent: 0,
                enemiesSpawned: 0
            },
            currentBeat: null,
            beatHistory: [],
            totalBeatsThisRound: 0,
            packageUsageHistory: new Map(),
            tagUsageHistory: new Map(),
            lastNPackages: [],
            lastNTags: [],
            samePackageStreak: 0,
            sameTagStreak: 0,
            lastPackageId: null,
            lastTags: []
        };
    }
    
    // ========================================================================
    // PACKAGE LIBRARY - All available spawn packages
    // ========================================================================
    
    private initializePackageLibrary(): void {
        const packages: SpawnPackage[] = [
            // ----------------------------------------------------------------
            // ANTI-KITING: Punish players who stay at range and run
            // ----------------------------------------------------------------
            {
                id: 'anti_kite_flankers',
                name: 'Flanking Rush',
                description: 'Fast enemies from multiple angles',
                tags: ['antiKite', 'flanker'],
                baseCost: 25,
                minRound: 1,
                cooldownBeats: 2,
                antiSynergyTags: ['antiKite'],
                getCost: (round, intensity) => 25 + round * 3 + intensity * 8,
                buildWave: (_context, round, intensity) => {
                    const baseCount = 2 + Math.floor(round / 4);
                    const count = Math.min(baseCount + intensity, 5);
                    return [
                        { enemyType: EnemyType.GNOLL, count: count, spawnPattern: 'flanking', formation: 'spread' }
                    ];
                }
            },
            {
                id: 'anti_kite_fast_chase',
                name: 'Relentless Pursuit',
                description: 'Very fast enemies that close distance quickly',
                tags: ['antiKite', 'swarm'],
                baseCost: 35,
                minRound: 2,
                cooldownBeats: 3,
                getCost: (round, intensity) => 35 + round * 4 + intensity * 10,
                buildWave: (_context, round, intensity) => {
                    const gnollCount = 2 + intensity + Math.floor(round / 5);
                    return [
                        { enemyType: EnemyType.GNOLL, count: gnollCount, spawnPattern: 'screen_edges', formation: 'spread', eliteChance: 0.1 * intensity }
                    ];
                }
            },
            
            // ----------------------------------------------------------------
            // ANTI-CAMPING: Punish players who stay in one spot
            // ----------------------------------------------------------------
            {
                id: 'anti_camp_rush',
                name: 'Multi-Angle Rush',
                description: 'Low-cost melee rushers from all directions',
                tags: ['antiCamp', 'swarm'],
                baseCost: 22,
                minRound: 1,
                cooldownBeats: 2,
                antiSynergyTags: ['antiCamp'],
                getCost: (round, intensity) => 22 + round * 2 + intensity * 6,
                buildWave: (_context, round, intensity) => {
                    const count = 2 + intensity + Math.floor(round / 3);
                    return [
                        { enemyType: EnemyType.GNOLL, count: count, spawnPattern: 'flanking', formation: 'spread' }
                    ];
                }
            },
            {
                id: 'anti_camp_bombardment',
                name: 'Ranged Bombardment',
                description: 'Archers force player to move or die',
                tags: ['antiCamp', 'poke'],
                baseCost: 30,
                minRound: 1,
                cooldownBeats: 2,
                getCost: (round, intensity) => 30 + round * 3 + intensity * 8,
                buildWave: (_context, round, intensity) => {
                    const archerCount = 1 + intensity + Math.floor(round / 4);
                    return [
                        { enemyType: EnemyType.ARCHER, count: archerCount, spawnPattern: 'screen_edges', formation: 'spread' }
                    ];
                }
            },
            
            // ----------------------------------------------------------------
            // ANTI-AOE: Punish players who rely on area damage
            // ----------------------------------------------------------------
            {
                id: 'anti_aoe_spread',
                name: 'Spread Formation',
                description: 'Fewer, tougher enemies spaced out',
                tags: ['antiAoE', 'elite'],
                baseCost: 40,
                minRound: 2,
                cooldownBeats: 3,
                antiSynergyTags: ['swarm'],
                getCost: (round, intensity) => 40 + round * 4 + intensity * 10,
                buildWave: (_context, _round, intensity) => {
                    return [
                        { enemyType: EnemyType.SKELETON_VIKING, count: 1, spawnPattern: 'screen_edges', formation: 'spread', eliteChance: 0.1 * intensity },
                        { enemyType: EnemyType.GNOLL, count: 1 + Math.floor(intensity / 2), spawnPattern: 'flanking', formation: 'spread', delay: 600 }
                    ];
                }
            },
            {
                id: 'anti_aoe_poke',
                name: 'Sniper Harassment',
                description: 'Ranged poke with spread positioning',
                tags: ['antiAoE', 'poke'],
                baseCost: 35,
                minRound: 2,
                cooldownBeats: 2,
                getCost: (round, intensity) => 35 + round * 3 + intensity * 8,
                buildWave: (_context, _round, intensity) => {
                    return [
                        { enemyType: EnemyType.ARCHER, count: 1 + intensity, spawnPattern: 'screen_edges', formation: 'spread' }
                    ];
                }
            },
            
            // ----------------------------------------------------------------
            // ANTI-SINGLE-TARGET: Punish players who focus one enemy
            // ----------------------------------------------------------------
            {
                id: 'anti_single_swarm',
                name: 'Overwhelming Numbers',
                description: 'Many low HP enemies punish single-target focus',
                tags: ['antiSingleTarget', 'swarm'],
                baseCost: 28,
                minRound: 1,
                cooldownBeats: 2,
                antiSynergyTags: ['elite'],
                getCost: (round, intensity) => 28 + round * 3 + intensity * 8,
                buildWave: (_context, round, intensity) => {
                    const gnollCount = 2 + intensity + Math.floor(round / 4);
                    return [
                        { enemyType: EnemyType.GNOLL, count: gnollCount, spawnPattern: 'screen_edges', formation: 'clustered' }
                    ];
                }
            },
            {
                id: 'anti_single_shielded',
                name: 'Protected Advance',
                description: 'Shielded units with support',
                tags: ['antiSingleTarget', 'elite'],
                baseCost: 45,
                minRound: 3,
                cooldownBeats: 3,
                getCost: (round, intensity) => 45 + round * 4 + intensity * 10,
                buildWave: (_context, _round, intensity) => {
                    return [
                        { enemyType: EnemyType.SKELETON_VIKING, count: 1, spawnPattern: 'near_player', formation: 'line', eliteChance: 0.15 },
                        { enemyType: EnemyType.GNOLL, count: 1 + Math.floor(intensity / 2), spawnPattern: 'flanking', formation: 'arc', delay: 400 }
                    ];
                }
            },
            
            // ----------------------------------------------------------------
            // ANTI-TANK: Punish players who facetank damage
            // ----------------------------------------------------------------
            {
                id: 'anti_tank_shred',
                name: 'Armor Shredder',
                description: 'High damage enemies with chip poke',
                tags: ['antiTank', 'elite'],
                baseCost: 45,
                minRound: 2,
                cooldownBeats: 3,
                getCost: (round, intensity) => 45 + round * 4 + intensity * 12,
                buildWave: (_context, _round, intensity) => {
                    return [
                        { enemyType: EnemyType.OGRE, count: 1, spawnPattern: 'near_player', formation: 'clustered', eliteChance: 0.1 * intensity }
                    ];
                }
            },
            {
                id: 'anti_tank_dps_check',
                name: 'DPS Check',
                description: 'Sustained damage that overwhelms regeneration',
                tags: ['antiTank', 'poke'],
                baseCost: 32,
                minRound: 2,
                cooldownBeats: 2,
                getCost: (round, intensity) => 32 + round * 3 + intensity * 8,
                buildWave: (_context, _round, intensity) => {
                    return [
                        { enemyType: EnemyType.ARCHER, count: 1 + intensity, spawnPattern: 'screen_edges', formation: 'spread' },
                        { enemyType: EnemyType.GNOLL, count: 1, spawnPattern: 'near_player', formation: 'spread', delay: 600 }
                    ];
                }
            },
            
            // ----------------------------------------------------------------
            // MIXED / BALANCED: General purpose packages
            // ----------------------------------------------------------------
            {
                id: 'mixed_standard',
                name: 'Standard Wave',
                description: 'Balanced mix of enemy types',
                tags: ['mixed'],
                baseCost: 28,
                minRound: 1,
                cooldownBeats: 2,
                getCost: (round, intensity) => 28 + round * 3 + intensity * 8,
                buildWave: (_context, round, intensity) => {
                    const gnollCount = 2 + Math.floor(intensity / 2) + Math.floor(round / 4);
                    const commands: SpawnCommand[] = [
                        { enemyType: EnemyType.GNOLL, count: gnollCount, spawnPattern: 'screen_edges', formation: 'spread' }
                    ];
                    return commands;
                }
            },
            {
                id: 'mixed_escalation',
                name: 'Escalating Threat',
                description: 'Starts weak, reinforcements arrive',
                tags: ['mixed', 'flanker'],
                baseCost: 38,
                minRound: 2,
                cooldownBeats: 2,
                getCost: (round, intensity) => 38 + round * 3 + intensity * 10,
                buildWave: (_context, _round, intensity) => {
                    return [
                        { enemyType: EnemyType.GNOLL, count: 2, spawnPattern: 'near_player', formation: 'spread' },
                        { enemyType: EnemyType.GNOLL, count: 1 + intensity, spawnPattern: 'flanking', formation: 'arc', delay: 1500 }
                    ];
                }
            },
            
            // ----------------------------------------------------------------
            // ELITE: Fewer, more dangerous enemies
            // ----------------------------------------------------------------
            {
                id: 'elite_ogre',
                name: 'Ogre Assault',
                description: 'Heavy hitter with support',
                tags: ['elite', 'antiTank'],
                baseCost: 50,
                minRound: 2,
                cooldownBeats: 3,
                getCost: (round, intensity) => 50 + round * 5 + intensity * 12,
                buildWave: (_context, _round, intensity) => {
                    return [
                        { enemyType: EnemyType.OGRE, count: 1, spawnPattern: 'near_player', formation: 'clustered', eliteChance: 0.1 * intensity }
                    ];
                }
            },
            {
                id: 'elite_mage',
                name: 'Arcane Assault',
                description: 'Magic damage dealers',
                tags: ['elite', 'zoner'],
                baseCost: 42,
                minRound: 2,
                cooldownBeats: 3,
                getCost: (round, intensity) => 42 + round * 4 + intensity * 10,
                buildWave: (_context, _round, _intensity) => {
                    return [
                        { enemyType: EnemyType.LIGHTNING_MAGE, count: 1, spawnPattern: 'screen_edges', formation: 'spread' }
                    ];
                }
            },
            {
                id: 'early_variety',
                name: 'Mixed Threat',
                description: 'Mix of melee and ranged for early rounds',
                tags: ['mixed', 'flanker'],
                baseCost: 26,
                minRound: 1,
                cooldownBeats: 2,
                getCost: (round, intensity) => 26 + round * 2 + intensity * 6,
                buildWave: (_context, _round, intensity) => {
                    return [
                        { enemyType: EnemyType.GNOLL, count: 1 + intensity, spawnPattern: 'near_player', formation: 'spread' },
                        { enemyType: EnemyType.ARCHER, count: 1, spawnPattern: 'screen_edges', formation: 'spread', delay: 500 }
                    ];
                }
            },
            
            // ----------------------------------------------------------------
            // ZONER: Space control and hazards
            // ----------------------------------------------------------------
            {
                id: 'zoner_pirate',
                name: 'Pirate Blockade',
                description: 'Pirates create defensive line',
                tags: ['zoner', 'antiKite'],
                baseCost: 38,
                minRound: 2,
                cooldownBeats: 3,
                getCost: (round, intensity) => 38 + round * 4 + intensity * 10,
                buildWave: (_context, _round, _intensity) => {
                    return [
                        { enemyType: EnemyType.SKELETON_PIRATE, count: 1, spawnPattern: 'screen_edges', formation: 'line' }
                    ];
                }
            },
            {
                id: 'zoner_viking',
                name: 'Viking Raid',
                description: 'Skeleton Vikings with support',
                tags: ['elite', 'antiTank'],
                baseCost: 40,
                minRound: 2,
                cooldownBeats: 3,
                getCost: (round, intensity) => 40 + round * 4 + intensity * 10,
                buildWave: (_context, _round, intensity) => {
                    return [
                        { enemyType: EnemyType.SKELETON_VIKING, count: 1, spawnPattern: 'near_player', formation: 'clustered' },
                        { enemyType: EnemyType.GNOLL, count: 1 + Math.floor(intensity / 2), spawnPattern: 'flanking', formation: 'spread', delay: 400 }
                    ];
                }
            },
            {
                id: 'zoner_angel',
                name: 'Divine Intervention',
                description: 'Fallen Angel with support',
                tags: ['zoner', 'elite'],
                baseCost: 55,
                minRound: 4,
                cooldownBeats: 4,
                getCost: (round, intensity) => 55 + round * 5 + intensity * 12,
                buildWave: (_context, _round, _intensity) => {
                    return [
                        { enemyType: EnemyType.FALLEN_ANGEL, count: 1, spawnPattern: 'screen_edges', formation: 'spread' }
                    ];
                }
            },
            
            // ----------------------------------------------------------------
            // ELEMENTAL SPIRIT: Ethereal enemies
            // ----------------------------------------------------------------
            {
                id: 'spirit_assault',
                name: 'Elemental Assault',
                description: 'Ethereal spirits that phase through',
                tags: ['zoner', 'antiCamp'],
                baseCost: 40,
                minRound: 3,
                cooldownBeats: 3,
                getCost: (round, intensity) => 40 + round * 4 + intensity * 10,
                buildWave: (_context, _round, _intensity) => {
                    return [
                        { enemyType: EnemyType.ELEMENTAL_SPIRIT, count: 1, spawnPattern: 'flanking', formation: 'spread' }
                    ];
                }
            },
            {
                id: 'spirit_storm',
                name: 'Spirit Storm',
                description: 'Multiple elemental spirits',
                tags: ['elite', 'zoner'],
                baseCost: 60,
                minRound: 5,
                cooldownBeats: 4,
                getCost: (round, intensity) => 60 + round * 6 + intensity * 15,
                buildWave: (_context, _round, intensity) => {
                    return [
                        { enemyType: EnemyType.ELEMENTAL_SPIRIT, count: 1 + Math.floor(intensity / 2), spawnPattern: 'screen_edges', formation: 'spread' }
                    ];
                }
            },
            
            // ----------------------------------------------------------------
            // TOMBSTONE + ZOMBIE: Summoner mechanics
            // ----------------------------------------------------------------
            {
                id: 'graveyard_rise',
                name: 'Graveyard Rising',
                description: 'Tombstone spawns zombies over time',
                tags: ['zoner', 'swarm'],
                baseCost: 48,
                minRound: 3,
                cooldownBeats: 4,
                getCost: (round, intensity) => 48 + round * 5 + intensity * 12,
                buildWave: (_context, _round, _intensity) => {
                    return [
                        { enemyType: EnemyType.TOMBSTONE, count: 1, spawnPattern: 'screen_edges', formation: 'spread' }
                    ];
                }
            },
            {
                id: 'zombie_horde',
                name: 'Zombie Horde',
                description: 'Swarm of undead zombies',
                tags: ['swarm', 'antiSingleTarget'],
                baseCost: 24,
                minRound: 2,
                cooldownBeats: 2,
                getCost: (round, intensity) => 24 + round * 3 + intensity * 8,
                buildWave: (_context, round, intensity) => {
                    const zombieCount = 2 + intensity + Math.floor(round / 4);
                    return [
                        { enemyType: EnemyType.ZOMBIE, count: zombieCount, spawnPattern: 'flanking', formation: 'clustered' }
                    ];
                }
            },
            {
                id: 'undead_siege',
                name: 'Undead Siege',
                description: 'Tombstones with zombie protection',
                tags: ['elite', 'zoner', 'swarm'],
                baseCost: 70,
                minRound: 5,
                cooldownBeats: 4,
                getCost: (round, intensity) => 70 + round * 6 + intensity * 15,
                buildWave: (_context, _round, intensity) => {
                    return [
                        { enemyType: EnemyType.TOMBSTONE, count: 1, spawnPattern: 'screen_edges', formation: 'spread' },
                        { enemyType: EnemyType.ZOMBIE, count: 2 + intensity, spawnPattern: 'flanking', formation: 'spread', delay: 300 }
                    ];
                }
            },
            
            // ----------------------------------------------------------------
            // MIXED: Using newer enemy types
            // ----------------------------------------------------------------
            {
                id: 'mixed_undead',
                name: 'Undead Variety',
                description: 'Mix of undead types',
                tags: ['mixed', 'swarm'],
                baseCost: 30,
                minRound: 2,
                cooldownBeats: 2,
                getCost: (round, intensity) => 30 + round * 3 + intensity * 8,
                buildWave: (_context, _round, intensity) => {
                    return [
                        { enemyType: EnemyType.ZOMBIE, count: 2 + Math.floor(intensity / 2), spawnPattern: 'flanking', formation: 'spread' }
                    ];
                }
            },
            {
                id: 'mixed_magic',
                name: 'Arcane Convergence',
                description: 'Mix of magical enemies',
                tags: ['mixed', 'elite', 'zoner'],
                baseCost: 58,
                minRound: 4,
                cooldownBeats: 3,
                getCost: (round, intensity) => 58 + round * 5 + intensity * 12,
                buildWave: (_context, _round, _intensity) => {
                    return [
                        { enemyType: EnemyType.LIGHTNING_MAGE, count: 1, spawnPattern: 'screen_edges', formation: 'spread' },
                        { enemyType: EnemyType.GNOLL, count: 1, spawnPattern: 'near_player', formation: 'spread', delay: 800 }
                    ];
                }
            },
            
            // ----------------------------------------------------------------
            // BREATHER: Low intensity pause
            // ----------------------------------------------------------------
            {
                id: 'breather_light',
                name: 'Light Skirmish',
                description: 'Low pressure wave for recovery',
                tags: ['mixed'],
                baseCost: 15,
                minRound: 1,
                cooldownBeats: 1,
                getCost: (round, _intensity) => 15 + Math.floor(round / 2),
                buildWave: (_context, _round, _intensity) => {
                    return [
                        { enemyType: EnemyType.GNOLL, count: 2, spawnPattern: 'screen_edges', formation: 'spread' }
                    ];
                }
            },
            
            // ----------------------------------------------------------------
            // FILLER: Ultra-low cost for exhausting remaining budget
            // ----------------------------------------------------------------
            {
                id: 'filler_single',
                name: 'Lone Scout',
                description: 'Single enemy to spend remaining budget',
                tags: ['mixed'],
                baseCost: 8,
                minRound: 1,
                cooldownBeats: 0,  // Can be used back-to-back
                getCost: (_round, _intensity) => 8,
                buildWave: (_context, _round, _intensity) => {
                    return [
                        { enemyType: EnemyType.GNOLL, count: 1, spawnPattern: 'screen_edges', formation: 'spread' }
                    ];
                }
            },
            {
                id: 'filler_archer',
                name: 'Distant Threat',
                description: 'Single archer for ranged pressure',
                tags: ['poke'],
                baseCost: 12,
                minRound: 1,
                cooldownBeats: 0,
                getCost: (_round, _intensity) => 12,
                buildWave: (_context, _round, _intensity) => {
                    return [
                        { enemyType: EnemyType.ARCHER, count: 1, spawnPattern: 'screen_edges', formation: 'spread' }
                    ];
                }
            },
            {
                id: 'filler_pair',
                name: 'Scout Pair',
                description: 'Two enemies for quick pressure',
                tags: ['mixed'],
                baseCost: 16,
                minRound: 1,
                cooldownBeats: 1,
                getCost: (_round, _intensity) => 16,
                buildWave: (_context, _round, _intensity) => {
                    return [
                        { enemyType: EnemyType.GNOLL, count: 2, spawnPattern: 'flanking', formation: 'spread' }
                    ];
                }
            }
        ];
        
        // Register all packages
        packages.forEach(pkg => {
            this.packageLibrary.set(pkg.id, {
                package: pkg,
                enabled: true,
                lastUsedRound: -1,
                lastUsedBeat: -1,
                timesUsed: 0
            });
        });
    }
    
    // ========================================================================
    // CANDIDATE GENERATION
    // ========================================================================
    
    /**
     * Generate valid package candidates based on constraints
     * With flexible budget checking - allows packages up to 30% over budget
     * to ensure budget can be exhausted
     */
    public generateCandidates(
        context: GameContext,
        round: number,
        maxBudget: number,
        currentEnemyCount: number,
        maxEnemies: number
    ): PackageCandidate[] {
        const candidates: PackageCandidate[] = [];
        const currentBeat = this.directorState.totalBeatsThisRound;
        
        // Budget with small flexibility to exhaust remainder
        // Allow 10-15% overage to ensure budget is fully used
        const flexibleBudget = maxBudget < 15 ? maxBudget + 10 : Math.floor(maxBudget * 1.1);
        
        this.packageLibrary.forEach((entry, id) => {
            if (!entry.enabled) return;
            
            const pkg = entry.package;
            
            // Check round constraints
            if (round < pkg.minRound) return;
            if (pkg.maxRound !== undefined && round > pkg.maxRound) return;
            
            // Check cooldown (but relax for filler packages when budget is low)
            const beatsSinceUsed = currentBeat - entry.lastUsedBeat;
            const isFiller = pkg.id.startsWith('filler_') || pkg.id === 'breather_light';
            const relaxCooldown = maxBudget < 25 && isFiller;
            if (entry.lastUsedBeat >= 0 && beatsSinceUsed < pkg.cooldownBeats && !relaxCooldown) return;
            
            // Check no-repeat rule (relax for filler packages when budget is low)
            if (this.directorState.lastNPackages.includes(id) && !relaxCooldown) return;
            
            // Calculate costs for each intensity level
            for (const intensity of [IntensityLevel.LOW, IntensityLevel.MEDIUM, IntensityLevel.HIGH]) {
                const cost = pkg.getCost(round, intensity);
                
                // Check budget with flexibility
                if (cost > flexibleBudget) continue;
                
                // Estimate enemy count from this package
                const wave = pkg.buildWave(context, round, intensity);
                const enemyCount = wave.reduce((sum, cmd) => sum + cmd.count, 0);
                
                // Check max enemies constraint (also with flexibility for single enemies)
                const enemyFlexibility = enemyCount === 1 ? 1 : 0;
                if (currentEnemyCount + enemyCount > maxEnemies + enemyFlexibility) continue;
                
                // Calculate novelty/repetition scores
                const noveltyBonus = this.calculateNoveltyBonus(pkg, context);
                const repetitionPenalty = this.calculateRepetitionPenalty(pkg, context);
                
                // Prioritize packages that fit within actual budget
                const overBudgetPenalty = cost > maxBudget ? 0.3 : 0;
                
                candidates.push({
                    package: pkg,
                    intensity,
                    cost,
                    mlScore: 0,  // Will be filled by MLSelector
                    noveltyBonus,
                    repetitionPenalty: repetitionPenalty + overBudgetPenalty,
                    finalScore: 0  // Will be calculated after ML scoring
                });
            }
        });
        
        return candidates;
    }
    
    // ========================================================================
    // VARIETY SCORING
    // ========================================================================
    
    /**
     * Calculate bonus for package novelty
     */
    private calculateNoveltyBonus(pkg: SpawnPackage, context: GameContext): number {
        let bonus = 0;
        
        // Bonus for unused or rarely used packages
        const usage = this.directorState.packageUsageHistory.get(pkg.id) || 0;
        if (usage === 0) bonus += 0.3;
        else if (usage < 3) bonus += 0.15;
        
        // Bonus for tags not seen recently
        for (const tag of pkg.tags) {
            const timeSince = context.timeSinceTagUsed.get(tag) || 999;
            if (timeSince > 5) bonus += 0.1;
            else if (timeSince > 3) bonus += 0.05;
        }
        
        // Bonus for counter-picking player's playstyle
        if (context.kitingScore > 0.6 && pkg.tags.includes('antiKite')) bonus += 0.2;
        if (context.campingScore > 0.6 && pkg.tags.includes('antiCamp')) bonus += 0.2;
        if (context.aoeDamageRatio > 0.6 && pkg.tags.includes('antiAoE')) bonus += 0.2;
        if (context.singleTargetFocusScore > 0.6 && pkg.tags.includes('antiSingleTarget')) bonus += 0.2;
        if (context.defensivePlayScore > 0.6 && pkg.tags.includes('antiTank')) bonus += 0.2;
        
        return bonus;
    }
    
    /**
     * Calculate penalty for repetitive packages
     */
    private calculateRepetitionPenalty(pkg: SpawnPackage, context: GameContext): number {
        let penalty = 0;
        
        // Heavy penalty for same package streak
        if (this.directorState.lastPackageId === pkg.id) {
            penalty += 0.5;
        }
        
        // Penalty for same package in recent history
        const recentCount = this.directorState.lastNPackages.filter(id => id === pkg.id).length;
        penalty += recentCount * 0.2;
        
        // Penalty for same tags repeated
        for (const tag of pkg.tags) {
            if (this.directorState.lastTags.includes(tag)) {
                penalty += 0.15;
            }
        }
        
        // Anti-synergy penalty
        if (pkg.antiSynergyTags) {
            for (const antiTag of pkg.antiSynergyTags) {
                if (context.recentPackageTags.includes(antiTag)) {
                    penalty += 0.25;
                }
            }
        }
        
        // Entropy penalty (low variety = higher penalty)
        const entropy = this.calculateTagEntropy(context.recentPackageTags);
        if (entropy < 0.5) penalty += 0.1;
        
        return penalty;
    }
    
    /**
     * Calculate Shannon entropy of recent tags
     */
    private calculateTagEntropy(tags: PackageTag[]): number {
        if (tags.length === 0) return 1.0;
        
        const counts = new Map<PackageTag, number>();
        tags.forEach(tag => counts.set(tag, (counts.get(tag) || 0) + 1));
        
        let entropy = 0;
        const total = tags.length;
        counts.forEach(count => {
            const p = count / total;
            entropy -= p * Math.log2(p);
        });
        
        // Normalize to 0-1
        const maxEntropy = Math.log2(counts.size || 1);
        return maxEntropy > 0 ? entropy / maxEntropy : 1.0;
    }
    
    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================
    
    /**
     * Record that a package was selected
     */
    public recordPackageSelection(packageId: string, _intensity: IntensityLevel): void {
        const entry = this.packageLibrary.get(packageId);
        if (!entry) return;
        
        const pkg = entry.package;
        
        // Update library entry
        entry.lastUsedRound = this.directorState.currentRound;
        entry.lastUsedBeat = this.directorState.totalBeatsThisRound;
        entry.timesUsed++;
        
        // Update usage history
        this.directorState.packageUsageHistory.set(
            packageId, 
            (this.directorState.packageUsageHistory.get(packageId) || 0) + 1
        );
        
        // Update tag usage
        pkg.tags.forEach(tag => {
            this.directorState.tagUsageHistory.set(
                tag,
                (this.directorState.tagUsageHistory.get(tag) || 0) + 1
            );
        });
        
        // Update streak tracking
        if (this.directorState.lastPackageId === packageId) {
            this.directorState.samePackageStreak++;
        } else {
            this.directorState.samePackageStreak = 1;
        }
        
        const commonTags = pkg.tags.filter(t => this.directorState.lastTags.includes(t));
        if (commonTags.length > 0) {
            this.directorState.sameTagStreak++;
        } else {
            this.directorState.sameTagStreak = 1;
        }
        
        // Update recent history
        this.directorState.lastNPackages.push(packageId);
        if (this.directorState.lastNPackages.length > this.NO_REPEAT_LAST_N) {
            this.directorState.lastNPackages.shift();
        }
        
        this.directorState.lastNTags.push(...pkg.tags);
        while (this.directorState.lastNTags.length > this.DIVERSITY_PENALTY_WINDOW * 2) {
            this.directorState.lastNTags.shift();
        }
        
        this.directorState.lastPackageId = packageId;
        this.directorState.lastTags = [...pkg.tags];
        this.directorState.totalBeatsThisRound++;
    }
    
    /**
     * Start a new round
     */
    public startNewRound(round: number): void {
        this.directorState.currentRound = round;
        this.directorState.totalBeatsThisRound = 0;
        this.directorState.beatHistory = [];
        this.directorState.currentBeat = null;
        
        // Reset variety constraints for new round
        this.directorState.lastNPackages = [];
        this.directorState.lastNTags = [];
        this.directorState.samePackageStreak = 0;
        this.directorState.sameTagStreak = 0;
        
        // Reset all package cooldowns for fresh round (cooldowns are per-round)
        this.packageLibrary.forEach((entry) => {
            entry.lastUsedBeat = -1;
        });
    }
    
    /**
     * Get a specific package by ID
     */
    public getPackage(id: string): SpawnPackage | null {
        return this.packageLibrary.get(id)?.package || null;
    }
    
    /**
     * Get breather package (low intensity)
     */
    public getBreatherPackage(): SpawnPackage {
        return this.packageLibrary.get('breather_light')!.package;
    }
    
    /**
     * Get current director state
     */
    public getState(): DirectorState {
        return this.directorState;
    }
    
    /**
     * Get boredom metrics for reward shaping
     */
    public getBoredomMetrics(): { samePackageStreak: number; sameTagStreak: number; entropy: number } {
        return {
            samePackageStreak: this.directorState.samePackageStreak,
            sameTagStreak: this.directorState.sameTagStreak,
            entropy: this.calculateTagEntropy(this.directorState.lastNTags)
        };
    }
}

