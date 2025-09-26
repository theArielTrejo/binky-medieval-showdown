import { Scene } from 'phaser';

export enum EnemyType {
    TANK = 'tank',
    PROJECTILE = 'projectile',
    SPEEDSTER = 'speedster',
    BOSS = 'boss',
    ELITE_TANK = 'elite_tank',
    SNIPER = 'sniper',
    SWARM = 'swarm',
    BERSERKER = 'berserker'
}

export interface EnemyStats {
    health: number;
    speed: number;
    damage: number;
    size: number;
    xpValue: number;
    cost: number;           // Dynamic cost for AI resource management
    threatLevel: number;    // Overall combat effectiveness rating
    specialAbilities: string[]; // List of special abilities
}

export class Enemy {
    public sprite: Phaser.GameObjects.Sprite;
    public type: EnemyType;
    public stats: EnemyStats;
    public currentHealth: number;
    public scene: Scene;
    private currentAnimation: string = '';

    constructor(scene: Scene, x: number, y: number, type: EnemyType) {
        this.scene = scene;
        this.type = type;
        this.stats = this.getStatsForType(type);
        this.currentHealth = this.stats.health;
        
        // Create sprite based on enemy type
        const spriteKey = this.getSpriteKeyForType(type);
        this.sprite = scene.add.sprite(x, y, spriteKey);
        this.sprite.setScale(this.getScaleForType(type));
        this.sprite.setData('enemy', this);
        
        // Start with idle animation
        this.playAnimation('idle');
    }

    private getStatsForType(type: EnemyType): EnemyStats {
        let baseStats: Omit<EnemyStats, 'cost' | 'threatLevel' | 'specialAbilities'>;
        let specialAbilities: string[];
        
        switch (type) {
            case EnemyType.TANK:
                baseStats = {
                    health: 80,
                    speed: 40,
                    damage: 8,
                    size: 40,
                    xpValue: 15
                };
                specialAbilities = ['armor', 'charge_attack'];
                break;
            case EnemyType.PROJECTILE:
                baseStats = {
                    health: 15,
                    speed: 120,
                    damage: 5,
                    size: 15,
                    xpValue: 5
                };
                specialAbilities = ['ranged_attack', 'swarm_tactics'];
                break;
            case EnemyType.SPEEDSTER:
                baseStats = {
                    health: 25,
                    speed: 180,
                    damage: 6,
                    size: 20,
                    xpValue: 8
                };
                specialAbilities = ['hit_and_run', 'evasion'];
                break;
            case EnemyType.BOSS:
                baseStats = {
                    health: 400,
                    speed: 25,
                    damage: 15,
                    size: 80,
                    xpValue: 100
                };
                specialAbilities = ['area_attack', 'damage_resistance', 'minion_spawn'];
                break;
            case EnemyType.ELITE_TANK:
                baseStats = {
                    health: 300,
                    speed: 60,
                    damage: 40,
                    size: 50,
                    xpValue: 35
                };
                specialAbilities = ['armor', 'charge_attack', 'damage_resistance'];
                break;
            case EnemyType.SNIPER:
                baseStats = {
                    health: 80,
                    speed: 40,
                    damage: 60,
                    size: 30,
                    xpValue: 25
                };
                specialAbilities = ['ranged_attack', 'precision_shot'];
                break;
            case EnemyType.SWARM:
                baseStats = {
                    health: 30,
                    speed: 100,
                    damage: 10,
                    size: 15,
                    xpValue: 5
                };
                specialAbilities = ['swarm_tactics', 'hit_and_run'];
                break;
            case EnemyType.BERSERKER:
                baseStats = {
                    health: 200,
                    speed: 90,
                    damage: 45,
                    size: 35,
                    xpValue: 30
                };
                specialAbilities = ['rage_mode', 'charge_attack'];
                break;
        }
        
        // Calculate dynamic cost and threat level using static methods
        const cost = EnemySystem.calculateEnemyCost(baseStats, specialAbilities);
        const threatLevel = EnemySystem.calculateThreatLevel(baseStats, specialAbilities);
        
        return {
            ...baseStats,
            cost,
            threatLevel,
            specialAbilities
        };
    }

    private getSpriteKeyForType(type: EnemyType): string {
        switch (type) {
            case EnemyType.TANK:
                return 'skeleton_viking_idle';
            case EnemyType.PROJECTILE:
                return 'archer_mob_idle';
            case EnemyType.SPEEDSTER:
                return 'gnoll_idle';
            case EnemyType.BOSS:
            case EnemyType.ELITE_TANK:
                return 'golem_idle';
            case EnemyType.SNIPER:
                return 'archer_mob_idle';
            case EnemyType.SWARM:
                return 'gnoll_idle';
            case EnemyType.BERSERKER:
                return 'skeleton_viking_idle';
            default:
                return 'skeleton_viking_idle';
        }
    }

