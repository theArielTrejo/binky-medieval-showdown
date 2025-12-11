import { Scene } from 'phaser';
import { BaseEnemy } from '../BaseEnemy';
import { EnemyType, EnemyStats, EnemyAttackResult } from '../../types/EnemyTypes';
import { ZombieEnemy } from './ZombieEnemy';

/**
 * Tombstone Enemy - Stationary spawner that creates Zombies
 * 
 * Role: Structure that periodically spawns zombie minions
 * 
 * Behavior:
 * - Does NOT move (stationary)
 * - Periodically spawns zombie enemies near itself
 * - Has its own HP - can be destroyed
 * - No direct attacks
 * 
 * Counters:
 * - Players ignoring it (keeps spawning zombies)
 * - Low DPS builds (zombies overwhelm)
 * 
 * Countered by:
 * - Focus fire to destroy quickly
 * - AOE attacks to clear zombies and damage tombstone
 */
export class TombstoneEnemy extends BaseEnemy {
    private spawnCooldown: number = 1.5; // Start with a short delay before first spawn
    private readonly spawnInterval: number = 3.0; // Spawn zombie every 3 seconds (faster!)
    private readonly maxZombiesAlive: number = 3; // Max zombies this tombstone can have alive at once
    private spawnedZombies: ZombieEnemy[] = [];
    
    // Pending spawn effect tracking
    private pendingSpawns: { x: number; y: number; timer: number; particles: Phaser.GameObjects.Graphics[] }[] = [];
    private readonly spawnEffectDuration: number = 0.8; // Particle effect before zombie appears
    
