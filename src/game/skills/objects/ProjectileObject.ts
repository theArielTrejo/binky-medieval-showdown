import { Scene } from 'phaser';
import { BaseProjectile, ProjectileOptions } from './BaseProjectile';

/**
 * ProjectileObject - Standard ranged projectile (Magician's magic bolt, etc.)
 * Extends BaseProjectile for shared pierce/freeze/explosion logic.
 */
export class ProjectileObject extends BaseProjectile {
    private velocity: Phaser.Math.Vector2;

    constructor(
        scene: Scene,
        x: number,
        y: number,
        targetX: number,
        targetY: number,
        damage: number,
        speed: number = 400,
        options: ProjectileOptions = {}
    ) {
        super(scene, x, y, damage, speed, 5000, options);

        // Visuals
        const graphics = scene.add.graphics();
        let color = 0x00ffff; // Cyan default
        if (options.explosive) color = 0xff4400;
        if (options.freeze) color = 0xccffff;
        if (options.crit) color = 0xff0000;

        const size = options.crit ? 12 : 8;
        graphics.fillStyle(color, 1);
        graphics.fillCircle(0, 0, size);
        this.add(graphics);

        // Body
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setCircle(size);
            body.setOffset(-size, -size);
        }

        // Fire immediately toward target
        this.fire(targetX, targetY);
    }

    public fire(targetX: number, targetY: number): void {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const angle = Math.atan2(dy, dx);

        this.velocity = new Phaser.Math.Vector2(
            Math.cos(angle) * this.speed,
            Math.sin(angle) * this.speed
        );

        this.setRotation(angle);

        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setVelocity(this.velocity.x, this.velocity.y);
        }
    }
}

// Re-export options interface for convenience
export type { ProjectileOptions } from './BaseProjectile';