    private getScaleForType(type: EnemyType): number {
        switch (type) {
            case EnemyType.TANK:
                return 0.3;
            case EnemyType.PROJECTILE:
                return 0.25;
            case EnemyType.SPEEDSTER:
                return 0.28;
            case EnemyType.BOSS:
                return 0.5;
            case EnemyType.ELITE_TANK:
                return 0.4;
            case EnemyType.SNIPER:
                return 0.25;
            case EnemyType.SWARM:
                return 0.2;
            case EnemyType.BERSERKER:
                return 0.35;
            default:
                return 0.3;
        }
    }



    private playAnimation(animationName: string): void {
        if (this.currentAnimation !== animationName && this.sprite.anims) {
            this.sprite.play(animationName, true);
            this.currentAnimation = animationName;
        }
    }

    /**
     * Applies damage to the enemy
     * @param amount - Amount of damage to apply
     * @returns True if enemy died, false if it survived
     */
    public takeDamage(amount: number): boolean {
        this.currentHealth -= amount;
        if (this.currentHealth <= 0) {
            this.destroy();
            return true; // Enemy died
        }
        return false; // Enemy survived
    }

    /**
     * Updates the enemy's position and behavior
     * @param playerX - Player's X coordinate
     * @param playerY - Player's Y coordinate
     * @param deltaTime - Time elapsed since last frame in seconds
     */
    public update(playerX: number, playerY: number, deltaTime: number): void {
        // Simple AI: move towards player
        const dx = playerX - this.sprite.x;
        const dy = playerY - this.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) { // Only move if not too close
            const moveX = (dx / distance) * this.stats.speed * deltaTime;
            const moveY = (dy / distance) * this.stats.speed * deltaTime;
            
            this.sprite.x += moveX;
            this.sprite.y += moveY;
            
            // Play running animation when moving
            this.playAnimation(this.getRunningAnimationKey());
            
            // Flip sprite based on movement direction
            if (dx < 0) {
                this.sprite.setFlipX(true);
            } else if (dx > 0) {
                this.sprite.setFlipX(false);
            }
        } else {
            // Play idle animation when not moving
            this.playAnimation(this.getIdleAnimationKey());
        }
    }

    private getIdleAnimationKey(): string {
        switch (this.type) {
            case EnemyType.TANK:
                return 'skeleton_viking_idle';
            case EnemyType.PROJECTILE:
                return 'archer_mob_idle';
            case EnemyType.SPEEDSTER:
                return 'gnoll_idle';
            case EnemyType.BOSS:
            case EnemyType.ELITE_TANK:
                return 'golem_idle';
            case EnemyType.SNIPER:
                return 'archer_mob_idle';
            case EnemyType.SWARM:
                return 'gnoll_idle';
            case EnemyType.BERSERKER:
                return 'skeleton_viking_idle';
            default:
                return 'skeleton_viking_idle';
        }
    }

    private getRunningAnimationKey(): string {
        switch (this.type) {
            case EnemyType.TANK:
                return 'skeleton_viking_running';
            case EnemyType.PROJECTILE:
                return 'archer_mob_running';
            case EnemyType.SPEEDSTER:
                return 'gnoll_running';
            case EnemyType.BOSS:
            case EnemyType.ELITE_TANK:
                return 'golem_walking';
            case EnemyType.SNIPER:
                return 'archer_mob_running';
            case EnemyType.SWARM:
                return 'gnoll_running';
            case EnemyType.BERSERKER:
                return 'skeleton_viking_running';
            default:
                return 'skeleton_viking_running';
        }
    }

    /**
     * Destroys the enemy and cleans up its sprite
     */
    public destroy(): void {
        this.sprite.destroy();
    }

    /**
     * Gets the resource cost of this enemy
     * @returns The cost value for AI resource management
     */
    public getCost(): number {
        return this.stats.cost;
    }

    /**
     * Gets the threat level of this enemy
     * @returns The threat level rating (0-100)
     */
    public getThreatLevel(): number {
        return this.stats.threatLevel;
    }

    /**
     * Gets the list of special abilities for this enemy
     * @returns Array of special ability names
     */
    public getSpecialAbilities(): string[] {
        return this.stats.specialAbilities;
    }
}

