import { Scene } from 'phaser';
import { SkillObject } from '../SkillObject';
import { Enemy } from '../../systems/EnemySystem';

export class ShadowDashObject extends SkillObject {
    private playerSprite: Phaser.Physics.Arcade.Sprite;
    private targetPosition: Phaser.Math.Vector2;
    private startPosition: Phaser.Math.Vector2;
    private ghostTimer?: Phaser.Time.TimerEvent;

    constructor(scene: Scene, x: number, y: number, playerSprite: Phaser.Physics.Arcade.Sprite, targetX: number, targetY: number, damage: number = 30, duration: number = 200) {
        super(scene, x, y, damage, duration);
        
        this.playerSprite = playerSprite;
        this.startPosition = new Phaser.Math.Vector2(x, y);
        
        this.targetPosition = this.calculateSafeTarget(targetX, targetY);
        
        // Visuals (Beam)
        const dx = this.targetPosition.x - this.startPosition.x;
        const dy = this.targetPosition.y - this.startPosition.y;
        const len = Math.sqrt(dx*dx + dy*dy);
        const angle = Math.atan2(dy, dx);
        
        const graphics = this.scene.add.graphics();
        graphics.fillStyle(0x550055, 0.5);
        
        // Draw beam from (0,0) to (len, 0) rotated
        graphics.fillRect(0, -20, len, 40);
        graphics.setRotation(angle);
        this.add(graphics);
        
        // Physics Body
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            // Set size to cover the dash length roughly
            // For AABB, we need max width/height based on angle?
            // For simplicity, make it large enough or circular?
            // Let's use len/2 radius?
            // Or just setSize(len, 40) and hope rotation (which Arcade doesn't support) isn't too off.
            // Actually, if we use AABB, we should setSize to bounds of the rotated rect.
            // But Container rotation affects children, not body if body is on Container?
            // Body is on Container.
            // If Container is not rotated, Body is AABB.
            // We rotate Graphics inside.
            // So Container is AABB at Start.
            // We want Body to cover the path.
            // We can place Container at Midpoint?
            // But logic expects Container at Start.
            
            // Let's set size to simple box for now.
            body.setSize(len, 60);
            // Offset to cover path?
            // If angle is 0, len is along X. Offset 0.
            // If angle is 90, len is along Y.
            // This is the limitation of Arcade Physics.
            // ShadowDash usually hits everything in path.
            // We can assume it hits everything intersecting the AABB of start/end points.
            // To do this effectively with Arcade, we might need multiple bodies or a big box.
            body.setSize(Math.abs(dx) + 40, Math.abs(dy) + 40);
            // Center the body?
            // Body is top-left relative to container.
            // Container is at Start.
            // We need Body to cover Start -> Target.
            // If Target > Start (positive dx, dy).
            // Body from 0,0 to dx,dy.
            // If Target < Start.
            // Body from dx,dy to 0,0.
            // We need to set Offset.
            const minX = Math.min(0, dx);
            const minY = Math.min(0, dy);
            body.setOffset(minX, minY);
        }
        
        // Tween Player
        this.scene.tweens.add({
            targets: this.playerSprite,
            x: this.targetPosition.x,
            y: this.targetPosition.y,
            duration: duration,
            ease: 'Power2',
            onStart: () => {
                this.playerSprite.setAlpha(0.5);
            },
            onComplete: () => {
                this.playerSprite.setAlpha(1);
            }
        });

        // Ghosting
        this.ghostTimer = this.scene.time.addEvent({
            delay: 50,
            repeat: Math.floor(duration / 50),
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

    private calculateSafeTarget(targetX: number, targetY: number): Phaser.Math.Vector2 {
        const maxDist = 300;
        const vec = new Phaser.Math.Vector2(targetX - this.startPosition.x, targetY - this.startPosition.y);
        if (vec.length() > maxDist) {
            vec.normalize().scale(maxDist);
        }
        return new Phaser.Math.Vector2(this.startPosition.x + vec.x, this.startPosition.y + vec.y);
    }

    public onHit(target: any): void {
        const enemy = target as Enemy;
        if (enemy) {
             this.applyHit(enemy);
        }
    }

    public applyHit(enemy: Enemy): void {
        enemy.takeDamage(this.damage);
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
        if (this.ghostTimer) this.ghostTimer.destroy();
        super.destroy();
    }
}