import { Scene } from 'phaser';
import { SkillObject } from '../SkillObject';
import { Game } from '../../scenes/Game';

export class GravityWellObject extends SkillObject {
    private wellSprite: Phaser.GameObjects.Sprite;
    private updateTimer: Phaser.Time.TimerEvent;
    private lifetime: number = 3000; // 3 seconds duration
    private elapsedTime: number = 0;
    private pullRadius: number = 150;
    private pullStrength: number = 200;
    private frameIndex: number = 1;
    private frameTimer: number = 0;
    private readonly frameDelay: number = 80; // ms between frames

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, 0, 3000); // No direct damage

        // Create blackhole sprite
        this.wellSprite = scene.add.sprite(x, y, 'blackhole-1');
        this.wellSprite.setScale(0.9); // Even Bigger
        this.wellSprite.setDepth(1001);
        this.wellSprite.setAlpha(0.9);
        this.wellSprite.setOrigin(0.5, 0.5);

        // Spawn animation - grow from nothing
        this.wellSprite.setScale(0);
        scene.tweens.add({
            targets: this.wellSprite,
            scale: 0.9,
            duration: 300,
            ease: 'Back.easeOut'
        });

        // Simulating "Axis" spin (wobble)
        scene.tweens.add({
            targets: this.wellSprite,
            skewX: 0.2, // Skew to simulate diagonal axis
            skewY: 0.2,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Timer for updates
        this.updateTimer = scene.time.addEvent({
            delay: 16,
            callback: this.updateWell,
            callbackScope: this,
            loop: true
        });
    }

    private updateWell(): void {
        if (!this.active) return;

        const dt = 16; // ms
        this.elapsedTime += dt;

        // Animate blackhole frames
        this.frameTimer += dt;
        if (this.frameTimer >= this.frameDelay) {
            this.frameTimer = 0;
            this.frameIndex = (this.frameIndex % 9) + 1;
            this.wellSprite.setTexture(`blackhole-${this.frameIndex}`);
        }

        // Rotate the sprite - spin faster for vortex effect
        this.wellSprite.rotation += 0.08;

        // Pull nearby enemies
        this.pullEnemies();

        // Check lifetime
        if (this.elapsedTime >= this.lifetime) {
            this.fadeAndDestroy();
        }
    }

    private pullEnemies(): void {
        const gameScene = this.scene as Game;
        const enemySystem = gameScene.getEnemySystem?.();

        if (!enemySystem) return;

        const enemies = enemySystem.getEnemies();
        const dtSec = 0.016;

        for (const enemy of enemies) {
            if (!enemy.sprite.active) continue;

            const dx = this.x - enemy.sprite.x;
            const dy = this.y - enemy.sprite.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < this.pullRadius && dist > 10) {
                // Calculate pull force (stronger when closer)
                const pullFactor = 1 - (dist / this.pullRadius);
                const pullForce = this.pullStrength * pullFactor;

                // Apply velocity toward center
                const dirX = dx / dist;
                const dirY = dy / dist;

                const body = enemy.sprite.body as Phaser.Physics.Arcade.Body;
                if (body) {
                    // Add pull velocity to existing velocity
                    body.velocity.x += dirX * pullForce * dtSec * 60;
                    body.velocity.y += dirY * pullForce * dtSec * 60;
                }
            }
        }
    }

    private fadeAndDestroy(): void {
        this.scene.tweens.add({
            targets: this.wellSprite,
            scale: 0,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => this.destroy()
        });
    }

    public update(_deltaTime: number): void {
        // Updates handled by timer
    }

    public onHit(_target: any): void {
        // No direct damage
    }

    destroy(fromScene?: boolean): void {
        if (this.updateTimer) {
            this.updateTimer.destroy();
        }
        if (this.wellSprite && this.wellSprite.active) {
            this.wellSprite.destroy();
        }
        super.destroy(fromScene);
    }
}
