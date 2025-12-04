import { Scene } from 'phaser';
import { EnemyType, EnemyAttackResult } from '../types/EnemyTypes';
import { Enemy } from '../enemies/Enemy';
import { XPOrbSystem } from './XPOrbSystem';

import { Shield } from '../enemies/attacks/Shield';
import { ConeAttack } from '../enemies/attacks/ConeAttack';
import { ExplosionAttack } from '../enemies/attacks/ExplosionAttack';
import { VortexAttack } from '../enemies/attacks/VortexAttack';
import { LightningStrikeAttack } from '../enemies/attacks/LightningStrikeAttack';
import { MeleeAttack } from '../enemies/attacks/MeleeAttack';
import { EnemyProjectile } from '../enemies/attacks/EnemyProjectile';
import { ArrowProjectile } from '../enemies/attacks/ArrowProjectile';
import { ClawAttack } from '../enemies/attacks/ClawAttack';

// Re-export EnemyType for backward compatibility
export { EnemyType };
export { Enemy };

export class EnemySystem {
    private scene: Scene;
    private enemies: Enemy[] = [];
    private projectiles: EnemyProjectile[] = [];
    private meleeAttacks: MeleeAttack[] = [];
    private shields: Shield[] = [];
    private coneAttacks: ConeAttack[] = [];
    private vortexAttacks: VortexAttack[] = [];
    private explosionAttacks: ExplosionAttack[] = [];
    private lightningStrikes: LightningStrikeAttack[] = [];
    private clawAttacks: ClawAttack[] = [];
    private arrowProjectiles: ArrowProjectile[] = [];
    public enemiesGroup: Phaser.Physics.Arcade.Group;
    private spawnRate: number = 1.0;
    private maxEnemies: number = 50;
    private player: any;
    private xpOrbSystem: XPOrbSystem | undefined;
    private spawnTimer: Phaser.Time.TimerEvent | null = null;
    private onEnemySpawnedCallback: ((enemy: Enemy) => void) | null = null;
    
    // Attack object management
    private activeProjectiles: EnemyProjectile[] = [];
    private activeShields: Shield[] = [];
    private activeConeAttacks: ConeAttack[] = [];
    private activeExplosionAttacks: ExplosionAttack[] = [];
    private activeVortexAttacks: VortexAttack[] = [];
    private activeMeleeAttacks: MeleeAttack[] = [];
    private activeLightningStrikes: LightningStrikeAttack[] = [];
    private activeClawAttacks: ClawAttack[] = [];
    private activeArrowProjectiles: ArrowProjectile[] = [];

    constructor(scene: Scene, player?: any, xpOrbSystem?: XPOrbSystem) {
        this.scene = scene;
        this.player = player;
        this.xpOrbSystem = xpOrbSystem;
        this.enemiesGroup = this.scene.physics.add.group();
    }

    /**
     * Sets a callback to be called whenever a new enemy is spawned
     * @param callback - Function to call with the newly spawned enemy
     */
    public setEnemySpawnedCallback(callback: (enemy: Enemy) => void): void {
        this.onEnemySpawnedCallback = callback;
    }

    /**
     * Starts the enemy spawning system
     */
    public startSpawning(): void {
        // Start a timer that spawns enemies periodically
        this.spawnTimer = this.scene.time.addEvent({
            delay: 2000 / this.spawnRate,
            callback: this.spawnRandomEnemy,
            callbackScope: this,
            loop: true
        });
        
        // console.log('Enemy spawning started');
    }

    /**
     * Stops the enemy spawning system
     */
    public stopSpawning(): void {
        if (this.spawnTimer) {
            this.spawnTimer.destroy();
            this.spawnTimer = null;
        }
    }

