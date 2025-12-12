import { Scene } from 'phaser';
import { SkillObject } from '../SkillObject';
import { Enemy } from '../../systems/EnemySystem';

export class CometObject extends SkillObject {
    private cometSprite: Phaser.GameObjects.Sprite;
    private velocityX: number;
    private velocityY: number;
    private updateTimer: Phaser.Time.TimerEvent;
    private maxDistance: number = 500;
    private startX: number;
    private startY: number;

    constructor(scene: Scene, x: number, y: number, targetX: number, targetY: number, damage: number) {
        super(scene, x, y, damage, 5000);

        this.startX = x;
        this.startY = y;
        this.isProjectile = true;

        // Calculate velocity towards target
        const angle = Math.atan2(targetY - y, targetX - x);
        const speed = 600; // Fast projectile
        this.velocityX = Math.cos(angle) * speed;
        this.velocityY = Math.sin(angle) * speed;

        // Create comet sprite
        this.cometSprite = scene.add.sprite(x, y, 'comet');
        this.cometSprite.setScale(0.1); // Slightly smaller
        this.cometSprite.setDepth(1002);
        this.cometSprite.setRotation(angle - Math.PI / 2);

        // Add particle trail for fluid movement
        const particles = scene.add.particles(0, 0, 'sparkle', {
            speed: 100,
            scale: { start: 0.5, end: 0 },
            blendMode: 'ADD',
            lifespan: 300,
            tint: 0xaaccff, // Blueish
            follow: this.cometSprite
        });
        particles.setDepth(1001);

        // Store reference to destroy later
        this.setData('particles', particles);

        // Physics body for collision
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setCircle(25);
            body.setOffset(-25, -25);
        }

        // Timer for smooth updates
        this.updateTimer = scene.time.addEvent({
            delay: 16,
            callback: this.updateProjectile,
            callbackScope: this,
            loop: true
        });
    }

    private updateProjectile(): void {
        if (!this.active) return;

        const dt = 16; // ms

        // Move projectile
        const dtSec = dt / 1000;
        const newX = this.x + this.velocityX * dtSec;
        const newY = this.y + this.velocityY * dtSec;

        this.setPosition(newX, newY);
        this.cometSprite.setPosition(newX, newY);

        // Check max distance
        const distTraveled = Math.sqrt(
            Math.pow(newX - this.startX, 2) + Math.pow(newY - this.startY, 2)
        );

        if (distTraveled >= this.maxDistance) {
            this.destroy();
        }
    }

    public update(_deltaTime: number): void {
        // Updates handled by timer
    }

    public onHit(target: any): void {
        const enemy = target as Enemy;
        if (enemy) {
            this.applyHit(enemy);
        }
    }

    public applyHit(enemy: Enemy): void {
        // Deal high damage
        enemy.takeDamage(this.damage);

        // Impact VFX - fiery burst
        const burst = this.scene.add.circle(enemy.sprite.x, enemy.sprite.y, 30, 0xff6600, 0.8);
        burst.setDepth(1003);
        this.scene.tweens.add({
            targets: burst,
            scale: 2,
            alpha: 0,
            duration: 300,
            onComplete: () => burst.destroy()
        });

        // Camera shake on hit
        this.scene.cameras.main.shake(50, 0.004);

        // Comet pierces through - don't destroy
    }

    destroy(fromScene?: boolean): void {
        if (this.updateTimer) {
            this.updateTimer.destroy();
        }
        if (this.cometSprite) {
            this.cometSprite.destroy();
        }
        const particles = this.getData('particles') as Phaser.GameObjects.Particles.ParticleEmitter;
        if (particles) {
            particles.stop();
            this.scene.time.delayedCall(500, () => particles.destroy());
        }
        super.destroy(fromScene);
    }
}