    // Reference to enemy system for spawning
    private enemySystemRef: { 
        spawnEnemyAt: (type: EnemyType, x: number, y: number) => BaseEnemy | null;
        getEnemies: () => BaseEnemy[];
    } | null = null;

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, EnemyType.TOMBSTONE);
    }

    protected getStats(): EnemyStats {
        // Stationary spawner stats
        const baseStats = {
            health: 100,     // Medium-high health - takes effort to destroy
            speed: 0,        // Does not move
            damage: 0,       // No direct damage
            size: 40,
            xpValue: 30      // Good XP reward for destroying
        };
        const specialAbilities = ['spawn_zombies', 'stationary', 'structure'];
        
        return {
            ...baseStats,
            cost: BaseEnemy.calculateEnemyCost(baseStats, specialAbilities),
            threatLevel: BaseEnemy.calculateThreatLevel(baseStats, specialAbilities),
            specialAbilities
        };
    }

    /**
     * Set reference to enemy system for spawning zombies
     */
    public setEnemySystemRef(enemySystem: { 
        spawnEnemyAt: (type: EnemyType, x: number, y: number) => BaseEnemy | null;
        getEnemies: () => BaseEnemy[];
    }): void {
        this.enemySystemRef = enemySystem;
    }

    public update(_playerX: number, _playerY: number, deltaTime: number): EnemyAttackResult | null {
        // Tombstone doesn't move - ensure velocity is always 0
        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        if (body) body.setVelocity(0, 0);
        
        // Clean up dead zombies from our tracking list
        this.spawnedZombies = this.spawnedZombies.filter(zombie => 
            zombie && zombie.sprite && zombie.sprite.active && zombie.currentHealth > 0
        );
        
        // Update pending spawn effects
        this.updatePendingSpawns(deltaTime);
        
        // Update spawn cooldown
        if (this.spawnCooldown > 0) {
            this.spawnCooldown -= deltaTime;
        }
        
        // Check if we can start spawning a new zombie (with effect)
        // Tombstone spawns zombies regardless of camera view
        const totalPending = this.spawnedZombies.length + this.pendingSpawns.length;
        if (this.spawnCooldown <= 0 && totalPending < this.maxZombiesAlive) {
            this.startSpawnEffect();
            this.spawnCooldown = this.spawnInterval;
        }
        
        // Always play idle animation (tombstone is stationary)
        this.playAnimation(this.mobAnimations.idle);
        
        return null;
    }

    /**
     * Update pending spawn effects and spawn zombies when ready
     */
    private updatePendingSpawns(deltaTime: number): void {
        for (let i = this.pendingSpawns.length - 1; i >= 0; i--) {
            const spawn = this.pendingSpawns[i];
            spawn.timer += deltaTime;
            
            const progress = spawn.timer / this.spawnEffectDuration;
            
            // Update particle effects
            this.updateSpawnParticles(spawn, progress);
            
            // Spawn zombie when effect completes
            if (spawn.timer >= this.spawnEffectDuration) {
                this.completeSpawn(spawn);
                this.pendingSpawns.splice(i, 1);
            }
        }
    }

    /**
     * Start a spawn effect at a random position near the tombstone
     */
    private startSpawnEffect(): void {
        // Calculate spawn position
        const offsetX = (Math.random() - 0.5) * 80;
        const offsetY = (Math.random() - 0.5) * 40 + 40; // Below tombstone
        
        const spawnX = this.sprite.x + offsetX;
        const spawnY = this.sprite.y + offsetY;
        
        // Create ground particles
        const particles: Phaser.GameObjects.Graphics[] = [];
        for (let i = 0; i < 8; i++) {
            const particle = this.scene.add.graphics();
            particle.setDepth(5);
            particles.push(particle);
        }
        
        this.pendingSpawns.push({
            x: spawnX,
            y: spawnY,
            timer: 0,
            particles
        });
    }

    /**
     * Update spawn particle visual effect
     */
    private updateSpawnParticles(spawn: { x: number; y: number; timer: number; particles: Phaser.GameObjects.Graphics[] }, progress: number): void {
        spawn.particles.forEach((particle, i) => {
            particle.clear();
            
            // Calculate particle position - rise from ground
            const angle = (i / spawn.particles.length) * Math.PI * 2;
            const radius = 15 + Math.sin(progress * Math.PI) * 10;
            const riseHeight = progress * 30;
            const wobble = Math.sin(progress * Math.PI * 3 + i) * 5;
            
            const particleX = spawn.x + Math.cos(angle) * radius + wobble;
            const particleY = spawn.y - riseHeight + Math.sin(angle) * 5;
            
            // Particle alpha and size
            const alpha = Math.sin(progress * Math.PI) * 0.8;
            const size = 3 + Math.sin(progress * Math.PI) * 4;
            
            // Draw dirt/ground particle (brownish-green for zombie theme)
            particle.fillStyle(0x4a3728, alpha);
            particle.fillCircle(particleX, particleY, size);
            
            // Inner darker core
            particle.fillStyle(0x2d1f15, alpha * 0.8);
            particle.fillCircle(particleX, particleY, size * 0.5);
        });
        
        // Add ground crack/disturbance effect at spawn point
        if (spawn.particles.length > 0) {
            const groundEffect = spawn.particles[0];
            const crackAlpha = Math.sin(progress * Math.PI) * 0.5;
            const crackSize = 20 + progress * 15;
            
            // Draw expanding ground crack circle
            groundEffect.lineStyle(2, 0x3d2817, crackAlpha);
            groundEffect.strokeCircle(spawn.x, spawn.y, crackSize);
            
            // Draw some crack lines
            for (let j = 0; j < 4; j++) {
                const crackAngle = (j / 4) * Math.PI * 2 + progress * 0.5;
                const crackLength = crackSize * 0.8;
                groundEffect.lineStyle(1, 0x2d1f15, crackAlpha * 0.7);
                groundEffect.lineBetween(
                    spawn.x,
                    spawn.y,
                    spawn.x + Math.cos(crackAngle) * crackLength,
                    spawn.y + Math.sin(crackAngle) * crackLength * 0.5
                );
            }
        }
    }

    /**
     * Complete the spawn - create zombie and clean up particles
     */
    private completeSpawn(spawn: { x: number; y: number; timer: number; particles: Phaser.GameObjects.Graphics[] }): void {
        // Clean up particles
        spawn.particles.forEach(p => p.destroy());
        
        // Spawn the zombie
        if (this.enemySystemRef) {
            const zombie = this.enemySystemRef.spawnEnemyAt(EnemyType.ZOMBIE, spawn.x, spawn.y);
            
            if (zombie && zombie instanceof ZombieEnemy) {
                this.spawnedZombies.push(zombie);
            }
        }
    }

    public destroy(): void {
        // Clean up pending spawn particles
        this.pendingSpawns.forEach(spawn => {
            spawn.particles.forEach(p => p.destroy());
        });
        this.pendingSpawns = [];
        
        // When tombstone is destroyed, its zombies remain but won't be replaced
        this.spawnedZombies = [];
        super.destroy();
    }
}

