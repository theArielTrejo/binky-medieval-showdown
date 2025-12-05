import { Scene } from 'phaser';
import { BaseEnemy } from '../BaseEnemy';
import { EnemyType, EnemyStats, EnemyAttackResult } from '../../types/EnemyTypes';
import { Shield } from '../attacks/Shield';
import { ConeAttack } from '../attacks/ConeAttack';

export class SkeletonVikingEnemy extends BaseEnemy {
    private shieldCooldown: number = 0;
    private readonly shieldInterval: number = 8.0;
    private coneAttackCooldown: number = 0;
    private readonly coneAttackInterval: number = 2.0;
    private activeShield: Shield | null = null;
    
    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, EnemyType.SKELETON_VIKING);
    }

    protected getStats(): EnemyStats {
        const baseStats = {
            health: 120,
            speed: 45,
            damage: 30,
            size: 35,
            xpValue: 18
        };
        const specialAbilities = ['shield', 'cone_attack'];
        
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
        
        if (this.shieldCooldown > 0) this.shieldCooldown -= deltaTime;
        if (this.coneAttackCooldown > 0) this.coneAttackCooldown -= deltaTime;

        if (this.isAttacking) {
            this.attackTimer -= deltaTime;
            if (this.attackTimer <= 0) this.isAttacking = false;
            
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

        // Behavior
        if (distance > 100) {
            // Move
            const velocityX = (dx / distance) * this.stats.speed;
            const velocityY = (dy / distance) * this.stats.speed;
            const body = this.sprite.body as Phaser.Physics.Arcade.Body;
            if (body) body.setVelocity(velocityX, velocityY);
            this.playAnimation(this.mobAnimations.walk);

            // Deploy Shield
            if (distance < 250 && this.shieldCooldown <= 0 && (!this.activeShield || !this.activeShield.isActive())) {
                return this.deployShield(playerX, playerY);
            }
        } else {
            // Close range
            const body = this.sprite.body as Phaser.Physics.Arcade.Body;
            if (body) body.setVelocity(0, 0);
            this.playAnimation(this.mobAnimations.idle);

            if (this.coneAttackCooldown <= 0) {
                return this.performConeAttack(playerX, playerY);
            }
        }

        return null;
    }

    private deployShield(playerX: number, playerY: number): EnemyAttackResult {
        this.shieldCooldown = this.shieldInterval;
        const enemyRadius = this.getApproximateRadius();
        this.activeShield = new Shield(this.scene, this.sprite.x, this.sprite.y, playerX, playerY, enemyRadius);
        
        console.log(`Enemy #${this.sprite.getData('enemyId')} (SKELETON_VIKING) creating SHIELD`);
        
        return { 
            type: 'shield', 
            damage: 0, 
            position: { x: this.sprite.x, y: this.sprite.y }, 
            hitPlayer: false, 
            attackObject: this.activeShield 
        };
    }

    private performConeAttack(playerX: number, playerY: number): EnemyAttackResult {
        this.coneAttackCooldown = this.coneAttackInterval;
        this.isAttacking = true;
        this.attackTimer = 0.25;
        
        const enemyRadius = this.getApproximateRadius();
        const coneAttack = new ConeAttack(this.scene, this.sprite.x, this.sprite.y, playerX, playerY, this.stats.damage, enemyRadius);
        
        console.log(`Enemy #${this.sprite.getData('enemyId')} (SKELETON_VIKING) creating CONE ATTACK`);
        
        return { 
            type: 'cone', 
            damage: this.stats.damage, 
            position: { x: this.sprite.x, y: this.sprite.y }, 
            hitPlayer: false, 
            attackObject: coneAttack 
        };
    }
}
