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
    
    // Animation state
    private archerDrawAnimPlayed: boolean = false;
    private archerIsReleasing: boolean = false;
    private archerReleaseTimer: number = 0;
    private arrowTipStar: Phaser.GameObjects.Graphics | null = null;

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
        
        const drawAnimDuration = 0.33; // 4 frames at 12fps
        const releaseAnimDuration = 0.31; // 5 frames at 16fps
        const inCameraView = this.isInCameraView();

        // State 1: Playing release animation after arrow is shot
        if (this.archerIsReleasing) {
            body.setVelocity(0, 0);
            this.archerReleaseTimer += deltaTime;
            
            if (this.archerReleaseTimer >= releaseAnimDuration) {
                // Release animation done, go back to normal
                this.archerIsReleasing = false;
                this.archerReleaseTimer = 0;
            }
            return null;
        }

        // State 2: Charging arrow (drawing bow)
        if (this.isChargingArrow) {
            body.setVelocity(0, 0);
            
            // Update arrow indicator
            if (this.activeArrowIndicator) {
                this.activeArrowIndicator.update(deltaTime);
            }
            
            // Update charge time
            this.arrowChargeTime += deltaTime;
            
            // Play draw animation at start, then hold at frame 003
            if (!this.archerDrawAnimPlayed) {
                if (this.arrowChargeTime < drawAnimDuration) {
                    // Still in draw animation
                    if (this.currentAnimation !== 'skeleton_archer_shooting_draw') {
                        this.sprite.play('skeleton_archer_shooting_draw', true);
                        this.currentAnimation = 'skeleton_archer_shooting_draw';
                    }
                } else {
                    // Draw animation done, hold at frame 003
                    this.archerDrawAnimPlayed = true;
                    this.sprite.stop();
                    this.sprite.setTexture('skeleton_archer_shooting_003');
                }
            }
            
            // Update star effect position and appearance - only show when almost ready to fire
            const chargeProgress = (this.arrowChargeTime - drawAnimDuration) / (this.arrowChargeDuration - drawAnimDuration);
            const showStar = chargeProgress >= 0.60; // Only show star in last 40% of charge
            
            if (this.archerDrawAnimPlayed && showStar) {
                // Create star if it doesn't exist
                if (!this.arrowTipStar) {
                    this.arrowTipStar = this.scene.add.graphics();
                    this.arrowTipStar.setDepth(20);
                }
                
                const starDistance = 18; // Distance from sprite center to bow side
                // Star appears to the left or right based on facing direction
                const starX = this.sprite.x + (this.facingLeft ? -starDistance : starDistance);
                const starY = this.sprite.y + 5; // Slightly below center where bow is held
                
                // Clear and redraw star with pulsing effect
                this.arrowTipStar.clear();
                const pulse = 0.7 + Math.sin(this.arrowChargeTime * 20) * 0.3; // Fast pulsing
                const starSize = 6; // Fixed size
                const alpha = 0.9; // Bright
                
                // Draw 4-pointed star
                this.arrowTipStar.fillStyle(0xffffff, alpha * pulse);
                this.arrowTipStar.beginPath();
                for (let i = 0; i < 8; i++) {
                    const angle = (i * Math.PI / 4) - Math.PI / 8;
                    const radius = i % 2 === 0 ? starSize : starSize * 0.4;
                    const px = starX + Math.cos(angle) * radius;
                    const py = starY + Math.sin(angle) * radius;
                    if (i === 0) {
                        this.arrowTipStar.moveTo(px, py);
                    } else {
                        this.arrowTipStar.lineTo(px, py);
                    }
                }
                this.arrowTipStar.closePath();
                this.arrowTipStar.fillPath();
                
                // Add glow effect
                this.arrowTipStar.fillStyle(0xffffff, alpha * pulse * 0.3);
                this.arrowTipStar.fillCircle(starX, starY, starSize * 1.5);
            }
            
            // Release arrow when charge is complete
            if (this.arrowChargeTime >= this.arrowChargeDuration) {
                return this.fireArrow();
            }
            return null;
        }

        // State 3: Not charging - handle movement and positioning
        // Facing - only update when not in any attack state
        const flipDeadzone = 20;
        if (Math.abs(dx) > flipDeadzone) {
            const shouldFaceLeft = dx < 0;
            if (shouldFaceLeft !== this.facingLeft) {
                this.facingLeft = shouldFaceLeft;
                this.sprite.setFlipX(this.facingLeft);
            }
        }

        // Movement logic - try to maintain optimal range and stay in camera view
        if (!inCameraView || distance > this.optimalRange) {
            // Not in camera view or too far - move towards player
            const velocityX = (dx / distance) * this.stats.speed;
            const velocityY = (dy / distance) * this.stats.speed;
            body.setVelocity(velocityX, velocityY);
            this.playAnimation(this.mobAnimations.walk);
        } else if (distance < this.minRange) {
            // Too close - kite away
            const velocityX = -(dx / distance) * this.stats.speed;
            const velocityY = -(dy / distance) * this.stats.speed;
            body.setVelocity(velocityX, velocityY);
            this.playAnimation(this.mobAnimations.walk);
        } else {
            // In optimal range (150-300 pixels) - stop and idle
            body.setVelocity(0, 0);
            this.playAnimation(this.mobAnimations.idle);
        }

        // Attack logic - can start charging arrow when in camera view and cooldown ready
        if (inCameraView && this.shootCooldown <= 0) {
            this.startCharging(dx, dy);
        }

        return null;
    }

    private startCharging(dx: number, dy: number): void {
        this.isChargingArrow = true;
        this.arrowChargeTime = 0;
        this.archerDrawAnimPlayed = false;
        this.lockedArrowAngle = Math.atan2(dy, dx);
        
        // Play draw animation
        this.sprite.play('skeleton_archer_shooting_draw', true);
        this.currentAnimation = 'skeleton_archer_shooting_draw';
        
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
        // Destroy the indicator
        if (this.activeArrowIndicator) {
            this.activeArrowIndicator.destroy();
            this.activeArrowIndicator = null;
        }
        
        // Destroy the star effect
        if (this.arrowTipStar) {
            this.arrowTipStar.destroy();
            this.arrowTipStar = null;
        }
        
        // Play release animation
        this.sprite.play('skeleton_archer_shooting_release', true);
        this.currentAnimation = 'skeleton_archer_shooting_release';
        this.archerIsReleasing = true;
        this.archerReleaseTimer = 0;
        
        // Get collision layers from scene
        const collisionLayers = this.getCollisionLayersFromScene();
        
        // Create arrow projectile
        const arrow = new ArrowProjectile(
            this.scene,
            this.sprite.x,
            this.sprite.y,
            this.lockedArrowAngle,
            this.stats.damage,
            collisionLayers,
            600 // High speed
        );
        
        // Reset charging state
        this.isChargingArrow = false;
        this.arrowChargeTime = 0;
        this.archerDrawAnimPlayed = false;
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
        // Clean up arrow indicator if archer is charging
        if (this.activeArrowIndicator) {
            this.activeArrowIndicator.destroy();
            this.activeArrowIndicator = null;
        }
        // Clean up arrow tip star effect
        if (this.arrowTipStar) {
            this.arrowTipStar.destroy();
            this.arrowTipStar = null;
        }
        super.destroy();
    }
}
