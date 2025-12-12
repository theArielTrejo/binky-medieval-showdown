import { Scene } from 'phaser';
import { BaseEnemy } from '../BaseEnemy';
import { EnemyType, EnemyStats, EnemyAttackResult } from '../../types/EnemyTypes';
import { Shield } from '../attacks/Shield';
import { SpearAttack } from '../attacks/SpearAttack';

export class SkeletonVikingEnemy extends BaseEnemy {
    private shieldCooldown: number = 0;
    private readonly shieldInterval: number = 8.0;
    private spearAttackCooldown: number = 0;
    private readonly spearAttackInterval: number = 2.0;
    
    // Throwing animation state
    private isThrowingSpear: boolean = false;
    private throwAnimationTimer: number = 0;
    private readonly throwAnimationDuration: number = 0.5; // Duration of throwing animation (12 frames at 24fps)
    
    // Store target position for delayed spear spawn
    private targetPlayerX: number = 0;
    private targetPlayerY: number = 0;

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, EnemyType.SKELETON_VIKING);
    }

    protected getStats(): EnemyStats {
        // Stats from ENEMY_TYPES_DESIGN.md
        const baseStats = {
            health: 120,     // Tanky - elite defender
            speed: 45,       // Slow - methodical approach
            damage: 30,      // High damage per spear
            size: 35,
            xpValue: 18      // Good XP reward for difficulty
        };
        const specialAbilities = ['shield', 'spear_attack'];

        return {
            ...baseStats,
            cost: BaseEnemy.calculateEnemyCost(baseStats, specialAbilities),
            threatLevel: BaseEnemy.calculateThreatLevel(baseStats, specialAbilities),
            specialAbilities
        };
    }

    public update(playerX: number, playerY: number, deltaTime: number): EnemyAttackResult | null {
        // Check if stunned - skip all actions
        if (this.isStunned()) {
            this.updateHealthBar();
            return null;
        }

        const dx = playerX - this.sprite.x;
        const dy = playerY - this.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Update cooldowns
        if (this.shieldCooldown > 0) this.shieldCooldown -= deltaTime;
        if (this.spearAttackCooldown > 0) this.spearAttackCooldown -= deltaTime;

        // Update attack timer
        if (this.isAttacking) {
            this.attackTimer -= deltaTime;
            if (this.attackTimer <= 0) this.isAttacking = false;
        }
        
        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        const closeRange = 80; // Matches spear damage range (~70 length)

        // Check if in throwing animation first (highest priority)
        if (this.isThrowingSpear) {
            // Currently in throwing animation, wait for it to complete
            this.throwAnimationTimer += deltaTime;
            if (body) body.setVelocity(0, 0);
            
            if (this.throwAnimationTimer >= this.throwAnimationDuration) {
                // Throwing animation complete, spawn the spear
                this.isThrowingSpear = false;
                this.throwAnimationTimer = 0;
                this.isAttacking = false;
                const enemyRadius = this.getApproximateRadius();
                const spearAttack = new SpearAttack(this.scene, this.sprite.x, this.sprite.y, this.targetPlayerX, this.targetPlayerY, this.stats.damage, enemyRadius);
                return { type: 'spear', damage: this.stats.damage, position: { x: this.sprite.x, y: this.sprite.y }, hitPlayer: false, attackObject: spearAttack };
            }
            return null;
        }

        // Facing - only update when not attacking
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

        // Behavior
        if (distance > closeRange) {
            // Move towards player
            const velocityX = (dx / distance) * this.stats.speed;
            const velocityY = (dy / distance) * this.stats.speed;
            if (body) body.setVelocity(velocityX, velocityY);
            this.playAnimation(this.mobAnimations.walk);

            // Deploy Shield at medium range
            if (distance < 250 && this.shieldCooldown <= 0 && (!this.activeShield || !this.activeShield.isActive())) {
                return this.deployShield(playerX, playerY);
            }
        } else {
            // Close range - spear attack
            if (body) body.setVelocity(0, 0);

            if (this.spearAttackCooldown <= 0) {
                // Start throwing animation
                this.spearAttackCooldown = this.spearAttackInterval;
                this.isAttacking = true;
                this.isThrowingSpear = true;
                this.throwAnimationTimer = 0;
                // Store target position for when spear spawns
                this.targetPlayerX = playerX;
                this.targetPlayerY = playerY;
                // Play the throwing animation
                if (this.scene.anims.exists('skeleton_viking_throwing')) {
                    this.sprite.play('skeleton_viking_throwing', true);
                }
            } else {
                // Not attacking, play idle
                this.playAnimation(this.mobAnimations.idle);
            }
        }

        return null;
    }

    private deployShield(playerX: number, playerY: number): EnemyAttackResult {
        this.shieldCooldown = this.shieldInterval;
        const enemyRadius = this.getApproximateRadius();
        this.activeShield = new Shield(this.scene, this.sprite.x, this.sprite.y, playerX, playerY, enemyRadius);

        return {
            type: 'shield',
            damage: 0,
            position: { x: this.sprite.x, y: this.sprite.y },
            hitPlayer: false,
            attackObject: this.activeShield
        };
    }
}
