import { Scene } from 'phaser';
import { BaseEnemy } from '../BaseEnemy';
import { EnemyType, EnemyStats, EnemyAttackResult } from '../../types/EnemyTypes';

/**
 * Zombie Enemy - Weak melee fodder spawned by Tombstones
 * 
 * Role: Simple melee attacker, very weak (one-shot), spawned in groups
 * 
 * Behavior:
 * - Chases player like Gnoll
 * - Attacks with slashing animation (no visual effect, just damage)
 * - Very low health - dies in one hit
 * - Low damage and XP
 */
export class ZombieEnemy extends BaseEnemy {
    private meleeAttackCooldown: number = 0;
    private readonly meleeAttackInterval: number = 1.0;
    private readonly attackRange: number = 20; // Close range - zombie gets right up to you

    // Slashing animation properties
    private isSlashing: boolean = false;
    private slashTimer: number = 0;
    private readonly slashDuration: number = 0.5;
    private hasDealtDamage: boolean = false;

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, EnemyType.ZOMBIE);
    }

    protected getStats(): EnemyStats {
        // Very weak stats - one-shot fodder
        const baseStats = {
            health: 15,      // Very low health - one shot kill
            speed: 55,       // Slower than gnoll
            damage: 8,       // Low damage
            size: 25,
            xpValue: 5       // Low XP value
        };
        const specialAbilities = ['spawned_minion'];
        
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
        
        if (this.meleeAttackCooldown > 0) {
            this.meleeAttackCooldown -= deltaTime;
        }

        const body = this.sprite.body as Phaser.Physics.Arcade.Body;

        // State 1: Playing slashing animation
        if (this.isSlashing) {
            if (body) body.setVelocity(0, 0);
            this.slashTimer += deltaTime;
            
            // Deal damage partway through animation (around 50%) - only once
            if (this.slashTimer >= this.slashDuration * 0.5 && !this.hasDealtDamage) {
                this.hasDealtDamage = true;
                
                // Check if player is still in range - deal direct damage, no attack object
                if (distance <= this.attackRange * 1.5) {
                    // Return attack result with hitPlayer true for direct damage (no visual object)
                    return { 
                        type: 'melee', 
                        damage: this.stats.damage, 
                        position: { x: this.sprite.x, y: this.sprite.y }, 
                        hitPlayer: true  // Direct hit - no attack object needed
                    };
                }
            }
            
            // Check if animation is complete
            if (this.slashTimer >= this.slashDuration) {
                this.isSlashing = false;
                this.slashTimer = 0;
                this.hasDealtDamage = false;
                this.isAttacking = false;
            }
            return null;
        }

        // State 2: Moving towards player
        if (distance > this.attackRange) {
            // Facing
            const flipDeadzone = 20;
            if (Math.abs(dx) > flipDeadzone) {
                const shouldFaceLeft = dx < 0;
                if (shouldFaceLeft !== this.facingLeft) {
                    this.facingLeft = shouldFaceLeft;
                    this.sprite.setFlipX(this.facingLeft);
                }
            }
            
            const velocityX = (dx / distance) * this.stats.speed;
            const velocityY = (dy / distance) * this.stats.speed;
            if (body) body.setVelocity(velocityX, velocityY);
            this.playAnimation(this.mobAnimations.walk);
        } else {
            // State 3: In attack range
            if (body) body.setVelocity(0, 0);
            
            if (this.meleeAttackCooldown <= 0) {
                // Start slashing animation
                this.meleeAttackCooldown = this.meleeAttackInterval;
                this.isSlashing = true;
                this.slashTimer = 0;
                this.hasDealtDamage = false;
                this.isAttacking = true;
                
                // Play slashing animation
                if (this.scene.anims.exists('zombie_slashing')) {
                    this.sprite.play('zombie_slashing', true);
                    this.currentAnimation = 'zombie_slashing';
                }
            } else {
                // Waiting for cooldown
                this.playAnimation(this.mobAnimations.idle);
            }
        }

        return null;
    }
}

