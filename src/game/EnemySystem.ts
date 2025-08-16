import { Scene } from 'phaser';

export enum EnemyType {
    TANK = 'tank',
    PROJECTILE = 'projectile',
    SPEEDSTER = 'speedster',
    BOSS = 'boss'
}

export interface EnemyStats {
    health: number;
    speed: number;
    damage: number;
    size: number;
    xpValue: number;
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
        switch (type) {
            case EnemyType.TANK:
                return {
                    health: 80,
                    speed: 40,
                    damage: 8,  // Reduced from 30
                    size: 40,
                    xpValue: 15
                };
            case EnemyType.PROJECTILE:
                return {
                    health: 15,
                    speed: 120,  // Reduced from 200
                    damage: 5,   // Reduced from 15
                    size: 15,
                    xpValue: 5
                };
            case EnemyType.SPEEDSTER:
                return {
                    health: 25,
                    speed: 180,  // Reduced from 300
                    damage: 6,   // Reduced from 20
                    size: 20,
                    xpValue: 8
                };
            case EnemyType.BOSS:
                return {
                    health: 400,  // Reduced from 500
                    speed: 25,
                    damage: 15,   // Reduced from 50
                    size: 80,
                    xpValue: 100
                };
        }
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
}