export class EnemySystem {
    private scene: Scene;
    private enemies: Enemy[] = [];
    private spawnRate: number = 1.0;
    private maxEnemies: number = 50;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    /**
     * Spawns a wave of enemies of the specified type
     * @param enemyType - Type of enemy to spawn
     * @param count - Number of enemies to spawn
     * @param location - Spawn location strategy ('near_player', 'screen_edges', 'random_ambush')
     * @param playerX - Player's X coordinate for positioning
     * @param playerY - Player's Y coordinate for positioning
     */
    public spawnWave(enemyType: EnemyType, count: number, location: string, playerX: number = 512, playerY: number = 384): void {
        if (this.enemies.length >= this.maxEnemies) {
            return; // Don't spawn if max is reached
        }

        const remainingCapacity = this.maxEnemies - this.enemies.length;
        const spawnCount = Math.min(count, remainingCapacity);

        for (let i = 0; i < spawnCount; i++) {
            const spawnPos = this.getSpawnPosition(location, playerX, playerY);
            const enemy = new Enemy(this.scene, spawnPos.x, spawnPos.y, enemyType);
            this.enemies.push(enemy);
        }
    }

    private getSpawnPosition(location: string, playerX: number, playerY: number): { x: number; y: number } {
        const gameWidth = 1024;
        const gameHeight = 768;
        const safeZoneRadius = 200; // Safe zone around player
        
        let spawnX, spawnY;
        let attempts = 0;
        const maxAttempts = 20;
        
        do {
            switch (location) {
                case 'near_player':
                    // Spawn in a circle around player but outside safe zone
                    const angle = Math.random() * Math.PI * 2;
                    const distance = safeZoneRadius + 50 + Math.random() * 100;
                    spawnX = playerX + Math.cos(angle) * distance;
                    spawnY = playerY + Math.sin(angle) * distance;
                    break;
                case 'screen_edges':
                    const edge = Math.floor(Math.random() * 4);
                    switch (edge) {
                        case 0: spawnX = Math.random() * gameWidth; spawnY = 0; break; // Top
                        case 1: spawnX = gameWidth; spawnY = Math.random() * gameHeight; break; // Right
                        case 2: spawnX = Math.random() * gameWidth; spawnY = gameHeight; break; // Bottom
                        case 3: spawnX = 0; spawnY = Math.random() * gameHeight; break; // Left
                        default: spawnX = 0; spawnY = 0;
                    }
                    break;
                case 'random_ambush':
                default:
                    spawnX = Math.random() * gameWidth;
                    spawnY = Math.random() * gameHeight;
                    break;
            }
            
            // Ensure spawn position is within game bounds
            spawnX = Math.max(20, Math.min(gameWidth - 20, spawnX));
            spawnY = Math.max(20, Math.min(gameHeight - 20, spawnY));
            
            attempts++;
        } while (this.isInSafeZone(spawnX, spawnY, playerX, playerY, safeZoneRadius) && attempts < maxAttempts);
        
        return { x: spawnX, y: spawnY };
    }
    
    private isInSafeZone(x: number, y: number, playerX: number, playerY: number, safeRadius: number): boolean {
        const distance = Math.sqrt(Math.pow(x - playerX, 2) + Math.pow(y - playerY, 2));
        return distance < safeRadius;
    }

    /**
     * Starts a special enemy event
     * @param eventType - Type of special event to trigger
     */
    public startSpecialEvent(eventType: string): void {
        switch (eventType) {
            case 'boss_encounter':
                this.spawnWave(EnemyType.BOSS, 1, 'screen_edges');
                break;
        }
    }

    /**
     * Increases the spawn rate by a percentage
     * @param percentage - Percentage increase in spawn rate
     */
    public increaseSpawnRate(percentage: number): void {
        this.spawnRate *= (1 + percentage / 100);
    }

    /**
     * Updates all enemies in the system
     * @param playerX - Player's X coordinate
     * @param playerY - Player's Y coordinate
     * @param deltaTime - Time elapsed since last frame in seconds
     */
    public update(playerX: number, playerY: number, deltaTime: number): void {
        this.enemies.forEach(enemy => {
            enemy.update(playerX, playerY, deltaTime);
        });
        
        // Remove destroyed enemies
        this.enemies = this.enemies.filter(enemy => enemy.sprite.active);
    }

    /**
     * Gets the total number of active enemies
     * @returns Current enemy count
     */
    public getEnemyCount(): number {
        return this.enemies.length;
    }

    /**
     * Gets the count of enemies of a specific type
     * @param type - The enemy type to count
     * @returns Number of enemies of the specified type
     */
    public getEnemyCountByType(type: EnemyType): number {
        return this.enemies.filter(enemy => enemy.type === type).length;
    }

