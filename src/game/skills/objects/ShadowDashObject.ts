import { Scene } from 'phaser';
import { SkillObject } from '../SkillObject';

export class ShadowDashObject extends SkillObject {
    private playerSprite: Phaser.Physics.Arcade.Sprite;
    private targetPosition: Phaser.Math.Vector2;
    private startPosition: Phaser.Math.Vector2;
    private invisibilityDuration: number = 2000; // 2 seconds invisible
    private gameScene: Scene; // Store scene reference

    constructor(scene: Scene, x: number, y: number, playerSprite: Phaser.Physics.Arcade.Sprite, targetX: number, targetY: number, _damage: number, duration: number = 200) {
        super(scene, x, y, 0, duration); // No damage
        
        this.gameScene = scene; // Store reference before it gets destroyed
        this.playerSprite = playerSprite;
        this.startPosition = new Phaser.Math.Vector2(x, y);
        
        this.targetPosition = this.calculateSafeTarget(targetX, targetY);
        
        // Create smoke bomb effect at start position
        this.createSmokeBomb(x, y);
        
        // Tween Player to target
        scene.tweens.add({
            targets: this.playerSprite,
            x: this.targetPosition.x,
            y: this.targetPosition.y,
            duration: duration,
            ease: 'Power2',
            onStart: () => {
                // Make player semi-transparent during dash
                this.playerSprite.setAlpha(0.3);
            },
            onComplete: () => {
                // Start invisibility (no smoke at landing)
                this.startInvisibility();
            }
        });

        // No physics body needed since we don't deal damage
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setSize(1, 1); // Minimal size
        }
    }

    private calculateSafeTarget(targetX: number, targetY: number): Phaser.Math.Vector2 {
        const maxDist = 250;
        const vec = new Phaser.Math.Vector2(targetX - this.startPosition.x, targetY - this.startPosition.y);
        if (vec.length() > maxDist) {
            vec.normalize().scale(maxDist);
        }
        return new Phaser.Math.Vector2(this.startPosition.x + vec.x, this.startPosition.y + vec.y);
    }

    private createSmokeBomb(x: number, y: number): void {
        if (!this.gameScene) return;
        
        // Create multiple smoke particles in a burst
        const numParticles = 20;
        
        for (let i = 0; i < numParticles; i++) {
            const angle = (i / numParticles) * Math.PI * 2;
            const speed = Phaser.Math.Between(30, 80);
            const size = Phaser.Math.Between(8, 18);
            
            // Smoke colors - grays and whites
            const colors = [0x888888, 0x999999, 0xaaaaaa, 0xbbbbbb, 0x777777];
            const color = Phaser.Math.RND.pick(colors);
            
            const smoke = this.gameScene.add.circle(x, y, size, color, 0.7);
            smoke.setDepth(1000);
            
            const targetX = x + Math.cos(angle) * speed;
            const targetY = y + Math.sin(angle) * speed;
            
            this.gameScene.tweens.add({
                targets: smoke,
                x: targetX,
                y: targetY - 20, // Float upward
                alpha: 0,
                scale: 1.5,
                duration: Phaser.Math.Between(400, 700),
                ease: 'Quad.easeOut',
                onComplete: () => smoke.destroy()
            });
        }
        
        // Add a larger central smoke cloud
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
        
        // Make player very transparent (almost invisible)
        this.playerSprite.setAlpha(0.15);
        this.playerSprite.setTint(0x888888);
        
        // Store that player is invisible
        this.playerSprite.setData('invisible', true);
        
        // Create subtle shimmer effect during invisibility
        const shimmerTimer = this.gameScene.time.addEvent({
            delay: 200,
            callback: () => {
                if (this.playerSprite.active && this.playerSprite.getData('invisible')) {
                    // Subtle alpha flicker
                    const currentAlpha = this.playerSprite.alpha;
                    this.playerSprite.setAlpha(currentAlpha === 0.15 ? 0.2 : 0.15);
                }
            },
            loop: true
        });
        
        // End invisibility after duration
        this.gameScene.time.delayedCall(this.invisibilityDuration, () => {
            shimmerTimer.destroy();
            
            if (this.playerSprite.active) {
                // Fade back in
                this.gameScene.tweens.add({
                    targets: this.playerSprite,
                    alpha: 1,
                    duration: 300,
                    onComplete: () => {
                        this.playerSprite.clearTint();
                        this.playerSprite.setData('invisible', false);
                    }
                });
                
                // Small smoke puff when reappearing
                this.createReappearEffect();
            }
        });
    }

    private createReappearEffect(): void {
        if (!this.gameScene || !this.playerSprite.active) return;
        
        // Small smoke effect when becoming visible again
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
        // No damage - smoke bomb dash is purely evasive
    }

    public applyHit(_enemy: any): void {
        // No damage
    }
}
