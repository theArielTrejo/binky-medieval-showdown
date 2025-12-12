import { Scene } from 'phaser';
import { SkillObject } from '../SkillObject';
import { Game } from '../../scenes/Game';

export class ShadowDashObject extends SkillObject {
    private playerSprite: Phaser.Physics.Arcade.Sprite;
    private targetPosition: Phaser.Math.Vector2;
    private startPosition: Phaser.Math.Vector2;
    private invisibilityDuration: number = 2000;
    private gameScene: Scene;

    constructor(scene: Scene, x: number, y: number, playerSprite: Phaser.Physics.Arcade.Sprite, targetX: number, targetY: number, _damage: number, duration: number = 200) {
        super(scene, x, y, 0, duration);

        this.gameScene = scene;
        this.playerSprite = playerSprite;
        this.startPosition = new Phaser.Math.Vector2(x, y);

        this.targetPosition = this.calculateSafeTarget(targetX, targetY);

        this.createSmokeBomb(x, y);

        scene.tweens.add({
            targets: this.playerSprite,
            x: this.targetPosition.x,
            y: this.targetPosition.y,
            duration: duration,
            ease: 'Power2',
            onStart: () => {
                this.playerSprite.setAlpha(0.3);
            },
            onComplete: () => {
                this.startInvisibility();
            }
        });

        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setSize(1, 1);
        }
    }

    private calculateSafeTarget(targetX: number, targetY: number): Phaser.Math.Vector2 {
        const maxDist = 300;
        const padding = 20;

        const vec = new Phaser.Math.Vector2(targetX - this.startPosition.x, targetY - this.startPosition.y);
        if (vec.length() > maxDist) {
            vec.normalize().scale(maxDist);
        }
        let finalX = this.startPosition.x + vec.x;
        let finalY = this.startPosition.y + vec.y;

        const gameScene = this.scene as Game;
        const physicsSystem = gameScene.getPhysicsSystem?.();

        if (physicsSystem) {
            const bounds = physicsSystem.getWorldBounds();
            finalX = Phaser.Math.Clamp(finalX, bounds.x + padding, bounds.right - padding);
            finalY = Phaser.Math.Clamp(finalY, bounds.y + padding, bounds.bottom - padding);

            const collisionPoint = physicsSystem.getLineCollisionPoint(
                this.startPosition.x,
                this.startPosition.y,
                finalX,
                finalY,
                padding
            );

            if (collisionPoint) {
                finalX = collisionPoint.x;
                finalY = collisionPoint.y;
            }
        }

        return new Phaser.Math.Vector2(finalX, finalY);
    }

    private createSmokeBomb(x: number, y: number): void {
        if (!this.gameScene) return;

        const numParticles = 20;

        for (let i = 0; i < numParticles; i++) {
            const angle = (i / numParticles) * Math.PI * 2;
            const speed = Phaser.Math.Between(30, 80);
            const size = Phaser.Math.Between(8, 18);

            const colors = [0x888888, 0x999999, 0xaaaaaa, 0xbbbbbb, 0x777777];
            const color = Phaser.Math.RND.pick(colors);

            const smoke = this.gameScene.add.circle(x, y, size, color, 0.7);
            smoke.setDepth(1000);

            const targetX = x + Math.cos(angle) * speed;
            const targetY = y + Math.sin(angle) * speed;

            this.gameScene.tweens.add({
                targets: smoke,
                x: targetX,
                y: targetY - 20,
                alpha: 0,
                scale: 1.5,
                duration: Phaser.Math.Between(400, 700),
                ease: 'Quad.easeOut',
                onComplete: () => smoke.destroy()
            });
        }

        const centralSmoke = this.gameScene.add.circle(x, y, 25, 0x666666, 0.5);
        centralSmoke.setDepth(999);
        this.gameScene.tweens.add({
            targets: centralSmoke,
            scale: 2.5,
            alpha: 0,
            duration: 500,
            ease: 'Quad.easeOut',
            onComplete: () => centralSmoke.destroy()
        });
    }

    private startInvisibility(): void {
        if (!this.gameScene || !this.playerSprite.active) return;

        this.playerSprite.setAlpha(0.15);
        this.playerSprite.setTint(0x888888);

        this.playerSprite.setData('invisible', true);

        const shimmerTimer = this.gameScene.time.addEvent({
            delay: 200,
            callback: () => {
                if (this.playerSprite.active && this.playerSprite.getData('invisible')) {
                    const currentAlpha = this.playerSprite.alpha;
                    this.playerSprite.setAlpha(currentAlpha === 0.15 ? 0.2 : 0.15);
                }
            },
            loop: true
        });

        this.gameScene.time.delayedCall(this.invisibilityDuration, () => {
            shimmerTimer.destroy();

            if (this.playerSprite.active) {
                this.gameScene.tweens.add({
                    targets: this.playerSprite,
                    alpha: 1,
                    duration: 300,
                    onComplete: () => {
                        this.playerSprite.clearTint();
                        this.playerSprite.setData('invisible', false);
                    }
                });

                this.createReappearEffect();
            }
        });
    }

    private createReappearEffect(): void {
        if (!this.gameScene || !this.playerSprite.active) return;

        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const smoke = this.gameScene.add.circle(
                this.playerSprite.x + Math.cos(angle) * 10,
                this.playerSprite.y + Math.sin(angle) * 10,
                5,
                0xaaaaaa,
                0.5
            );
            smoke.setDepth(999);

            this.gameScene.tweens.add({
                targets: smoke,
                x: smoke.x + Math.cos(angle) * 20,
                y: smoke.y + Math.sin(angle) * 20 - 10,
                alpha: 0,
                duration: 300,
                onComplete: () => smoke.destroy()
            });
        }
    }

    public onHit(_target: any): void {
        // No damage
    }

    public applyHit(_enemy: any): void {
        // No damage
    }
}