    /**
     * Gets the array of all active enemies
     * @returns Array of enemy objects
     */
    public getEnemies(): Enemy[] {
        return this.enemies;
    }

    /**
     * Destroys all enemies and clears the enemy array
     */
    public clearAllEnemies(): void {
        this.enemies.forEach(enemy => enemy.destroy());
        this.enemies = [];
    }

    // Dynamic cost calculation based on combat effectiveness
    public static calculateEnemyCost(stats: Omit<EnemyStats, 'cost' | 'threatLevel' | 'specialAbilities'>, abilities: string[]): number {
        // Base cost calculation
        let baseCost = Math.round(
            (stats.health * 0.1) + 
            (stats.damage * 2) + 
            (stats.speed * 0.5) + 
            (stats.xpValue * 0.3)
        );
        
        // Ability multipliers
        let abilityMultiplier = 1.0;
        abilities.forEach(ability => {
            switch (ability) {
                case 'armor_plating':
                case 'shield_regeneration':
                    abilityMultiplier += 0.3;
                    break;
                case 'speed_boost':
                case 'phase_shift':
                    abilityMultiplier += 0.2;
                    break;
                case 'explosive_death':
                case 'projectile_attack':
                    abilityMultiplier += 0.25;
                    break;
                case 'boss_abilities':
                case 'area_damage':
                    abilityMultiplier += 0.5;
                    break;
                case 'rage_mode':
                case 'charge_attack':
                    abilityMultiplier += 0.35;
                    break;
                default:
                    abilityMultiplier += 0.1;
            }
        });
        
        return Math.max(1, Math.round(baseCost * abilityMultiplier));
    }



    // Calculate overall threat level (0-10 scale)
    public static calculateThreatLevel(stats: Omit<EnemyStats, 'cost' | 'threatLevel' | 'specialAbilities'>, abilities: string[]): number {
        // Base threat calculation (0-100 scale)
        let baseThreat = Math.min(100, Math.round(
            (stats.health * 0.15) + 
            (stats.damage * 3) + 
            (stats.speed * 0.8) + 
            (stats.xpValue * 0.4)
        ));
        
        // Ability threat modifiers
        let threatModifier = 0;
        abilities.forEach(ability => {
            switch (ability) {
                case 'armor_plating':
                    threatModifier += 15;
                    break;
                case 'shield_regeneration':
                    threatModifier += 20;
                    break;
                case 'speed_boost':
                    threatModifier += 10;
                    break;
                case 'phase_shift':
                    threatModifier += 25;
                    break;
                case 'explosive_death':
                    threatModifier += 12;
                    break;
                case 'projectile_attack':
                    threatModifier += 18;
                    break;
                case 'boss_abilities':
                    threatModifier += 40;
                    break;
                case 'area_damage':
                    threatModifier += 30;
                    break;
                case 'rage_mode':
                    threatModifier += 22;
                    break;
                case 'charge_attack':
                    threatModifier += 16;
                    break;
                default:
                    threatModifier += 5;
            }
        });
        
        return Math.min(100, Math.max(1, baseThreat + threatModifier));
    }



    /**
     * Gets the total resource cost of all current enemies
     * @returns Sum of all enemy costs
     */
    public getTotalEnemyCost(): number {
        return this.enemies.reduce((total, enemy) => total + enemy.getCost(), 0);
    }

    // Get average threat level of current enemies
    public getAverageThreatLevel(): number {
        if (this.enemies.length === 0) return 0;
        const totalThreat = this.enemies.reduce((total, enemy) => total + enemy.getThreatLevel(), 0);
        return Math.round((totalThreat / this.enemies.length) * 10) / 10;
    }

    // Get cost breakdown by enemy type
    public getCostBreakdown(): { [key: string]: { count: number; totalCost: number; avgThreat: number } } {
        const breakdown: { [key: string]: { count: number; totalCost: number; avgThreat: number } } = {};
        
        this.enemies.forEach(enemy => {
            const type = enemy.type;
            if (!breakdown[type]) {
                breakdown[type] = { count: 0, totalCost: 0, avgThreat: 0 };
            }
            breakdown[type].count++;
            breakdown[type].totalCost += enemy.getCost();
            breakdown[type].avgThreat += enemy.getThreatLevel();
        });
        
        // Calculate averages
        Object.keys(breakdown).forEach(type => {
            breakdown[type].avgThreat = Math.round((breakdown[type].avgThreat / breakdown[type].count) * 10) / 10;
        });
        
        return breakdown;
    }

}