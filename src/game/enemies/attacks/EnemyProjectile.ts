import { Scene } from 'phaser';
import { BaseProjectile } from '../../objects/BaseProjectile';

/**
 * Enemy projectile class for ranged attacks
 * Supports both graphics-based circles and sprite-based projectiles
 */
export class EnemyProjectile extends BaseProjectile {
    private startX: number;
    private startY: number;
    private maxDistance: number = 1500; // Max travel distance before auto-destroy
    private radius: number = 8; // Collision radius
    private collisionLayers: Phaser.Tilemaps.TilemapLayer[] = [];
    private useSprite: boolean = false;

    constructor(
        scene: Scene, 
        x: number, 
        y: number, 
        targetX: number, 
        targetY: number, 
        damage: number, 
        speed: number = 200, 
        colorOrTexture: number | string = 0xff0000,
        collisionLayers: Phaser.Tilemaps.TilemapLayer[] = [],
        scale: number = 0.05
    ) {
        super(scene, damage);
        
        this.startX = x;
        this.startY = y;
        this.collisionLayers = collisionLayers;
        
        // Check if we're using a texture key (string) or color (number)
        if (typeof colorOrTexture === 'string' && scene.textures.exists(colorOrTexture)) {
            // Use sprite-based projectile
            this.useSprite = true;
            this.sprite = scene.add.sprite(x, y, colorOrTexture);
            (this.sprite as Phaser.GameObjects.Sprite).setScale(scale);
            this.sprite.setDepth(10);
            
            // Calculate radius from sprite bounds for collision
            const bounds = this.sprite.getBounds();
            this.radius = Math.max(bounds.width, bounds.height) / 2;
        } else {
            // Fallback to graphics-based circle
            const color = typeof colorOrTexture === 'number' ? colorOrTexture : 0xff0000;
            this.sprite = scene.add.graphics();
            const graphics = this.sprite as Phaser.GameObjects.Graphics;
            
            // Add outer glow for white projectiles
            if (color === 0xffffff) {
                graphics.fillStyle(0xcccccc, 0.3);
                graphics.fillCircle(0, 0, 12);
            }
            
            graphics.fillStyle(color, 1);
            graphics.fillCircle(0, 0, this.radius);
            this.sprite.setPosition(x, y);
            this.sprite.setDepth(10);
        }
        
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
        
        // Check collision with walls/obstacles
        if (this.checkWallCollision()) {
            this.destroy();
            return;
        }
        
        // Check if projectile has traveled too far from spawn point
        const dx = this.sprite.x - this.startX;
        const dy = this.sprite.y - this.startY;
        const distanceTraveled = Math.sqrt(dx * dx + dy * dy);
        
        if (distanceTraveled > this.maxDistance) {
            this.destroy();
        }
    }

    /**
     * Check if projectile collides with any wall/obstacle tiles
     */
    private checkWallCollision(): boolean {
        for (const layer of this.collisionLayers) {
            const tile = layer.getTileAtWorldXY(this.sprite.x, this.sprite.y);
            if (tile && tile.collides) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get bounds for collision detection
     */
    public getBounds(): Phaser.Geom.Rectangle {
        if (this.useSprite && this.sprite instanceof Phaser.GameObjects.Sprite) {
            return this.sprite.getBounds();
        }
        // Graphics objects don't have proper getBounds, so we create one based on position and radius
        return new Phaser.Geom.Rectangle(
            this.sprite.x - this.radius,
            this.sprite.y - this.radius,
            this.radius * 2,
            this.radius * 2
        );
    }
}
