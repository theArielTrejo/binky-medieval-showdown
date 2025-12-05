import { Scene } from 'phaser';
import { BaseEnemy } from '../BaseEnemy';
import { EnemyType, EnemyStats, EnemyAttackResult } from '../../types/EnemyTypes';
import { ClawAttack } from '../attacks/ClawAttack';

export class GnollEnemy extends BaseEnemy {
    private meleeAttackCooldown: number = 0;
    private readonly meleeAttackInterval: number = 0.8;
    private readonly attackDuration: number = 0.3;
    private readonly attackRangeBuffer: number = 30;

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, EnemyType.GNOLL);
    }

    protected getStats(): EnemyStats {
        const baseStats = {
            health: 50,
            speed: 80,
            damage: 6,
            size: 25,
            xpValue: 10
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
        
        if (this.isAttacking) {
            this.attackTimer -= deltaTime;
            if (this.attackTimer <= 0) {
                this.isAttacking = false;
            }
            const body = this.sprite.body as Phaser.Physics.Arcade.Body;
            if (body) body.setVelocity(0, 0);
            this.playAnimation(this.mobAnimations.idle);
            return null;
        }

        // Facing
        const shouldFaceLeft = dx < 0;
        if (shouldFaceLeft !== this.facingLeft) {
            this.facingLeft = shouldFaceLeft;
            this.sprite.setFlipX(this.facingLeft);
        }

        if (distance > this.attackRangeBuffer) {
            // Move
            const velocityX = (dx / distance) * this.stats.speed;
            const velocityY = (dy / distance) * this.stats.speed;
            const body = this.sprite.body as Phaser.Physics.Arcade.Body;
            if (body) body.setVelocity(velocityX, velocityY);
            this.playAnimation(this.mobAnimations.walk);
        } else {
            // Attack
            const body = this.sprite.body as Phaser.Physics.Arcade.Body;
            if (body) body.setVelocity(0, 0);
            this.playAnimation(this.mobAnimations.idle);

            if (this.meleeAttackCooldown <= 0) {
                return this.performAttack(playerX, playerY);
            }
        }

        return null;
    }

    private performAttack(playerX: number, playerY: number): EnemyAttackResult {
        this.meleeAttackCooldown = this.meleeAttackInterval;
        this.isAttacking = true;
        this.attackTimer = this.attackDuration;
        
        const clawAttack = new ClawAttack(this.scene, playerX, playerY, this.stats.damage);
        console.log(`Enemy #${this.sprite.getData('enemyId')} (GNOLL) creating CLAW ATTACK`);
        
        return { 
            type: 'claw', 
            damage: this.stats.damage, 
            position: { x: playerX, y: playerY }, 
            hitPlayer: false, 
            attackObject: clawAttack 
        };
    }
}
