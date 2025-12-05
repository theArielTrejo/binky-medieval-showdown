import { Scene } from 'phaser';
import { SkillObject } from '../SkillObject';
import { BaseEnemy as Enemy } from '../../enemies/BaseEnemy';

export interface ProjectileOptions {
    ricochet?: boolean;
    freeze?: boolean;
    explosive?: boolean;
    crit?: boolean;
    pierce?: number;
}

export class ProjectileObject extends SkillObject {
    private velocity: Phaser.Math.Vector2;
    private options: ProjectileOptions;
    private pierceCount: number;
    private enemiesHitCount: number = 0;

    constructor(scene: Scene, x: number, y: number, targetX: number, targetY: number, damage: number, speed: number = 400, options: ProjectileOptions = {}) {
        // Lifetime 5s
        super(scene, x, y, damage, 5000);
        
        this.options = options;
        this.pierceCount = options.pierce || 0;

        // Visuals
        const graphics = scene.add.graphics();
        let color = 0x00ffff; // Cyan
        if (this.options.explosive) color = 0xff4400;
        if (this.options.freeze) color = 0xccffff;
        if (this.options.crit) color = 0xff0000;

        graphics.fillStyle(color, 1);
        graphics.fillCircle(0, 0, this.options.crit ? 12 : 8);
        this.add(graphics);

        // Body
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setCircle(this.options.crit ? 12 : 8);
            body.setOffset(this.options.crit ? -12 : -8, this.options.crit ? -12 : -8);
        }

        // Velocity Calculation
        const dx = targetX - x;
        const dy = targetY - y;
        const angle = Math.atan2(dy, dx);
        this.velocity = new Phaser.Math.Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed);
        
        // Rotate container
        this.setRotation(angle);

        // Set Velocity Immediately
        if (body) {
            body.setVelocity(this.velocity.x, this.velocity.y);
        }
    }

    public onHit(target: any): void {
        const enemy = target as Enemy;
        if (!enemy) return;

        // Apply Damage
        enemy.takeDamage(this.damage);
        
        // Effects
        if (this.options.freeze) {
            enemy.sprite.setTint(0x00ffff);
            // Apply slow logic to enemy if supported
        }

        // Pierce Logic
        this.enemiesHitCount++;
        if (this.enemiesHitCount > this.pierceCount) {
            this.destroy();
        }
        
        // Explosion
        if (this.options.explosive) {
            // Spawn explosion visual/logic?
            // For now, simple visual
            const burst = this.scene.add.star(this.x, this.y, 5, 10, 20, 0xff4400);
            this.scene.tweens.add({targets: burst, scale: 2, alpha: 0, duration: 300, onComplete: () => burst.destroy()});
        }
    }
}
