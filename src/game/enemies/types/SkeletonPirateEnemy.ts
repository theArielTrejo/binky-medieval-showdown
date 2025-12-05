import { Scene } from 'phaser';
import { BaseEnemy } from '../BaseEnemy';
import { EnemyType, EnemyStats, EnemyAttackResult } from '../../types/EnemyTypes';
import { VortexAttack } from '../attacks/VortexAttack';

export class SkeletonPirateEnemy extends BaseEnemy {
    private vortexAttackCooldown: number = 0;
    private readonly vortexAttackInterval: number = 4.0;
    private readonly optimalRange: number = 600;
    private readonly minRange: number = 300;

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
        
        if (this.isAttacking) {
            this.attackTimer -= deltaTime;
            if (this.attackTimer <= 0) this.isAttacking = false;
            
            const body = this.sprite.body as Phaser.Physics.Arcade.Body;
            if (body) body.setVelocity(0, 0);
            this.playAnimation(this.mobAnimations.idle);
            return null;
        }

        const dx = playerX - this.sprite.x;
        const dy = playerY - this.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const inCamera = this.isInCameraView();

        // Facing
        const shouldFaceLeft = dx < 0;
        if (shouldFaceLeft !== this.facingLeft) {
            this.facingLeft = shouldFaceLeft;
            this.sprite.setFlipX(this.facingLeft);
        }

        // Movement
        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        if (!inCamera || distance > this.optimalRange) {
            const velocityX = (dx / distance) * this.stats.speed;
            const velocityY = (dy / distance) * this.stats.speed;
            if (body) body.setVelocity(velocityX, velocityY);
            this.playAnimation(this.mobAnimations.walk);
        } else if (distance < this.minRange) {
            const velocityX = -(dx / distance) * (this.stats.speed * 0.5);
            const velocityY = -(dy / distance) * (this.stats.speed * 0.5);
            if (body) body.setVelocity(velocityX, velocityY);
            this.playAnimation(this.mobAnimations.walk);
        } else {
            if (body) body.setVelocity(0, 0);
            this.playAnimation(this.mobAnimations.idle);
        }

        // Attack
        if (inCamera && this.vortexAttackCooldown <= 0) {
            return this.performVortexAttack(playerX, playerY);
        }

        return null;
    }

    private performVortexAttack(playerX: number, playerY: number): EnemyAttackResult {
        this.vortexAttackCooldown = this.vortexAttackInterval;
        this.isAttacking = true;
        this.attackTimer = 0.5;
        
        const enemyRadius = this.getApproximateRadius();
        const vortexAttack = new VortexAttack(this.scene, this.sprite.x, this.sprite.y, playerX, playerY, this.stats.damage, enemyRadius);
        
        console.log(`Enemy #${this.sprite.getData('enemyId')} (SKELETON_PIRATE) creating VORTEX ATTACK`);
        
        return { 
            type: 'vortex', 
            damage: this.stats.damage, 
            position: { x: this.sprite.x, y: this.sprite.y }, 
            hitPlayer: false, 
            specialEffects: { slowEffect: vortexAttack.slowEffect, slowDuration: vortexAttack.slowDuration }, 
            attackObject: vortexAttack 
        };
    }
}
