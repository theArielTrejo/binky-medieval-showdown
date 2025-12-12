import { Scene } from 'phaser';
import { BaseEnemy } from '../BaseEnemy';
import { EnemyType, EnemyStats, EnemyAttackResult } from '../../types/EnemyTypes';
import { HealEffect } from '../attacks/HealEffect';
import { EnemyProjectile } from '../attacks/EnemyProjectile';

/**
 * Fallen Angel - The Backline Healer
 * 
 * Role: Support enemy that heals nearby allies from the backline
 * 
 * Behavior:
 * - Maintains far distance from player (stays in backline)
 * - Periodically heals nearby wounded allies (PRIORITY)
 * - When no allies need healing, shoots white orbs at player (low damage)
 * - Low health, should be prioritized by players
 * 
 * Counters:
 * - Slow, methodical clearing (healing undoes progress)
 * - Ignoring backline threats
 * 
 * Countered by:
 * - Focus fire / target priority
 * - Fast rushdown to eliminate quickly
 * - AOE attacks that hit backline
 */
export class FallenAngelEnemy extends BaseEnemy {
    private healCooldown: number = 0;
    private readonly healInterval: number = 4.0;       // Heal every 4 seconds
    private readonly healAmount: number = 25;          // Amount to heal per cast
    private readonly healRange: number = 200;          // Range to find allies to heal
    private readonly minRange: number = 150;           // Back away if player gets closer than this
    private readonly attackRange: number = 600;        // Range at which it can attack (long range)

    // Post-attack idle to prevent animation jitter
    private postAttackIdleTimer: number = 0;

    // Attack state (secondary behavior when not healing)
    private orbAttackCooldown: number = 0;
    private readonly orbAttackInterval: number = 2.5;     // Attack every 2.5 seconds
    private readonly orbAttackDamage: number = 8;         // Low damage - support role
    private isAttackingProjectile: boolean = false;
    private orbAttackAnimationTimer: number = 0;
    private readonly orbAttackAnimationDuration: number = 0.5;
    private storedPlayerX: number = 0;
    private storedPlayerY: number = 0;

    // Healing animation state
    private isHealing: boolean = false;
    private healAnimationTimer: number = 0;
    private readonly healAnimationDuration: number = 0.6; // Duration of slashing/casting animation
    private healTargetEnemy: BaseEnemy | null = null;
    private healEffects: HealEffect[] = [];
    
