import { Scene } from 'phaser';
import { BaseEnemy } from '../BaseEnemy';
import { EnemyType, EnemyStats, EnemyAttackResult } from '../../types/EnemyTypes';
import { ArrowProjectile } from '../attacks/ArrowProjectile';
import { ArrowIndicator } from '../attacks/ArrowIndicator';

export class ArcherEnemy extends BaseEnemy {
    private shootCooldown: number = 0;
    private readonly shootInterval: number = 2.0;
    
    // Charging State
    private isChargingArrow: boolean = false;
    private arrowChargeTime: number = 0;
    private readonly arrowChargeDuration: number = 1.5;
    private lockedArrowAngle: number = 0;
    private activeArrowIndicator: ArrowIndicator | null = null;

    // Kiting
    private readonly optimalRange: number = 300;
    private readonly minRange: number = 150;

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, EnemyType.ARCHER);
    }

    protected getStats(): EnemyStats {
        const baseStats = {
            health: 40,
            speed: 50,
            damage: 10,
            size: 30,
            xpValue: 12
        };
        const specialAbilities = ['ranged_attack', 'kiting'];
        
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
        
        if (this.shootCooldown > 0) {
            this.shootCooldown -= deltaTime;
        }

        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        if (!body) return null;

        // CHARGING STATE
        if (this.isChargingArrow) {
            body.setVelocity(0, 0);
            this.playAnimation(this.mobAnimations.idle);
            
            if (this.activeArrowIndicator) {
                this.activeArrowIndicator.update(deltaTime);
            }
            
            this.arrowChargeTime += deltaTime;
            
            if (this.arrowChargeTime >= this.arrowChargeDuration) {
                return this.fireArrow();
            }
            
            return null;
        }

        // MOVING STATE
        const inCamera = this.isInCameraView();
        
        // Facing
        if (!this.isChargingArrow) {
            const shouldFaceLeft = dx < 0;
            if (shouldFaceLeft !== this.facingLeft) {
                this.facingLeft = shouldFaceLeft;
                this.sprite.setFlipX(this.facingLeft);
            }
        }

        if (!inCamera || distance > this.optimalRange) {
            // Move closer
            const velocityX = (dx / distance) * this.stats.speed;
            const velocityY = (dy / distance) * this.stats.speed;
            body.setVelocity(velocityX, velocityY);
            this.playAnimation(this.mobAnimations.walk);
        } else if (distance < this.minRange) {
            // Kite away
            const velocityX = -(dx / distance) * this.stats.speed;
            const velocityY = -(dy / distance) * this.stats.speed;
            body.setVelocity(velocityX, velocityY);
            this.playAnimation(this.mobAnimations.walk);
        } else {
            // Hold position
            body.setVelocity(0, 0);
            this.playAnimation(this.mobAnimations.idle);
        }

        // Attack Trigger
        if (inCamera && this.shootCooldown <= 0) {
            this.startCharging(dx, dy);
        }

        return null;
    }

    private startCharging(dx: number, dy: number): void {
        this.isChargingArrow = true;
        this.arrowChargeTime = 0;
        this.lockedArrowAngle = Math.atan2(dy, dx);
        
        const { endX, endY } = this.calculateArrowEndpoint(
            this.sprite.x,
            this.sprite.y,
            this.lockedArrowAngle
        );
        
        this.activeArrowIndicator = new ArrowIndicator(
            this.scene,
            this.sprite.x,
            this.sprite.y,
            endX,
            endY
        );
    }

    private fireArrow(): EnemyAttackResult {
        if (this.activeArrowIndicator) {
            this.activeArrowIndicator.destroy();
            this.activeArrowIndicator = null;
        }
        
        const arrow = new ArrowProjectile(
            this.scene,
            this.sprite.x,
            this.sprite.y,
            this.lockedArrowAngle,
            this.stats.damage,
            this.getCollisionLayersFromScene(),
            600
        );
        
        this.isChargingArrow = false;
        this.arrowChargeTime = 0;
        this.shootCooldown = this.shootInterval;
        
        return {
            type: 'arrow',
            damage: this.stats.damage,
            position: { x: this.sprite.x, y: this.sprite.y },
            hitPlayer: false,
            attackObject: arrow
        };
    }

    private calculateArrowEndpoint(startX: number, startY: number, angle: number): { endX: number; endY: number } {
        const maxDistance = 1000;
        const step = 10;
        const collisionLayers = this.getCollisionLayersFromScene();
        
        for (let dist = step; dist < maxDistance; dist += step) {
            const checkX = startX + Math.cos(angle) * dist;
            const checkY = startY + Math.sin(angle) * dist;
            
            for (const layer of collisionLayers) {
                const tile = layer.getTileAtWorldXY(checkX, checkY);
                if (tile && tile.collides) {
                    return { endX: checkX, endY: checkY };
                }
            }
            
            if (checkX < 0 || checkX > 4096 || checkY < 0 || checkY > 4096) {
                return { endX: checkX, endY: checkY };
            }
        }
        
        return {
            endX: startX + Math.cos(angle) * maxDistance,
            endY: startY + Math.sin(angle) * maxDistance
        };
    }

    public destroy(): void {
        if (this.activeArrowIndicator) {
            this.activeArrowIndicator.destroy();
            this.activeArrowIndicator = null;
        }
        super.destroy();
    }
}
