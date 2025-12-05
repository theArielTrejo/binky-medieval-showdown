import { Scene } from 'phaser';
import { BaseEnemy } from '../BaseEnemy';
import { EnemyType, EnemyStats, EnemyAttackResult } from '../../types/EnemyTypes';
import { LightningStrikeAttack } from '../attacks/LightningStrikeAttack';

export class LightningMageEnemy extends BaseEnemy {
    private lightningCooldown: number = 0;
    private readonly lightningInterval: number = 3.0;
    private readonly optimalRange: number = 320;
    private readonly minRange: number = 180;

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, EnemyType.LIGHTNING_MAGE);
    }

    protected getStats(): EnemyStats {
        const baseStats = {
            health: 70,
            speed: 40,
            damage: 35,
            size: 35,
            xpValue: 22
        };
        const specialAbilities = ['lightning_strike', 'aoe_damage', 'ranged_caster', 'immobilize_during_cast'];
        
        return {
            ...baseStats,
            cost: BaseEnemy.calculateEnemyCost(baseStats, specialAbilities),
            threatLevel: BaseEnemy.calculateThreatLevel(baseStats, specialAbilities),
            specialAbilities
        };
    }

    public update(playerX: number, playerY: number, deltaTime: number): EnemyAttackResult | null {
        if (this.lightningCooldown > 0) this.lightningCooldown -= deltaTime;
        
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
            const velocityX = -(dx / distance) * (this.stats.speed * 0.7);
            const velocityY = -(dy / distance) * (this.stats.speed * 0.7);
            if (body) body.setVelocity(velocityX, velocityY);
            this.playAnimation(this.mobAnimations.walk);
        } else {
            if (body) body.setVelocity(0, 0);
            this.playAnimation(this.mobAnimations.idle);
        }

        // Attack
        if (inCamera && this.lightningCooldown <= 0) {
            return this.performLightningStrike(playerX, playerY);
        }

        return null;
    }

    private performLightningStrike(playerX: number, playerY: number): EnemyAttackResult {
        this.lightningCooldown = this.lightningInterval;
        this.isAttacking = true;
        this.attackTimer = 1.5;
        
        const lightningStrike = new LightningStrikeAttack(this.scene, playerX, playerY, this.stats.damage);
        
        console.log(`Enemy #${this.sprite.getData('enemyId')} (LIGHTNING_MAGE) creating LIGHTNING STRIKE`);
        
        return { 
            type: 'lightning', 
            damage: this.stats.damage, 
            position: { x: playerX, y: playerY }, 
            hitPlayer: false,
            attackObject: lightningStrike 
        };
    }
}