    /**
     * Spawns a random enemy near the player
     */
    private spawnRandomEnemy(): void {
        if (!this.player || this.enemies.length >= this.maxEnemies) {
            return;
        }

        // Get player position
        const playerX = this.player.x || 512;
        const playerY = this.player.y || 384;

        // Choose a random enemy type
        const enemyTypes = Object.values(EnemyType);
        const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)] as EnemyType;

        // Spawn the enemy
        this.spawnWave(randomType, 1, 'near_player', playerX, playerY);
    }

    /**
     * Spawns a single enemy at a specific position (for testing/debugging)
     * @param enemyType - Type of enemy to spawn
     * @param x - X coordinate to spawn at
     * @param y - Y coordinate to spawn at
     * @returns The spawned enemy or null if max enemies reached
     */
    public spawnEnemy(enemyType: EnemyType, x: number, y: number): Enemy | null {
        if (this.enemies.length >= this.maxEnemies) {
            console.warn('Max enemies reached, cannot spawn more');
            return null;
        }

        const enemy = new Enemy(this.scene, x, y, enemyType);
        this.enemies.push(enemy);
        this.enemiesGroup.add(enemy.sprite);
        return enemy;
    }

    /**
     * Spawns a wave of enemies of the specified type
     * @param enemyType - Type of enemy to spawn
     * @param count - Number of enemies to spawn
     * @param location - Spawn location strategy ('near_player', 'screen_edges', 'random_ambush')
     * @param playerX - Player's X coordinate for positioning
     * @param playerY - Player's Y coordinate for positioning
     * @returns Array of spawned enemies
     */
    public spawnWave(enemyType: EnemyType, count: number, location: string, playerX: number = 512, playerY: number = 384): Enemy[] {
        if (this.enemies.length >= this.maxEnemies) {
            return []; // Don't spawn if max is reached
        }

        const remainingCapacity = this.maxEnemies - this.enemies.length;
        const spawnCount = Math.min(count, remainingCapacity);
        const spawnedEnemies: Enemy[] = [];

        for (let i = 0; i < spawnCount; i++) {
            const spawnPos = this.getSpawnPosition(location, playerX, playerY);
            const enemy = new Enemy(this.scene, spawnPos.x, spawnPos.y, enemyType);
            this.enemies.push(enemy);
            this.enemiesGroup.add(enemy.sprite);
            spawnedEnemies.push(enemy);
            
            // Notify callback if registered
            if (this.onEnemySpawnedCallback) {
                this.onEnemySpawnedCallback(enemy);
            }
        }
        
        return spawnedEnemies;
    }

    /**
     * Spawn a single enemy at a specific position
     * @returns The spawned enemy, or null if max enemies reached
     */
    public spawnEnemyAt(enemyType: EnemyType, x: number, y: number): Enemy | null {
        if (this.enemies.length >= this.maxEnemies) {
            return null; // Don't spawn if max is reached
        }

        const enemy = new Enemy(this.scene, x, y, enemyType);
        this.enemies.push(enemy);
        this.enemiesGroup.add(enemy.sprite);
        return enemy;
    }

    private getSpawnPosition(location: string, playerX: number, playerY: number): { x: number; y: number } {
        // Get camera world view bounds instead of hardcoded screen dimensions
        const camera = this.scene.cameras.main;
        const worldView = camera.worldView;
        const gameWidth = worldView.width;
        const gameHeight = worldView.height;
        const cameraX = worldView.x;
        const cameraY = worldView.y;
        
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
                        case 0: spawnX = cameraX + Math.random() * gameWidth; spawnY = cameraY; break; // Top
                        case 1: spawnX = cameraX + gameWidth; spawnY = cameraY + Math.random() * gameHeight; break; // Right
                        case 2: spawnX = cameraX + Math.random() * gameWidth; spawnY = cameraY + gameHeight; break; // Bottom
                        case 3: spawnX = cameraX; spawnY = cameraY + Math.random() * gameHeight; break; // Left
                        default: spawnX = cameraX; spawnY = cameraY;
                    }
                    break;
                case 'random_ambush':
                default:
                    spawnX = cameraX + Math.random() * gameWidth;
                    spawnY = cameraY + Math.random() * gameHeight;
                    break;
            }
            
            // Ensure spawn position is within world bounds (get from physics world)
            const worldBounds = this.scene.physics.world.bounds;
            spawnX = Math.max(worldBounds.x + 20, Math.min(worldBounds.width - 20, spawnX));
            spawnY = Math.max(worldBounds.y + 20, Math.min(worldBounds.height - 20, spawnY));
            
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
                this.spawnWave(EnemyType.OGRE, 1, 'screen_edges');
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
        // Update enemies and collect new attacks
        this.enemies.forEach(enemy => {
            const attackResult: EnemyAttackResult | null = enemy.update(playerX, playerY, deltaTime);
            if (attackResult && attackResult.attackObject) {
                switch (attackResult.type) {
                    case 'projectile':
                        this.projectiles.push(attackResult.attackObject as EnemyProjectile);
                        break;
                    case 'melee':
                        this.meleeAttacks.push(attackResult.attackObject as MeleeAttack);
                        break;
                    case 'shield':
                        this.shields.push(attackResult.attackObject as Shield);
                        // Store reference to shield in enemy
                        (enemy as any).activeShield = attackResult.attackObject;
                        break;
                    case 'cone':
                        this.coneAttacks.push(attackResult.attackObject as ConeAttack);
                        break;
                    case 'vortex':
                        this.vortexAttacks.push(attackResult.attackObject as VortexAttack);
                        break;
                    case 'explosion':
                        this.explosionAttacks.push(attackResult.attackObject as ExplosionAttack);
                        break;
                    case 'lightning':
                        this.lightningStrikes.push(attackResult.attackObject as LightningStrikeAttack);
                        break;
                    case 'claw':
                        this.clawAttacks.push(attackResult.attackObject as ClawAttack);
                        break;
                    case 'arrow':
                        this.arrowProjectiles.push(attackResult.attackObject as ArrowProjectile);
                        break;
                }
            }
        });
        
        // Update all projectiles and check for shield collisions
        this.projectiles.forEach(projectile => {
            projectile.update(deltaTime);
            
            // Check if any shield blocks this projectile
            for (const shield of this.shields) {
                if (shield.isActive() && shield.blocksProjectile(projectile.sprite.x, projectile.sprite.y)) {
                    projectile.destroy();
                    console.log('Shield blocked projectile!');
                    break; // Projectile is blocked, no need to check other shields
                }
            }
        });
        
        // Update all melee attacks
        this.meleeAttacks.forEach(attack => {
            attack.update(deltaTime);
        });
        
        // Update all shields (follow their owners)
        this.shields.forEach(shield => {
            // Find the enemy that owns this shield
            const owner = this.enemies.find(e => (e as any).activeShield === shield);
            if (owner) {
                shield.update(deltaTime, owner.sprite.x, owner.sprite.y);
            } else {
                shield.update(deltaTime, shield.x, shield.y);
            }
        });
        
        // Update all cone attacks
        this.coneAttacks.forEach(attack => {
            attack.update(deltaTime);
        });
        
        // Update all vortex attacks
        this.vortexAttacks.forEach(attack => {
            attack.update(deltaTime);
        });
        
        // Update all explosion attacks
        this.explosionAttacks.forEach(attack => {
            attack.update(deltaTime);
        });
        
        // Update all lightning strikes
        this.lightningStrikes.forEach(attack => {
            attack.update(deltaTime);
        });
        
        // Update all claw attacks
        this.clawAttacks.forEach(attack => {
            attack.update(deltaTime);
        });
        
        // Update all arrow projectiles
        this.arrowProjectiles.forEach(arrow => {
            arrow.update(deltaTime);
        });
        
        // Clean up inactive shields from enemy references
        this.shields.forEach(shield => {
            if (!shield.isActive()) {
                this.enemies.forEach(enemy => {
                    if ((enemy as any).activeShield === shield) {
                        (enemy as any).activeShield = null;
                    }
                });
            }
        });
        
        // Remove destroyed enemies, inactive projectiles, and expired attacks
        this.enemies = this.enemies.filter(enemy => enemy.sprite.active);
        this.projectiles = this.projectiles.filter(projectile => projectile.isActive());
        this.meleeAttacks = this.meleeAttacks.filter(attack => attack.isActive());
        this.shields = this.shields.filter(shield => shield.isActive());
        this.coneAttacks = this.coneAttacks.filter(attack => attack.isActive());
        this.vortexAttacks = this.vortexAttacks.filter(attack => attack.isActive());
        this.explosionAttacks = this.explosionAttacks.filter(attack => attack.isActive());
        this.lightningStrikes = this.lightningStrikes.filter(attack => attack.isActive());
        this.clawAttacks = this.clawAttacks.filter(attack => attack.isActive());
        this.arrowProjectiles = this.arrowProjectiles.filter(arrow => arrow.isActive());
        // Update all active attack objects
        this.updateAttackObjects(deltaTime, playerX, playerY);
        
        // Remove destroyed enemies and spawn XP orbs
        this.enemies = this.enemies.filter(enemy => {
            const isDead = enemy.currentHealth <= 0;
            // Check if enemy is dead (health <= 0) or sprite was destroyed externally
            if (isDead || !enemy.sprite.active) {
                // Spawn XP orbs only if enemy died from damage (isDead)
                if (isDead && this.xpOrbSystem) {
                    // Use sprite position if active, otherwise try to use last known
                    const spawnX = enemy.sprite.active ? enemy.sprite.x : (enemy.sprite as any).x || 0;
                    const spawnY = enemy.sprite.active ? enemy.sprite.y : (enemy.sprite as any).y || 0;
                    
                    console.log(`Enemy died at (${spawnX}, ${spawnY}), spawning XP orbs with value ${enemy.stats.xpValue}`);
                    this.xpOrbSystem.spawnXPOrbs(
                        spawnX,
                        spawnY,
                        enemy.type,
                        enemy.stats.xpValue
                    );
                }

                // Ensure enemy is properly destroyed if it hasn't been already
                if (enemy.sprite.active) {
                    this.enemiesGroup.remove(enemy.sprite);
                    enemy.destroy();
                }
                return false; // Remove the enemy
            }
            return true; // Keep the enemy
        });
    }

    /**
     * Gets the total number of active enemies
     * @returns Current enemy count
     */
    public getEnemyCount(): number {
        return this.enemies.length;
    }


    /**
     * Updates all active attack objects and removes inactive ones
     * @param deltaTime - Time elapsed since last frame
     * @param playerX - Player's X position
     * @param playerY - Player's Y position
     */
    private updateAttackObjects(deltaTime: number, _playerX: number, _playerY: number): void {
        // Update and filter projectiles
        this.activeProjectiles = this.activeProjectiles.filter(projectile => {
            projectile.update(deltaTime);
            if (!projectile.isActive()) {
                projectile.destroy();
                return false;
            }
            return true;
        });

        // Update and filter shields (need enemy position for shields)
        this.activeShields = this.activeShields.filter(shield => {
            // Find the enemy that owns this shield (simplified - could be improved with owner tracking)
            const ownerEnemy = this.enemies.find(enemy => 
                Math.abs(enemy.sprite.x - shield.x) < 50 && Math.abs(enemy.sprite.y - shield.y) < 50
            );
            
            if (ownerEnemy) {
                shield.update(deltaTime, ownerEnemy.sprite.x, ownerEnemy.sprite.y);
            } else {
                shield.update(deltaTime, shield.x, shield.y);
            }
            
            if (!shield.isActive()) {
                shield.destroy();
                return false;
            }
            return true;
        });

        // Update and filter cone attacks
        this.activeConeAttacks = this.activeConeAttacks.filter(cone => {
            cone.update(deltaTime);
            if (!cone.isActive()) {
                cone.destroy();
                return false;
            }
            return true;
        });

        // Update and filter explosion attacks
        this.activeExplosionAttacks = this.activeExplosionAttacks.filter(explosion => {
            explosion.update(deltaTime);
            if (!explosion.isActive()) {
                explosion.destroy();
                return false;
            }
            return true;
        });

        // Update and filter vortex attacks
        this.activeVortexAttacks = this.activeVortexAttacks.filter(vortex => {
            vortex.update(deltaTime);
            if (!vortex.isActive()) {
                vortex.destroy();
                return false;
            }
            return true;
        });

        // Update and filter melee attacks
        this.activeMeleeAttacks = this.activeMeleeAttacks.filter(melee => {
            melee.update(deltaTime);
            if (!melee.isActive()) {
                melee.destroy();
                return false;
            }
            return true;
        });

        // Update and filter lightning strikes
        this.activeLightningStrikes = this.activeLightningStrikes.filter(lightning => {
            lightning.update(deltaTime);
            if (!lightning.isActive()) {
                lightning.destroy();
                return false;
            }
            return true;
        });

        // Update and filter claw attacks
        this.activeClawAttacks = this.activeClawAttacks.filter(claw => {
            claw.update(deltaTime);
            if (!claw.isActive()) {
                claw.destroy();
                return false;
            }
            return true;
        });
    }

    /**
     * Gets all active attack objects for collision detection
     * @returns Object containing arrays of all active attack objects
     */
    public getActiveAttacks(): {
        projectiles: EnemyProjectile[];
        shields: Shield[];
        coneAttacks: ConeAttack[];
        explosionAttacks: ExplosionAttack[];
        vortexAttacks: VortexAttack[];
        meleeAttacks: MeleeAttack[];
        lightningStrikes: LightningStrikeAttack[];
        clawAttacks: ClawAttack[];
        arrowProjectiles: ArrowProjectile[];
    } {
        return {
            projectiles: this.activeProjectiles,
            shields: this.activeShields,
            coneAttacks: this.activeConeAttacks,
            explosionAttacks: this.activeExplosionAttacks,
            vortexAttacks: this.activeVortexAttacks,
            meleeAttacks: this.activeMeleeAttacks,
            lightningStrikes: this.activeLightningStrikes,
            clawAttacks: this.activeClawAttacks,
            arrowProjectiles: this.activeArrowProjectiles
        };
    }

    /**
     * Clears all active attack objects
     */
    public clearAllAttacks(): void {
        // Destroy all attack objects
        [...this.activeProjectiles, ...this.activeShields, ...this.activeConeAttacks,
         ...this.activeExplosionAttacks, ...this.activeVortexAttacks, ...this.activeMeleeAttacks,
         ...this.activeLightningStrikes, ...this.activeClawAttacks, ...this.activeArrowProjectiles]
            .forEach(attack => attack.destroy());

        // Clear arrays
        this.activeProjectiles = [];
        this.activeShields = [];
        this.activeConeAttacks = [];
        this.activeExplosionAttacks = [];
        this.activeVortexAttacks = [];
        this.activeMeleeAttacks = [];
        this.activeLightningStrikes = [];
        this.activeClawAttacks = [];
        this.activeArrowProjectiles = [];
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
     * Gets all active projectiles
     * @returns Array of all active projectiles
     */
    public getProjectiles(): EnemyProjectile[] {
        return this.projectiles;
    }

    /**
     * Gets all active melee attacks
     * @returns Array of all active melee attacks
     */
    public getMeleeAttacks(): MeleeAttack[] {
        return this.meleeAttacks;
    }

    /**
     * Gets all active shields
     * @returns Array of all active shields
     */
    public getShields(): Shield[] {
        return this.shields;
    }

    /**
     * Gets all active cone attacks
     * @returns Array of all active cone attacks
     */
    public getConeAttacks(): ConeAttack[] {
        return this.coneAttacks;
    }

    /**
     * Gets all active vortex attacks
     * @returns Array of all active vortex attacks
     */
    public getVortexAttacks(): VortexAttack[] {
        return this.vortexAttacks;
    }

    /**
     * Gets all active explosion attacks
     * @returns Array of all active explosion attacks
     */
    public getExplosionAttacks(): ExplosionAttack[] {
        return this.explosionAttacks;
    }

    /**
     * Gets all active lightning strikes
     * @returns Array of all active lightning strikes
     */
    public getLightningStrikes(): LightningStrikeAttack[] {
        return this.lightningStrikes;
    }

    /**
     * Gets all active claw attacks
     * @returns Array of all active claw attacks
     */
    public getClawAttacks(): ClawAttack[] {
        return this.clawAttacks;
    }

    /**
     * Returns all active arrow projectiles
     */
    public getArrowProjectiles(): ArrowProjectile[] {
        return this.arrowProjectiles;
    }

    /**
     * Destroys all enemies and clears the enemy array
     */
    public clearAllEnemies(): void {
        this.enemies.forEach(enemy => enemy.destroy());
        this.enemies = [];
        this.projectiles.forEach(projectile => projectile.destroy());
        this.projectiles = [];
        this.meleeAttacks.forEach(attack => attack.destroy());
        this.meleeAttacks = [];
        this.shields.forEach(shield => shield.destroy());
        this.shields = [];
        this.coneAttacks.forEach(attack => attack.destroy());
        this.coneAttacks = [];
        this.vortexAttacks.forEach(attack => attack.destroy());
        this.vortexAttacks = [];
        this.explosionAttacks.forEach(attack => attack.destroy());
        this.explosionAttacks = [];
        this.lightningStrikes.forEach(attack => attack.destroy());
        this.lightningStrikes = [];
        this.clawAttacks.forEach(attack => attack.destroy());
        this.clawAttacks = [];
        this.arrowProjectiles.forEach(arrow => arrow.destroy());
        this.arrowProjectiles = [];
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