import { Scene } from 'phaser';
import { EnemyType, EnemyAttackResult } from '../types/EnemyTypes';
import { BaseEnemy } from '../enemies/BaseEnemy';
import { EnemyFactory } from '../enemies/EnemyFactory';
import { FallenAngelEnemy } from '../enemies/types/FallenAngelEnemy';
import { TombstoneEnemy } from '../enemies/types/TombstoneEnemy';
import { XPOrbSystem } from './XPOrbSystem';
import { HealthOrbSystem } from './HealthOrbSystem';

import { Shield } from '../enemies/attacks/Shield';
import { ConeAttack } from '../enemies/attacks/ConeAttack';
import { SpearAttack } from '../enemies/attacks/SpearAttack';
import { ExplosionAttack } from '../enemies/attacks/ExplosionAttack';
import { VortexAttack } from '../enemies/attacks/VortexAttack';
import { LightningStrikeAttack } from '../enemies/attacks/LightningStrikeAttack';
import { MeleeAttack } from '../enemies/attacks/MeleeAttack';
import { EnemyProjectile } from '../enemies/attacks/EnemyProjectile';
import { ArrowProjectile } from '../enemies/attacks/ArrowProjectile';
import { ClawAttack } from '../enemies/attacks/ClawAttack';

// Re-export EnemyType for backward compatibility
export { EnemyType };
export { BaseEnemy as Enemy }; // Alias BaseEnemy as Enemy for compatibility

export class EnemySystem {
    private scene: Scene;
    private enemies: BaseEnemy[] = [];
    private projectiles: EnemyProjectile[] = [];
    private meleeAttacks: MeleeAttack[] = [];
    private shields: Shield[] = [];
    private coneAttacks: ConeAttack[] = [];
    private spearAttacks: SpearAttack[] = [];
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
    private healthOrbSystem: HealthOrbSystem | undefined;
    private spawnTimer: Phaser.Time.TimerEvent | null = null;
    private onEnemySpawnedCallback: ((enemy: BaseEnemy) => void) | null = null;

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

    constructor(scene: Scene, player?: any, xpOrbSystem?: XPOrbSystem, healthOrbSystem?: HealthOrbSystem) {
        this.scene = scene;
        this.player = player;
        this.xpOrbSystem = xpOrbSystem;
        this.healthOrbSystem = healthOrbSystem;
        this.enemiesGroup = this.scene.physics.add.group();
    }

    /**
     * Sets a callback to be called whenever a new enemy is spawned
     * @param callback - Function to call with the newly spawned enemy
     */
    public setEnemySpawnedCallback(callback: (enemy: BaseEnemy) => void): void {
        this.onEnemySpawnedCallback = callback;
    }

    // Grabs the spawn zones that was set up in Tiled, enemies will spawn here
    private getActiveSpawnZones(): any[] {
        const zones = (this.scene.registry.get("enemy_spawn_zones") || []) as any[];
        const round = this.scene.registry.get("current_round") || 1;

        return zones.filter(z => {
            const type = (z.type || "").trim();
            if (type !== "spawn_zone") return false;

            // accept ANY zone_* (graveyard, forest, town, water)
            if (!z.name.startsWith("zone_")) return false;

            const props = z.properties || [];

            const activeProp = props.find((p: any) => p.name === "active");
            const isActive = activeProp?.value === true;
            if (!isActive) return false;

            const minRoundProp = props.find((p: any) => p.name === "minRound");
            const minRound = minRoundProp?.value || 1;

            return round >= minRound;
        });
    }

    // Prioritize new zone that was unlocked
    private pickZoneWithPriority(zones: any[]): any {
        const lastUnlocked = this.scene.registry.get("last_unlocked_zone");

        if (!lastUnlocked) {
            return Phaser.Utils.Array.GetRandom(zones);
        }

        // Zones matching the most recently unlocked area
        const preferred = zones.filter(z => z.name === lastUnlocked);

        // 🔥 70% chance to spawn in newest zone
        if (preferred.length > 0 && Math.random() < 0.7) {
            return Phaser.Utils.Array.GetRandom(preferred);
        }

        // Otherwise fallback to any active zone
        return Phaser.Utils.Array.GetRandom(zones);
    }


