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
    public sprite: Phaser.GameObjects.Rectangle;
    public type: EnemyType;
    public stats: EnemyStats;
    public currentHealth: number;
    public scene: Scene;

    constructor(scene: Scene, x: number, y: number, type: EnemyType) {
        this.scene = scene;
        this.type = type;
        this.stats = this.getStatsForType(type);
        this.currentHealth = this.stats.health;
        
        // Create a simple colored rectangle for the enemy
        const color = this.getColorForType(type);
        this.sprite = scene.add.rectangle(x, y, this.stats.size, this.stats.size, color);
        this.sprite.setData('enemy', this);
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
        const cost = EnemySystem.calculateEnemyCostStatic(baseStats, specialAbilities);
        const threatLevel = EnemySystem.calculateThreatLevelStatic(baseStats, specialAbilities);
        
        return {
            ...baseStats,
            cost,
            threatLevel,
            specialAbilities
        };
    }

    private getColorForType(type: EnemyType): number {
        switch (type) {
            case EnemyType.TANK:
                return 0x8B4513; // Brown
            case EnemyType.PROJECTILE:
                return 0xFF4500; // Orange Red
            case EnemyType.SPEEDSTER:
                return 0x00FF00; // Green
            case EnemyType.BOSS:
                return 0x800080; // Purple
            case EnemyType.ELITE_TANK:
                return 0x654321; // Dark Brown
            case EnemyType.SNIPER:
                return 0x8B0000; // Dark Red
            case EnemyType.SWARM:
                return 0xFFFF00; // Yellow
            case EnemyType.BERSERKER:
                return 0xFF0000; // Red
        }
    }

    public takeDamage(amount: number): boolean {
        this.currentHealth -= amount;
        if (this.currentHealth <= 0) {
            this.destroy();
            return true; // Enemy died
        }
        return false;
    }

    public update(playerX: number, playerY: number, deltaTime: number): void {
        // Simple AI: move towards player
        const dx = playerX - this.sprite.x;
        const dy = playerY - this.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const moveX = (dx / distance) * this.stats.speed * deltaTime;
            const moveY = (dy / distance) * this.stats.speed * deltaTime;
            
            this.sprite.x += moveX;
            this.sprite.y += moveY;
        }
    }

    public destroy(): void {
        this.sprite.destroy();
    }

    public getCost(): number {
        return this.stats.cost;
    }

    public getThreatLevel(): number {
        return this.stats.threatLevel;
    }

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

    public startSpecialEvent(eventType: string): void {
        switch (eventType) {
            case 'boss_encounter':
                this.spawnWave(EnemyType.BOSS, 1, 'screen_edges');
                break;
        }
    }

    public increaseSpawnRate(percentage: number): void {
        this.spawnRate *= (1 + percentage / 100);
    }

    public update(playerX: number, playerY: number, deltaTime: number): void {
        this.enemies.forEach(enemy => {
            enemy.update(playerX, playerY, deltaTime);
        });
        
        // Remove destroyed enemies
        this.enemies = this.enemies.filter(enemy => enemy.sprite.active);
    }

    public getEnemyCount(): number {
        return this.enemies.length;
    }

    public getEnemyCountByType(type: EnemyType): number {
        return this.enemies.filter(enemy => enemy.type === type).length;
    }

    public getEnemies(): Enemy[] {
        return this.enemies;
    }

    public clearAllEnemies(): void {
        this.enemies.forEach(enemy => enemy.destroy());
        this.enemies = [];
    }

    // Dynamic cost calculation based on combat effectiveness
    public static calculateEnemyCostStatic(stats: Omit<EnemyStats, 'cost' | 'threatLevel' | 'specialAbilities'>, abilities: string[]): number {
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
    public static calculateThreatLevelStatic(stats: Omit<EnemyStats, 'cost' | 'threatLevel' | 'specialAbilities'>, abilities: string[]): number {
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



    // Get total cost of all current enemies
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