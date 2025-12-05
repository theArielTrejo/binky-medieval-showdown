import { Scene } from 'phaser';
import { BaseEnemy } from '../BaseEnemy';
import { EnemyType, EnemyStats, EnemyAttackResult } from '../../types/EnemyTypes';
import { MeleeAttack } from '../attacks/MeleeAttack';

export class OgreEnemy extends BaseEnemy {
    private meleeAttackCooldown: number = 0;
    private readonly meleeAttackInterval: number = 2.5;
    private readonly attackDuration: number = 1.1;
    private readonly attackRangeBuffer: number = 120; // 100 (width) + 20

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, EnemyType.OGRE);
        
        // Ogre specific event listeners
        this.sprite.on('animationcomplete', (anim: Phaser.Animations.Animation) => {
            if (anim.key === 'ogre_attacking') {
                if (this.sprite.active) {
                    this.playAnimation(this.mobAnimations.walk);
                }
            }
        });
    }

    protected getStats(): EnemyStats {
        const baseStats = {
            health: 150,
            speed: 30,
            damage: 20,
            size: 50,
            xpValue: 25
        };
        const specialAbilities = ['melee_attack', 'high_damage'];
        
        return {
            ...baseStats,
            cost: BaseEnemy.calculateEnemyCost(baseStats, specialAbilities),
            threatLevel: BaseEnemy.calculateThreatLevel(baseStats, specialAbilities),
            specialAbilities
        };
    }

    protected getScale(): number {
        return 0.12;
    }

    public update(playerX: number, playerY: number, deltaTime: number): EnemyAttackResult | null {
        const dx = playerX - this.sprite.x;
        const dy = playerY - this.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Cooldowns
        if (this.meleeAttackCooldown > 0) {
            this.meleeAttackCooldown -= deltaTime;
        }
        
        // Attack Timer
        if (this.isAttacking) {
            this.attackTimer -= deltaTime;
            if (this.attackTimer <= 0) {
                this.isAttacking = false;
            }
            
            // Stop movement when attacking
            const body = this.sprite.body as Phaser.Physics.Arcade.Body;
            if (body) body.setVelocity(0, 0);
            
            // Ensure animation plays (sometimes FSM overrides)
            // The listener handles the reset
            return null;
        }

        // Facing
        const shouldFaceLeft = dx < 0;
        if (shouldFaceLeft !== this.facingLeft) {
            this.facingLeft = shouldFaceLeft;
            this.sprite.setFlipX(this.facingLeft);
        }

        // Range Check
        const spriteRadius = this.getApproximateRadius();
        const attackRange = spriteRadius + this.attackRangeBuffer;

        if (distance > attackRange) {
            // Move
            const velocityX = (dx / distance) * this.stats.speed;
            const velocityY = (dy / distance) * this.stats.speed;
            const body = this.sprite.body as Phaser.Physics.Arcade.Body;
            if (body) body.setVelocity(velocityX, velocityY);
            this.playAnimation(this.mobAnimations.walk);
        } else {
            // Attack
            this.playAnimation(this.mobAnimations.idle);
            const body = this.sprite.body as Phaser.Physics.Arcade.Body;
            if (body) body.setVelocity(0, 0);

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
        
        if (this.sprite.anims) {
            this.sprite.play('ogre_attacking');
        }
        
        const enemyRadius = this.getApproximateRadius();
        const meleeAttack = new MeleeAttack(
            this.scene, 
            this.sprite.x, 
            this.sprite.y, 
            playerX, 
            playerY, 
            this.stats.damage, 
            enemyRadius, 
            100, 
            60, 
            EnemyType.OGRE
        );

        console.log(`Enemy #${this.sprite.getData('enemyId')} (OGRE) creating MELEE ATTACK`);
        
        return { 
            type: 'melee', 
            damage: this.stats.damage, 
            position: { x: this.sprite.x, y: this.sprite.y }, 
            hitPlayer: false, 
            attackObject: meleeAttack 
        };
    }
}
