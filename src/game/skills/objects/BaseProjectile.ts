import { Scene } from 'phaser';
import { SkillObject } from '../SkillObject';
import { BaseEnemy as Enemy } from '../../enemies/BaseEnemy';
import { Game } from '../../scenes/Game';

export interface ProjectileOptions {
    pierce?: number;        // Number of enemies to pass through
    ricochet?: boolean;     // Bounce to nearby enemy after hit
    freeze?: boolean;       // Apply slow debuff (-30% speed for 2s)
    explosive?: boolean;    // Chain Reaction: AOE damage on kill
    explosiveOnHit?: boolean; // Explosive Rounds: AOE damage on every hit
    crit?: boolean;         // Critical hit (2.5x damage)
    homing?: boolean;       // Curve toward nearest enemy
    distanceBonus?: boolean; // Long Shot: +50% damage at max range
}

/**
 * BaseProjectile - Shared base class for all projectile types
 * Implements: pierce, ricochet, homing, freeze/slow, explosive/AOE, distance bonus
 */
export abstract class BaseProjectile extends SkillObject {
    protected options: ProjectileOptions;
    protected pierceCount: number;
    protected enemiesHitCount: number = 0;
    protected speed: number;
    protected spawnX: number;
    protected spawnY: number;
    protected maxRange: number = 500; // For Long Shot calculation

    constructor(
        scene: Scene,
        x: number,
        y: number,
        damage: number,
        speed: number,
        lifetime: number,
        options: ProjectileOptions = {}
    ) {
        super(scene, x, y, damage, lifetime);
        this.isProjectile = true;
        this.options = options;
        this.speed = speed;
        this.pierceCount = options.pierce ?? 0;
        this.spawnX = x;
        this.spawnY = y;
    }

    /**
     * Update loop for homing behavior
     */
    public update(_deltaTime: number): void {
        if (!this.active || !this.options.homing) return;

        const nearestEnemy = this.findNearestEnemy(300);
        if (!nearestEnemy) return;

        const body = this.body as Phaser.Physics.Arcade.Body;
        if (!body) return;

        // Calculate angle to enemy
        const dx = nearestEnemy.sprite.x - this.x;
        const dy = nearestEnemy.sprite.y - this.y;
        const targetAngle = Math.atan2(dy, dx);

        // Current velocity angle
        const currentAngle = Math.atan2(body.velocity.y, body.velocity.x);

        // Steer toward target (blend angles)
        const steerStrength = 0.08; // How fast it curves
        let angleDiff = targetAngle - currentAngle;

        // Normalize angle difference to [-PI, PI]
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        const newAngle = currentAngle + angleDiff * steerStrength;
        body.velocity.x = Math.cos(newAngle) * this.speed;
        body.velocity.y = Math.sin(newAngle) * this.speed;

        // Rotate visual to match direction
        this.setRotation(newAngle);
    }

    /**
     * Called when projectile hits an enemy
     */
    public onHit(target: any): void {
        const enemy = target as Enemy;
        if (!enemy) return;

        // Calculate final damage
        let finalDamage = this.damage;

        // Crit multiplier
        if (this.options.crit) {
            finalDamage *= 2.5;
        }

        // Long Shot: Distance bonus (up to +50% at max range)
        if (this.options.distanceBonus) {
            const dx = this.x - this.spawnX;
            const dy = this.y - this.spawnY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const ratio = Math.min(distance / this.maxRange, 1.0);
            finalDamage *= 1 + (ratio * 0.5); // 1.0 to 1.5x
        }

        const previousHealth = enemy.currentHealth;
        enemy.takeDamage(finalDamage);
        const killed = enemy.currentHealth <= 0 && previousHealth > 0;

        // Frost Shot: Apply slow debuff
        if (this.options.freeze) {
            this.applySlowDebuff(enemy, 0.3, 2000);
        }

        // Explosive Rounds: AOE on every hit
        if (this.options.explosiveOnHit) {
            this.createExplosionDamage(finalDamage * 0.25, 80);
        }

        // Chain Reaction: AOE if killed
        if (this.options.explosive && killed) {
            this.createExplosionDamage(finalDamage * 0.25, 100);
        }

        // Pierce Logic
        this.enemiesHitCount++;
        const shouldDestroy = this.enemiesHitCount > this.pierceCount;

        // Ricochet: Bounce to nearby enemy instead of destroying
        if (shouldDestroy && this.options.ricochet) {
            const nextTarget = this.findNearestEnemy(150);
            if (nextTarget && !this.hitEnemies.has(nextTarget.sprite.getData('enemyId'))) {
                this.bounceToTarget(nextTarget);
                return; // Don't destroy, continue flying
            }
        }

        if (shouldDestroy) {
            this.onDestroy();
            this.destroy();
        }
    }

