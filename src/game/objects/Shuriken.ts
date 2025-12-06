import { Scene } from 'phaser';
import { BaseProjectile, ProjectileOptions } from '../skills/objects/BaseProjectile';

/**
 * Shuriken - Ninja's throwing star projectile
 * Extends BaseProjectile for shared pierce/freeze/explosion logic.
 */
export class Shuriken extends BaseProjectile {
    private rotationSpeed: number = 15;

    constructor(scene: Scene, x: number, y: number, options: ProjectileOptions = {}) {
        // Shurikens are fast, short-lived
        super(scene, x, y, 10, 600, 2000, options);

        // Shuriken is a Phaser.Physics.Arcade.Sprite in the original
        // But BaseProjectile uses Container. We'll create a simple graphic.
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

        // Spin visual
        this.angle += this.rotationSpeed;
    }

    public getDamage(): number {
        return this.damage;
    }
}

