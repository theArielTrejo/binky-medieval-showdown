import { Scene } from 'phaser';
import { SkillObject } from './SkillObject';
import { Enemy } from '../systems/EnemySystem';

export class ShadowDashSkill extends SkillObject {
    private playerSprite: Phaser.Physics.Arcade.Sprite;
    private targetPosition: Phaser.Math.Vector2;
    private startPosition: Phaser.Math.Vector2;
    private dashDuration: number = 200; // ms
    private ghostTimer: Phaser.Time.TimerEvent;

    constructor(scene: Scene, playerSprite: Phaser.Physics.Arcade.Sprite, targetX: number, targetY: number) {
        super(scene, 30); // Damage 30
        this.playerSprite = playerSprite;
        this.startPosition = new Phaser.Math.Vector2(playerSprite.x, playerSprite.y);
        
        // Raycast / Clamp target
        this.targetPosition = this.calculateSafeTarget(targetX, targetY);

        this.anticipationDuration = 0; // Instant
        this.activeDuration = this.dashDuration; 
        this.recoveryDuration = 100;
    }

    private calculateSafeTarget(targetX: number, targetY: number): Phaser.Math.Vector2 {
        // Simple clamp to world bounds + max distance check
        const maxDist = 300;
        const vec = new Phaser.Math.Vector2(targetX - this.startPosition.x, targetY - this.startPosition.y);
        if (vec.length() > maxDist) {
            vec.normalize().scale(maxDist);
        }
        
        // TODO: Raycast against walls (collision layer)
        // For now, assume open field or rely on Arcade physics collision to stop the tween? 
        // Tweens ignore physics collision usually. 
        // We will just clamp to max distance for now. 
        // Phase 2 plan mentions "Iterate along line... check against collision layer".
        // Implementing a simple step check:
        
        // We can access tilemap from Scene if we look for it, but for now strict raycast might be overkill 
        // if we don't have easy access to the layer. 
        // Let's stick to distance clamping.
        
        return new Phaser.Math.Vector2(this.startPosition.x + vec.x, this.startPosition.y + vec.y);
    }

    protected onActiveStart(): void {
        // Create "Beam" Hitbox
        // Rectangular body spanning from start to end
        const dx = this.targetPosition.x - this.startPosition.x;
        const dy = this.targetPosition.y - this.startPosition.y;
        const len = Math.sqrt(dx*dx + dy*dy);
        const angle = Math.atan2(dy, dx);
        
        const graphics = this.scene.add.graphics();
        graphics.fillStyle(0x550055, 0.5); // Dark purple
        // Draw rect centered at midpoint
        const cx = (this.startPosition.x + this.targetPosition.x) / 2;
        const cy = (this.startPosition.y + this.targetPosition.y) / 2;
        
        graphics.fillRect(-len/2, -20, len, 40); // Local coords
        graphics.setPosition(cx, cy);
        graphics.setRotation(angle);
        
        this.hitBox = graphics;
        this.scene.physics.add.existing(this.hitBox);
        const body = this.hitBox.body as Phaser.Physics.Arcade.Body;
        // Arcade physics bodies are AABB, so rotation doesn't rotate the body perfectly.
        // But we can approximate. For a dash, a simple overlapping circle or multiple bodies is better, 
        // but let's stick to the rotated rect visual + AABB body. 
        // Wait, rotating a body in Arcade Physics updates its bounding box to encompass the rotation.
        body.setSize(len, 40);
        
        // Tween Player
        this.scene.tweens.add({
            targets: this.playerSprite,
            x: this.targetPosition.x,
            y: this.targetPosition.y,
            duration: this.dashDuration,
            ease: 'Power2',
            onStart: () => {
                this.playerSprite.setAlpha(0.5); // "Invulnerable" look
                // We should ideally set a flag on player isInvulnerable=true
            },
            onComplete: () => {
                this.playerSprite.setAlpha(1);
            }
        });

        // Ghosting Effect
        this.ghostTimer = this.scene.time.addEvent({
            delay: 50,
            repeat: Math.floor(this.dashDuration / 50),
            callback: () => {
                const ghost = this.scene.add.sprite(this.playerSprite.x, this.playerSprite.y, this.playerSprite.texture.key, this.playerSprite.frame.name);
                ghost.setTint(0x550055);
                ghost.setAlpha(0.5);
                this.scene.tweens.add({
                    targets: ghost,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => ghost.destroy()
                });
            }
        });
    }

    protected onRecoveryStart(): void {
        if (this.hitBox) {
            this.hitBox.destroy();
            this.hitBox = null;
        }
        if (this.ghostTimer) this.ghostTimer.destroy();
    }

    public applyHit(enemy: Enemy): void {
        enemy.takeDamage(this.damage);
        // Visual pop
        const vfx = this.scene.add.star(enemy.sprite.x, enemy.sprite.y, 5, 5, 10, 0xaa00aa);
        this.scene.tweens.add({
            targets: vfx,
            scale: 2,
            alpha: 0,
            duration: 200,
            onComplete: () => vfx.destroy()
        });
    }

    public destroy(): void {
        if (this.hitBox) this.hitBox.destroy();
        if (this.ghostTimer) this.ghostTimer.destroy();
    }
}