    /**
     * Ricochet: Redirect projectile toward a new target
     */
    protected bounceToTarget(enemy: Enemy): void {
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (!body || !enemy.sprite) return;

        const dx = enemy.sprite.x - this.x;
        const dy = enemy.sprite.y - this.y;
        const angle = Math.atan2(dy, dx);

        body.velocity.x = Math.cos(angle) * this.speed;
        body.velocity.y = Math.sin(angle) * this.speed;
        this.setRotation(angle);

        // Reset pierce for the bounce
        this.enemiesHitCount = 0;
    }

    /**
     * Apply slow debuff to enemy
     */
    protected applySlowDebuff(enemy: Enemy, amount: number, duration: number): void {
        if (!enemy.sprite) return;

        // Visual indicator
        enemy.sprite.setTint(0x00ccff);

        // Store original speed if not already slowed
        const originalSpeed = enemy.sprite.getData('originalSpeed') ?? enemy.stats.speed;
        enemy.sprite.setData('originalSpeed', originalSpeed);

        // Apply slow
        enemy.stats.speed = originalSpeed * (1 - amount);

        // Clear after duration
        this.scene.time.delayedCall(duration, () => {
            if (enemy.sprite && enemy.sprite.active) {
                enemy.stats.speed = originalSpeed;
                enemy.sprite.clearTint();
                enemy.sprite.setData('originalSpeed', null);
            }
        });
    }

    /**
     * Chain Reaction: Deal AOE damage to nearby enemies
     */
    protected createExplosionDamage(damage: number, radius: number): void {
        // Visual effect
        const burst = this.scene.add.circle(this.x, this.y, radius, 0xff4400, 0.5);
        this.scene.tweens.add({
            targets: burst,
            scale: 1.5,
            alpha: 0,
            duration: 300,
            onComplete: () => burst.destroy()
        });

        // Find and damage nearby enemies
        const gameScene = this.scene as Game;
        const enemySystem = gameScene.getEnemySystem?.();
        if (!enemySystem) return;

        const enemies = enemySystem.getEnemies?.() ?? [];
        enemies.forEach((e: Enemy) => {
            if (!e.sprite || this.hitEnemies.has(e.sprite.getData('enemyId'))) return;

            const dx = e.sprite.x - this.x;
            const dy = e.sprite.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= radius) {
                e.takeDamage(damage);
            }
        });
    }

    /**
     * Find nearest enemy within range (not already hit)
     */
    protected findNearestEnemy(range: number): Enemy | null {
        const gameScene = this.scene as Game;
        const enemySystem = gameScene.getEnemySystem?.();
        if (!enemySystem) return null;

        const enemies = enemySystem.getEnemies?.() ?? [];
        let nearest: Enemy | null = null;
        let nearestDist = range;

        enemies.forEach((e: Enemy) => {
            if (!e.sprite || !e.sprite.active) return;
            const enemyId = e.sprite.getData('enemyId');
            if (this.hitEnemies.has(enemyId)) return;

            const dx = e.sprite.x - this.x;
            const dy = e.sprite.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = e;
            }
        });

        return nearest;
    }

    protected onDestroy(): void {
        // Override in subclass if needed
    }

    public abstract fire(targetX: number, targetY: number): void;
}

