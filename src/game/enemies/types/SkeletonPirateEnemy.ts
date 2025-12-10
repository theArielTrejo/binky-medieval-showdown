import { Scene } from 'phaser';
import { BaseEnemy } from '../BaseEnemy';
import { EnemyType, EnemyStats, EnemyAttackResult } from '../../types/EnemyTypes';
import { VortexAttack } from '../attacks/VortexAttack';

export class SkeletonPirateEnemy extends BaseEnemy {
    private vortexAttackCooldown: number = 0;
    private readonly vortexAttackInterval: number = 4.0;
    private readonly attackRange: number = 600; // Vortex range (long range to make dodging easier)
    private readonly minRange: number = 150; // Back away if player gets closer than this

    // Slashing animation state
    private isSlashing: boolean = false;
    private slashAnimationTimer: number = 0;
    private readonly slashAnimationDuration: number = 0.275; // Spawn vortex ~3 frames before animation ends (12 frames at 24fps = 0.5s)
    private postAttackIdleTimer: number = 0; // Brief idle period after attacking to prevent animation jerk
    
    // Store target position for delayed vortex spawn
    private targetPlayerX: number = 0;
    private targetPlayerY: number = 0;

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, EnemyType.SKELETON_PIRATE);
    }

    protected getStats(): EnemyStats {
        const baseStats = {
            health: 60,
            speed: 50,
            damage: 5,
            size: 35,
            xpValue: 18
        };
        const specialAbilities = ['vortex_attack', 'slow_debuff', 'area_control'];
        
        return {
            ...baseStats,
            cost: BaseEnemy.calculateEnemyCost(baseStats, specialAbilities),
            threatLevel: BaseEnemy.calculateThreatLevel(baseStats, specialAbilities),
            specialAbilities
        };
    }

    public update(playerX: number, playerY: number, deltaTime: number): EnemyAttackResult | null {
        if (this.vortexAttackCooldown > 0) this.vortexAttackCooldown -= deltaTime;

        const dx = playerX - this.sprite.x;
        const dy = playerY - this.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const inCameraView = this.isInCameraView();
        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        
        // Always stop movement first, then decide what to do
        if (body) body.setVelocity(0, 0);

        // State 1: Currently in slashing animation
        if (this.isSlashing) {
            this.slashAnimationTimer += deltaTime;
            
            if (this.slashAnimationTimer >= this.slashAnimationDuration) {
                // Animation complete - spawn vortex and reset
                this.isSlashing = false;
                this.slashAnimationTimer = 0;
                this.isAttacking = false;
                this.postAttackIdleTimer = 0.5;
                
                const enemyRadius = this.getApproximateRadius();
                const vortexAttack = new VortexAttack(this.scene, this.sprite.x, this.sprite.y, this.targetPlayerX, this.targetPlayerY, this.stats.damage, enemyRadius);
                
                // Force switch to idle
                this.sprite.play(this.mobAnimations.idle, true);
                this.currentAnimation = this.mobAnimations.idle;
                
                return { 
                    type: 'vortex', 
                    damage: this.stats.damage, 
                    position: { x: this.sprite.x, y: this.sprite.y }, 
                    hitPlayer: false, 
                    specialEffects: { slowEffect: vortexAttack.slowEffect, slowDuration: vortexAttack.slowDuration }, 
                    attackObject: vortexAttack 
                };
            }
            // Stay frozen during slash animation
            return null;
        }

        // State 2: Post-attack cooldown (brief pause)
        if (this.postAttackIdleTimer > 0) {
            this.postAttackIdleTimer -= deltaTime;
            // Stay still, don't change animation
            return null;
        }

        // State 3: Ready to attack (in view and cooldown ready)
        if (inCameraView && this.vortexAttackCooldown <= 0) {
            this.vortexAttackCooldown = this.vortexAttackInterval;
            this.isAttacking = true;
            this.isSlashing = true;
            this.slashAnimationTimer = 0;
            // Store target position for when vortex spawns
            this.targetPlayerX = playerX;
            this.targetPlayerY = playerY;
            
            // Play slash animation
            this.sprite.play('skeleton_pirate_slashing', true);
            this.currentAnimation = 'skeleton_pirate_slashing';
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

        // State 4: Need to get into camera view
        if (!inCameraView) {
            const velocityX = (dx / distance) * this.stats.speed;
            const velocityY = (dy / distance) * this.stats.speed;
            if (body) body.setVelocity(velocityX, velocityY);
            this.playAnimation(this.mobAnimations.walk);
            return null;
        }

        // State 5: Player too close - back away
        if (distance < this.minRange) {
            const velocityX = -(dx / distance) * (this.stats.speed * 0.4);
            const velocityY = -(dy / distance) * (this.stats.speed * 0.4);
            if (body) body.setVelocity(velocityX, velocityY);
            this.playAnimation(this.mobAnimations.walk);
            return null;
        }

        // State 6: Default - idle and wait for cooldown
        this.playAnimation(this.mobAnimations.idle);
        return null;
    }
}