    // Reference to enemy system for finding allies (set externally)
    private enemySystemRef: { getEnemies: () => BaseEnemy[] } | null = null;

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, EnemyType.FALLEN_ANGEL);
    }

    protected getStats(): EnemyStats {
        // Healer stats - low health, should be prioritized
        const baseStats = {
            health: 45,      // Low health - priority target
            speed: 45,       // Medium-slow speed
            damage: 8,       // Low damage - support role, attacks when not healing
            size: 30,
            xpValue: 25      // High XP reward for difficulty
        };
        const specialAbilities = ['heal_allies', 'backline_positioning', 'support', 'ranged_attack'];
        
        return {
            ...baseStats,
            cost: BaseEnemy.calculateEnemyCost(baseStats, specialAbilities),
            threatLevel: BaseEnemy.calculateThreatLevel(baseStats, specialAbilities),
            specialAbilities
        };
    }

    /**
     * Set reference to enemy system for finding allies to heal
     */
    public setEnemySystemRef(enemySystem: { getEnemies: () => BaseEnemy[] }): void {
        this.enemySystemRef = enemySystem;
    }

    public update(playerX: number, playerY: number, deltaTime: number): EnemyAttackResult | null {
        // Check if stunned - skip all actions
        if (this.isStunned()) {
            this.updateHealthBar();
            return null;
        }

        if (this.healCooldown > 0) this.healCooldown -= deltaTime;
        if (this.orbAttackCooldown > 0) this.orbAttackCooldown -= deltaTime;

        const dx = playerX - this.sprite.x;
        const dy = playerY - this.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const inCameraView = this.isInCameraView();
        const body = this.sprite.body as Phaser.Physics.Arcade.Body;

        // Update active heal effects
        this.healEffects = this.healEffects.filter(effect => {
            effect.update(deltaTime);
            if (!effect.isActive()) {
                effect.destroy();
                return false;
            }
            return true;
        });

        // Always stop velocity first, then decide movement
        if (body) body.setVelocity(0, 0);

        // State 1: Currently in healing animation (HIGHEST PRIORITY)
        if (this.isHealing) {
            this.healAnimationTimer += deltaTime;
            
            // At 50% through animation, apply the heal
            if (this.healAnimationTimer >= this.healAnimationDuration * 0.5 && this.healTargetEnemy) {
                this.applyHeal(this.healTargetEnemy);
                this.healTargetEnemy = null; // Clear to prevent double heal
            }
            
            if (this.healAnimationTimer >= this.healAnimationDuration) {
                // Animation complete
                this.isHealing = false;
                this.healAnimationTimer = 0;
                this.isAttacking = false;
                this.postAttackIdleTimer = 0.5; // Brief pause after healing
                
                // Return to idle
                this.playAnimation(this.mobAnimations.idle);
            }
            return null;
        }

        // State 2: Currently in attack animation
        if (this.isAttackingProjectile) {
            this.orbAttackAnimationTimer += deltaTime;
            
            // At 50% through animation, fire the projectile
            if (this.orbAttackAnimationTimer >= this.orbAttackAnimationDuration * 0.5 && this.storedPlayerX !== 0) {
                const result = this.fireWhiteOrb();
                this.storedPlayerX = 0;
                this.storedPlayerY = 0;
                
                if (this.orbAttackAnimationTimer >= this.orbAttackAnimationDuration) {
                    this.isAttackingProjectile = false;
                    this.orbAttackAnimationTimer = 0;
                    this.isAttacking = false;
                    this.postAttackIdleTimer = 0.5; // Brief pause after attacking
                    this.playAnimation(this.mobAnimations.idle);
                }
                
                return result;
            }
            
            if (this.orbAttackAnimationTimer >= this.orbAttackAnimationDuration) {
                this.isAttackingProjectile = false;
                this.orbAttackAnimationTimer = 0;
                this.isAttacking = false;
                this.postAttackIdleTimer = 0.5; // Brief pause after attacking
                this.playAnimation(this.mobAnimations.idle);
            }
            return null;
        }

        // State 3: Post-attack cooldown (brief pause to prevent jitter)
        if (this.postAttackIdleTimer > 0) {
            this.postAttackIdleTimer -= deltaTime;
            // Stay still, don't change animation
            return null;
        }

        // Facing - only update when not in any action
        if (!this.isAttacking) {
            const flipDeadzone = 20;
            if (Math.abs(dx) > flipDeadzone) {
                const shouldFaceLeft = dx < 0;
                if (shouldFaceLeft !== this.facingLeft) {
                    this.facingLeft = shouldFaceLeft;
                    this.sprite.setFlipX(this.facingLeft);
                }
            }
        }

        // State 4: Try to heal wounded allies if cooldown ready (PRIORITY over attacking)
        if (inCameraView && this.healCooldown <= 0) {
            const targetToHeal = this.findWoundedAlly();
            if (targetToHeal) {
                this.startHealing(targetToHeal);
                return null;
            }
        }

        // State 5: Attack player if no one needs healing, in range, and attack cooldown ready
        if (inCameraView && distance <= this.attackRange && this.orbAttackCooldown <= 0) {
            this.startAttack(playerX, playerY);
            return null;
        }

        // State 6: Movement - Need to get into camera view
        if (!inCameraView) {
            const velocityX = (dx / distance) * this.stats.speed;
            const velocityY = (dy / distance) * this.stats.speed;
            if (body) body.setVelocity(velocityX, velocityY);
            this.playAnimation(this.mobAnimations.walk);
            return null;
        }

        // State 7: Movement - Player too close, back away
        if (distance < this.minRange) {
            const velocityX = -(dx / distance) * (this.stats.speed * 0.4);
            const velocityY = -(dy / distance) * (this.stats.speed * 0.4);
            if (body) body.setVelocity(velocityX, velocityY);
            this.playAnimation(this.mobAnimations.walk);
            return null;
        }

        // State 8: Default - idle and wait for cooldowns
        this.playAnimation(this.mobAnimations.idle);
        return null;
    }

    /**
     * Find a wounded ally within heal range
     * Prioritizes allies with lowest health percentage
     */
    private findWoundedAlly(): BaseEnemy | null {
        if (!this.enemySystemRef) return null;

        const allies = this.enemySystemRef.getEnemies();
        let bestTarget: BaseEnemy | null = null;
        let lowestHealthPercent = 1.0;

        for (const ally of allies) {
            // Don't heal self (compare by sprite reference)
            if (ally.sprite === this.sprite) continue;
            
            // Don't heal dead/destroyed allies
            if (!ally.sprite || !ally.sprite.active || ally.currentHealth <= 0) continue;

            // Check if within heal range
            const dx = ally.sprite.x - this.sprite.x;
            const dy = ally.sprite.y - this.sprite.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > this.healRange) continue;

            // Check if ally is wounded (not at full health)
            const healthPercent = ally.currentHealth / ally.maxHealth;
            if (healthPercent >= 1.0) continue;

            // Prioritize lowest health
            if (healthPercent < lowestHealthPercent) {
                lowestHealthPercent = healthPercent;
                bestTarget = ally;
            }
        }

        return bestTarget;
    }

    /**
     * Start the healing animation
     */
    private startHealing(target: BaseEnemy): void {
        this.healCooldown = this.healInterval;
        this.isAttacking = true;
        this.isHealing = true;
        this.healAnimationTimer = 0;
        this.healTargetEnemy = target;

        // Face towards the target
        const dx = target.sprite.x - this.sprite.x;
        if (Math.abs(dx) > 5) {
            this.facingLeft = dx < 0;
            this.sprite.setFlipX(this.facingLeft);
        }

        // Play slashing animation (used for casting)
        if (this.scene.anims.exists('fallen_angel_slashing')) {
            this.sprite.play('fallen_angel_slashing', true);
            this.currentAnimation = 'fallen_angel_slashing';
        }
    }

    /**
     * Apply the heal to target enemy (no effect on self)
     */
    private applyHeal(target: BaseEnemy): void {
        if (!target || !target.sprite || !target.sprite.active) return;

        const actualHealed = target.heal(this.healAmount);
        
        // Create visual effect at target position that follows them
        const healEffect = new HealEffect(this.scene, target.sprite.x, target.sprite.y, target.sprite);
        this.healEffects.push(healEffect);

        console.log(`Fallen Angel healed ${target.type} for ${actualHealed} HP`);
    }

    /**
     * Start the attack animation (white orb)
     */
    private startAttack(playerX: number, playerY: number): void {
        this.orbAttackCooldown = this.orbAttackInterval;
        this.isAttacking = true;
        this.isAttackingProjectile = true;
        this.orbAttackAnimationTimer = 0;
        this.storedPlayerX = playerX;
        this.storedPlayerY = playerY;

        // Face towards the player
        const dx = playerX - this.sprite.x;
        if (Math.abs(dx) > 5) {
            this.facingLeft = dx < 0;
            this.sprite.setFlipX(this.facingLeft);
        }

        // Play slashing animation (used for casting)
        if (this.scene.anims.exists('fallen_angel_slashing')) {
            this.sprite.play('fallen_angel_slashing', true);
            this.currentAnimation = 'fallen_angel_slashing';
        }
    }

    /**
     * Fire a white orb projectile at the player
     */
    private fireWhiteOrb(): EnemyAttackResult {
        // Get collision layers for wall detection
        const collisionLayers = this.getCollisionLayersFromScene();
        
        // Create wind ball projectile using sprite
        const projectile = new EnemyProjectile(
            this.scene,
            this.sprite.x,
            this.sprite.y,
            this.storedPlayerX,
            this.storedPlayerY,
            this.orbAttackDamage,
            300,  // Slower speed
            'wind-ball',  // Use wind ball sprite
            collisionLayers,
            0.03  // Scale for the sprite
        );

        return {
            type: 'projectile',
            damage: this.orbAttackDamage,
            position: { x: this.sprite.x, y: this.sprite.y },
            hitPlayer: false,
            attackObject: projectile
        };
    }

    public destroy(): void {
        // Clean up heal effects
        this.healEffects.forEach(effect => effect.destroy());
        this.healEffects = [];
        
        super.destroy();
    }
}

