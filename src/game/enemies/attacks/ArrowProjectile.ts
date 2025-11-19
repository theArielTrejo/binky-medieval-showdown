import { Scene } from 'phaser';
import { BaseProjectile } from '../../objects/BaseProjectile';

/**
 * Arrow projectile class for skeleton archer attacks
 * High-speed arrow that travels in a straight line
 */
export class ArrowProjectile extends BaseProjectile {
    private distanceTraveled: number = 0;
    private maxDistance: number = 1000;
    private collisionLayers: Phaser.Tilemaps.TilemapLayer[] = [];

    constructor(scene: Scene, x: number, y: number, angle: number, damage: number, collisionLayers: Phaser.Tilemaps.TilemapLayer[] = [], speed: number = 600) {
        super(scene, damage);
        this.collisionLayers = collisionLayers;
        
        // Try to use the arrow texture, fallback to graphics
        if (scene.textures.exists('arrow')) {
            this.sprite = scene.add.sprite(x, y, 'arrow');
            this.sprite.setScale(0.1); // Match player/enemy scale
            this.sprite.setRotation(angle);
            this.sprite.setOrigin(0.5, 0.5);
        } else {
            // Fallback: Create an arrow-shaped graphic
            this.sprite = scene.add.graphics();
            const graphics = this.sprite as Phaser.GameObjects.Graphics;
            graphics.fillStyle(0x8B4513, 1); // Brown arrow
            graphics.fillTriangle(0, -3, 0, 3, 20, 0); // Arrow head
            graphics.fillRect(-10, -1.5, 10, 3); // Arrow shaft
            this.sprite.setPosition(x, y);
            this.sprite.setRotation(angle);
        }
        
        this.sprite.setDepth(10); // Above most game objects
        
        // Calculate velocity from angle
        this.velocityX = Math.cos(angle) * speed;
        this.velocityY = Math.sin(angle) * speed;
    }

    public update(deltaTime: number): void {
        if (!this.active) return;
        
        // Calculate movement for this frame
        const moveX = this.velocityX * deltaTime;
        const moveY = this.velocityY * deltaTime;
        const moveDist = Math.sqrt(moveX * moveX + moveY * moveY);
        
        // Move arrow
        this.sprite.x += moveX;
        this.sprite.y += moveY;
        this.distanceTraveled += moveDist;
        
        // Check if traveled max distance
        if (this.distanceTraveled >= this.maxDistance) {
            this.destroy();
            return;
        }
        
        // Check collision with walls/obstacles
        if (this.checkWallCollision()) {
            this.destroy();
            return;
        }
        
        // Check if out of bounds
        if (this.sprite.x < -50 || this.sprite.x > 4096 || 
            this.sprite.y < -50 || this.sprite.y > 4096) {
            this.destroy();
        }
    }

    private checkWallCollision(): boolean {
        // Check collision with tilemap layers
        for (const layer of this.collisionLayers) {
            const tile = layer.getTileAtWorldXY(this.sprite.x, this.sprite.y);
            if (tile && tile.collides) {
                return true;
            }
        }
        return false;
    }
}
