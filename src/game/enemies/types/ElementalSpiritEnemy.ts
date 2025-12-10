import { Scene } from 'phaser';
import { BaseEnemy } from '../BaseEnemy';
import { EnemyType, EnemyStats, EnemyAttackResult } from '../../types/EnemyTypes';
import { ExplosionAttack } from '../attacks/ExplosionAttack';

export class ElementalSpiritEnemy extends BaseEnemy {
    private isExploding: boolean = false;
    private deathTimer: number = 0;
    private readonly deathAnimationDuration: number = 0.75; // Duration of death animation (15 frames at ~20fps)
    private readonly explosionTriggerRange: number = 30; // Distance at which to trigger death/explosion

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, EnemyType.ELEMENTAL_SPIRIT);
    }

    protected getStats(): EnemyStats {
        const baseStats = {
            health: 30, // Low health - designed to explode
            speed: 110, // Very high mobility to rush player
            damage: 25, // High explosion damage
            size: 30,
            xpValue: 20
        };
        const specialAbilities = ['explosive_death', 'high_mobility', 'suicide_attack'];
        
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
        const body = this.sprite.body as Phaser.Physics.Arcade.Body;

        // Exploding State
        if (this.isExploding) {
            this.deathTimer += deltaTime;
            if (body) body.setVelocity(0, 0);

            if (this.deathTimer >= this.deathAnimationDuration) {
                // Death animation complete, trigger explosion
                const explosion = new ExplosionAttack(this.scene, this.sprite.x, this.sprite.y, this.stats.damage);
                
                // Destroy the sprite immediately after creating explosion
                this.destroy();
                
                return { 
                    type: 'explosion', 
                    damage: this.stats.damage, 
                    position: { x: this.sprite.x, y: this.sprite.y }, 
                    hitPlayer: false, 
                    attackObject: explosion 
                };
            }
            return null;
        }

        // Movement / Trigger
        if (distance <= this.explosionTriggerRange) {
            // Close enough to trigger death animation
            this.isExploding = true;
            this.deathTimer = 0;
            if (body) body.setVelocity(0, 0);
            // Play the dying animation - explosion happens after it finishes
            this.sprite.play('elemental_spirit_dying');
        } else {
            // Rush towards player with high speed
            const velocityX = (dx / distance) * this.stats.speed;
            const velocityY = (dy / distance) * this.stats.speed;
            if (body) body.setVelocity(velocityX, velocityY);
            this.playAnimation(this.mobAnimations.walk);
            
            // Facing
            const shouldFaceLeft = dx < 0;
            if (shouldFaceLeft !== this.facingLeft) {
                this.facingLeft = shouldFaceLeft;
                this.sprite.setFlipX(this.facingLeft);
            }
        }

        return null;
    }
}
