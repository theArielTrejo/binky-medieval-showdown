import { Scene } from 'phaser';
import { BaseProjectile } from '../../objects/BaseProjectile';

/**
 * Enemy projectile class for ranged attacks
 */
export class EnemyProjectile extends BaseProjectile {
    constructor(scene: Scene, x: number, y: number, targetX: number, targetY: number, damage: number, speed: number = 200) {
        super(scene, damage);
        
        // Create a red circle for the projectile
        this.sprite = scene.add.graphics();
        const graphics = this.sprite as Phaser.GameObjects.Graphics;
        graphics.fillStyle(0xff0000, 1); // Red color
        graphics.fillCircle(0, 0, 8); // 8px radius circle
        this.sprite.setPosition(x, y);
        this.sprite.setDepth(10); // Above most game objects
        
        // Calculate direction to target
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Normalize and apply speed
        this.velocityX = (dx / distance) * speed;
        this.velocityY = (dy / distance) * speed;
    }

    public update(deltaTime: number): void {
        if (!this.active) return;
        
        super.update(deltaTime);
        
        // Check if out of bounds (assuming game bounds of 0-1024 x 0-768)
        if (this.sprite.x < -50 || this.sprite.x > 1074 || 
            this.sprite.y < -50 || this.sprite.y > 818) {
            this.destroy();
        }
    }
}
