import { Scene } from 'phaser';
import { BaseProjectile, ProjectileOptions } from '../skills/objects/BaseProjectile';

/**
 * Shuriken - Ninja's throwing star projectile
 * Extends BaseProjectile for shared pierce/freeze/explosion logic.
 * Uses ninja star sprite with spinning animation.
 */
export class Shuriken extends BaseProjectile {
    private rotationSpeed: number = 20; // Degrees per frame - fast spin
    private starSprite: Phaser.GameObjects.Sprite | null = null;

    constructor(scene: Scene, x: number, y: number, options: ProjectileOptions = {}) {
        // Shurikens are fast, short-lived
        // Default damage of 20, will be overwritten by skill activation with player.archetype.stats.damage
        super(scene, x, y, 20, 600, 2000, options);

        // Use ninja star sprite if available, fallback to graphics
        if (scene.textures.exists('ninja-star')) {
            this.starSprite = scene.add.sprite(0, 0, 'ninja-star');
            this.starSprite.setScale(0.04); // Scale down the sprite
            this.starSprite.setOrigin(0.5, 0.5);
            this.add(this.starSprite);
            
            // Add continuous spinning tween for realistic throwing effect
            scene.tweens.add({
                targets: this.starSprite,
                angle: 360,
                duration: 150, // Fast spin - completes rotation in 150ms
                repeat: -1,    // Infinite repeat
                ease: 'Linear'
            });
        } else {
            // Fallback to graphics if sprite not loaded - use container rotation
            const graphics = scene.add.graphics();
            graphics.lineStyle(2, 0xcccccc, 1);
            graphics.fillStyle(0x888888, 1);

            // Draw 4-pointed star shape
            graphics.beginPath();
            for (let i = 0; i < 4; i++) {
                const angle = (i * Math.PI / 2);
                const outerX = Math.cos(angle) * 10;
                const outerY = Math.sin(angle) * 10;
                const innerAngle = angle + Math.PI / 4;
                const innerX = Math.cos(innerAngle) * 4;
                const innerY = Math.sin(innerAngle) * 4;

                if (i === 0) graphics.moveTo(outerX, outerY);
                else graphics.lineTo(outerX, outerY);
                graphics.lineTo(innerX, innerY);
            }
            graphics.closePath();
            graphics.fillPath();
            graphics.strokePath();
            this.add(graphics);
            
            // Add spinning tween for graphics fallback
            scene.tweens.add({
                targets: this,
                angle: 360,
                duration: 150,
                repeat: -1,
                ease: 'Linear'
            });
        }

        // Body
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setCircle(10);
            body.setOffset(-10, -10);
        }
    }

    public fire(targetX: number, targetY: number): void {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const angle = Math.atan2(dy, dx);

        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            this.scene.physics.velocityFromRotation(angle, this.speed, body.velocity);
        }
    }

    /**
     * Fire at a specific angle (radians) - used by ShurikenFanSkill for spread
     */
    public fireAtAngle(angle: number): void {
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            this.scene.physics.velocityFromRotation(angle, this.speed, body.velocity);
        }
    }

    public update(_deltaTime: number): void {
        if (!this.active) return;

        // Spin the ninja star for realistic throwing effect
        if (this.starSprite) {
            this.starSprite.angle += this.rotationSpeed;
        } else {
            // Fallback: spin the container if using graphics
            this.angle += this.rotationSpeed;
        }
    }

    public getDamage(): number {
        return this.damage;
    }
}