    // This PREVENTS enemies from spawning inside of collision tiles, walls, houses, etc
    private isValidSpawn(x: number, y: number): boolean {
        const map = this.scene.registry.get('tilemap_ref');
        if (!map) return false;

        // Check tile exists on ANY tilemap layer → prevents void-area spawns
        let tileExists = false;

        (map.layers as Phaser.Tilemaps.LayerData[]).forEach((layer: Phaser.Tilemaps.LayerData) => {
            const tile = layer.tilemapLayer?.getTileAtWorldXY(x, y);
            if (tile) tileExists = true;
        });

        if (!tileExists) return false;

        // Tile collision check
        const collisionLayer = this.scene.registry.get('collision_layer');
        if (collisionLayer) {
            const tile = collisionLayer.getTileAtWorldXY(x, y);
            if (tile && tile.collides) return false;
        }

        // Physics overlap check (objects, houses, walls)
        const bodies = this.scene.physics.overlapRect(x - 12, y - 12, 24, 24);
        if (bodies.length > 0) return false;

        return true;
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
     * @param isElite - Whether to spawn as an elite enemy
     * @returns The spawned enemy or null if max enemies reached
     */
    public spawnEnemy(enemyType: EnemyType, x: number, y: number, isElite: boolean = false): BaseEnemy | null {
        if (this.enemies.length >= this.maxEnemies) {
            console.warn('Max enemies reached, cannot spawn more');
            return null;
        }

        const enemy = EnemyFactory.create(this.scene, x, y, enemyType);
        
        // Make elite if specified
        if (isElite) {
            enemy.makeElite();
        }
        
        // Setup Fallen Angel with reference to enemy system for healing
        if (enemy instanceof FallenAngelEnemy) {
            enemy.setEnemySystemRef(this);
        }
        
        // Setup Tombstone with reference to enemy system for spawning zombies
        if (enemy instanceof TombstoneEnemy) {
            enemy.setEnemySystemRef(this);
        }
        
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
     * @param eliteChance - Probability (0-1) that each spawned enemy will be elite
     * @returns Array of spawned enemies
     */
    public spawnWave(enemyType: EnemyType, count: number, location: string, playerX: number = 512, playerY: number = 384, eliteChance: number = 0): BaseEnemy[] {
        if (this.enemies.length >= this.maxEnemies) {
            return []; // Don't spawn if max is reached
        }

        const remainingCapacity = this.maxEnemies - this.enemies.length;
        const spawnCount = Math.min(count, remainingCapacity);
        const spawnedEnemies: BaseEnemy[] = [];


        for (let i = 0; i < spawnCount; i++) {
            const spawnPos = this.getSpawnPosition(location, playerX, playerY);
            const enemy = EnemyFactory.create(this.scene, spawnPos.x, spawnPos.y, enemyType);
            
            // Check if this enemy should be elite
            if (eliteChance > 0 && Math.random() < eliteChance) {
                enemy.makeElite();
            }
            
            // Setup Fallen Angel with reference to enemy system for healing
            if (enemy instanceof FallenAngelEnemy) {
                enemy.setEnemySystemRef(this);
            }
            
            // Setup Tombstone with reference to enemy system for spawning zombies
            if (enemy instanceof TombstoneEnemy) {
                enemy.setEnemySystemRef(this);
            }
            
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
     * @param isElite - Whether to spawn as an elite enemy
     * @returns The spawned enemy, or null if max enemies reached
     */
    public spawnEnemyAt(enemyType: EnemyType, x: number, y: number, isElite: boolean = false): BaseEnemy | null {
        if (this.enemies.length >= this.maxEnemies) {
            return null; // Don't spawn if max is reached
        }

        const enemy = EnemyFactory.create(this.scene, x, y, enemyType);
        
        // Make elite if specified
        if (isElite) {
            enemy.makeElite();
        }
        
        // Setup Fallen Angel with reference to enemy system for healing
        if (enemy instanceof FallenAngelEnemy) {
            enemy.setEnemySystemRef(this);
        }
        
        // Setup Tombstone with reference to enemy system for spawning zombies
        if (enemy instanceof TombstoneEnemy) {
            enemy.setEnemySystemRef(this);
        }
        
        this.enemies.push(enemy);
        this.enemiesGroup.add(enemy.sprite);
        
        // Notify callback if registered (for collision setup, etc.)
        if (this.onEnemySpawnedCallback) {
            this.onEnemySpawnedCallback(enemy);
        }
        
        return enemy;
    }

    private getSpawnPosition(location: string, playerX: number, playerY: number): { x: number; y: number } {
        const zones = this.getActiveSpawnZones();

        if (zones.length === 0) {
            console.warn("No active spawn zones found. Using fallback.");
            return { x: playerX + 300, y: playerY + 300 };
        }

        // Pick a random rectangle zone
        const zone = this.pickZoneWithPriority(zones);

        const safeRadius = 180;
        let x = 0, y = 0;
        let attempts = 0;

        const cam = this.scene.cameras.main;

        // Declare inView OUTSIDE the loop
        let inView = false;

        const preferredMin = 200; // how close enemies try to spawn
        const preferredMax = 400; // max distance from player

        do {
            // Angle from zone center → player
            const angle = Phaser.Math.Angle.Between(
                zone.x + zone.width / 2,
                zone.y + zone.height / 2,
                playerX,
                playerY
            );

            const dist = Phaser.Math.Between(preferredMin, preferredMax);

            // Spawn toward player, not random corner
            x = playerX + Math.cos(angle) * dist;
            y = playerY + Math.sin(angle) * dist;

            // Clamp inside zone rectangle
            x = Phaser.Math.Clamp(x, zone.x, zone.x + zone.width);
            y = Phaser.Math.Clamp(y, zone.y, zone.y + zone.height);

            inView = cam.worldView.contains(x, y);
            attempts++;

        } while (
            (
                Phaser.Math.Distance.Between(x, y, playerX, playerY) < safeRadius ||
                inView ||
                !this.isValidSpawn(x, y)
            )
            &&
            attempts < 50
        );

        return { x, y };
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
            
            // Update health bar position after enemy movement
            enemy.updateHealthBarPosition();
            
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
                        enemy.activeShield = attackResult.attackObject as Shield;
                        break;
                    case 'cone':
                        this.coneAttacks.push(attackResult.attackObject as ConeAttack);
                        break;
                    case 'spear':
                        this.spearAttacks.push(attackResult.attackObject as SpearAttack);
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

        //------------------------------------------------------
        // COD ZOMBIES STYLE: FAR-DISTANCE RESPAWN SYSTEM
        //------------------------------------------------------

        const cam = this.scene.cameras.main;
        const maxDistance = 500;        // Too far from player
        const stuckTimeLimit = 2200;    // 2 seconds far away
        const dt = this.scene.game.loop.delta;

        this.enemies.forEach(enemy => {
            if (!enemy._farTimer) enemy._farTimer = 0;

            const dist = Phaser.Math.Distance.Between(
                enemy.sprite.x, enemy.sprite.y,
                playerX, playerY
            );

            if (dist > maxDistance) {
                // Enemy too far — increase timer
                enemy._farTimer += dt;

                // If far too long → teleport it to a valid spawn zone
                if (enemy._farTimer > stuckTimeLimit) {

                    const pos = this.getSpawnPosition("zone", playerX, playerY);

                    // Ensure respawn is off-screen
                    const invisibleSpawn = !cam.worldView.contains(pos.x, pos.y);

                    if (invisibleSpawn) {
                        enemy.sprite.x = pos.x;
                        enemy.sprite.y = pos.y;
                        enemy._farTimer = 0;
                    }
                }
            } else {
                // Enemy is close again — reset timer
                enemy._farTimer = 0;
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
            const owner = this.enemies.find(e => e.activeShield === shield);
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

        // Update all spear attacks
        this.spearAttacks.forEach(attack => {
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
                    if (enemy.activeShield === shield) {
                        enemy.activeShield = null;
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
        this.spearAttacks = this.spearAttacks.filter(attack => attack.isActive());
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
                    const spawnX = enemy.sprite.x || 0;
                    const spawnY = enemy.sprite.y || 0;

                    console.log(`Enemy died at (${spawnX}, ${spawnY}), spawning XP orbs with value ${enemy.stats.xpValue}`);
                    this.xpOrbSystem.spawnXPOrbs(
                        spawnX,
                        spawnY,
                        enemy.type,
                        enemy.stats.xpValue
                    );
                    
                    // Try to spawn health orb (25% chance)
                    if (this.healthOrbSystem) {
                        this.healthOrbSystem.trySpawnHealthOrb(spawnX, spawnY);
                    }
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
    public getEnemies(): BaseEnemy[] {
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
     * Gets all active spear attacks
     * @returns Array of all active spear attacks
     */
    public getSpearAttacks(): SpearAttack[] {
        return this.spearAttacks;
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
     * Returns a unified array of all active hostile attacks.
     * Includes projectiles and AOE attacks (melee, cone, vortex, etc.).
     * Excludes shields as they are defensive.
     */
    public getUnifiedAttacks(): any[] {
        return [
            ...this.projectiles,
            ...this.arrowProjectiles,
            ...this.meleeAttacks,
            ...this.coneAttacks,
            ...this.spearAttacks,
            ...this.vortexAttacks,
            ...this.explosionAttacks,
            ...this.lightningStrikes,
            ...this.clawAttacks
        ];
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
        this.spearAttacks.forEach(attack => attack.destroy());
        this.spearAttacks = [];
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