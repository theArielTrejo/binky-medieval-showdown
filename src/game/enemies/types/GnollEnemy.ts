import { Scene } from 'phaser';
import { BaseEnemy } from '../BaseEnemy';
import { EnemyType, EnemyStats, EnemyAttackResult } from '../../types/EnemyTypes';
import { ClawAttack } from '../attacks/ClawAttack';

export class GnollEnemy extends BaseEnemy {
    private meleeAttackCooldown: number = 0;
    private readonly meleeAttackInterval: number = 0.8;
    private readonly attackRange: number = 30; // Close melee range for claw attacks

    // Gnoll-specific throwing animation properties
    private gnollIsThrowing: boolean = false;
    private gnollThrowTimer: number = 0;
    private readonly gnollThrowDuration: number = 0.6; // Duration of throwing animation (12 frames at 20fps)
    private gnollClawSpawned: boolean = false; // Track if claw attack has been spawned this cycle
    
    // Store target position for the claw attack
    private targetPlayerX: number = 0;
    private targetPlayerY: number = 0;

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, EnemyType.GNOLL);
    }

    protected getStats(): EnemyStats {
        // Stats from ENEMY_TYPES_DESIGN.md
        const baseStats = {
            health: 50,      // Low health - swarm fodder
            speed: 80,       // Fast - high mobility to close gaps
            damage: 6,       // Low damage per hit
            size: 25,
            xpValue: 10      // Low XP value
        };
        const specialAbilities = ['fast_movement'];
        
        return {
            ...baseStats,
            cost: BaseEnemy.calculateEnemyCost(baseStats, specialAbilities),
            threatLevel: BaseEnemy.calculateThreatLevel(baseStats, specialAbilities),
            specialAbilities
        };
    }

    public update(playerX: number, playerY: number, deltaTime: number): EnemyAttackResult | null {
        const dx = playerX - this.sprite.x;
        const dy = playerY - this.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (this.meleeAttackCooldown > 0) {
            this.meleeAttackCooldown -= deltaTime;
        }

        const body = this.sprite.body as Phaser.Physics.Arcade.Body;

        // State 1: Playing throwing animation
        if (this.gnollIsThrowing) {
            if (body) body.setVelocity(0, 0);
            this.gnollThrowTimer += deltaTime;
            
            // Spawn claw attack partway through animation (around 50%) - only once!
            if (this.gnollThrowTimer >= this.gnollThrowDuration * 0.5 && !this.gnollClawSpawned) {
                this.gnollClawSpawned = true;
                // Spawn at player's current position (use stored target)
                const clawAttack = new ClawAttack(this.scene, this.targetPlayerX, this.targetPlayerY, this.stats.damage);
                return { type: 'claw', damage: this.stats.damage, position: { x: this.targetPlayerX, y: this.targetPlayerY }, hitPlayer: false, attackObject: clawAttack };
            }
            
            // Check if animation is complete
            if (this.gnollThrowTimer >= this.gnollThrowDuration) {
                this.gnollIsThrowing = false;
                this.gnollThrowTimer = 0;
                this.gnollClawSpawned = false;
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
                // Start throwing animation
                this.meleeAttackCooldown = this.meleeAttackInterval;
                this.gnollIsThrowing = true;
                this.gnollThrowTimer = 0;
                this.gnollClawSpawned = false;
                this.isAttacking = true;
                // Store target position for when claw spawns
                this.targetPlayerX = playerX;
                this.targetPlayerY = playerY;
                this.sprite.play('gnoll_throwing', true);
                this.currentAnimation = 'gnoll_throwing';
            } else {
                // Waiting for cooldown
                this.playAnimation(this.mobAnimations.idle);
            }
        }

        return null;
    }
}
