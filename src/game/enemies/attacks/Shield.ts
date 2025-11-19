import { Scene } from 'phaser';

/**
 * Shield class for blocking projectiles
 */
export class Shield {
    public sprite: Phaser.GameObjects.Graphics;
    public scene: Scene;
    private active: boolean = true;
    private lifetime: number = 3.0; // Shield lasts 3 seconds
    private elapsed: number = 0;
    public x: number;
    public y: number;
    public width: number;
    public height: number;
    private angle: number;
    private ownerRadius: number;

    constructor(scene: Scene, enemyX: number, enemyY: number, playerX: number, playerY: number, enemyRadius: number, width: number = 60, height: number = 120) {
        this.scene = scene;
        this.width = width; // Narrow (front-to-back depth)
        this.height = height; // Tall (side-to-side width when rotated)
        this.ownerRadius = enemyRadius;
        
        // Calculate angle towards player
        const dx = playerX - enemyX;
        const dy = playerY - enemyY;
        this.angle = Math.atan2(dy, dx);
        
        // Position shield closer to the Viking - just touching the edge
        const shieldDistance = enemyRadius + (width / 4); // Reduced from width/2 to width/4
        this.x = enemyX + Math.cos(this.angle) * shieldDistance;
        this.y = enemyY + Math.sin(this.angle) * shieldDistance;
        
        console.log(`Shield created - Enemy radius: ${enemyRadius.toFixed(1)}, Shield distance from center: ${shieldDistance.toFixed(1)}, Position: (${this.x.toFixed(0)}, ${this.y.toFixed(0)})`);
        
        // Create a blue shield graphic (narrow front-to-back, tall side-to-side)
        this.sprite = scene.add.graphics();
        this.sprite.lineStyle(5, 0x4444ff, 1); // Thicker blue border
        this.sprite.fillStyle(0x6666ff, 0.6); // Blue semi-transparent fill
        this.sprite.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
        this.sprite.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
        this.sprite.setPosition(this.x, this.y);
        this.sprite.setRotation(this.angle);
        this.sprite.setDepth(6);
    }

    public update(deltaTime: number, enemyX: number, enemyY: number): void {
        if (!this.active) return;
        
        this.elapsed += deltaTime;
        
        // Update position to follow enemy - keep shield close to Viking
        const shieldDistance = this.ownerRadius + (this.width / 4);
        this.x = enemyX + Math.cos(this.angle) * shieldDistance;
        this.y = enemyY + Math.sin(this.angle) * shieldDistance;
        this.sprite.setPosition(this.x, this.y);
        
        // Pulse effect - shield gets brighter as it's about to expire
        const remainingPercent = 1 - (this.elapsed / this.lifetime);
        const alpha = 0.3 + (Math.sin(this.elapsed * 5) * 0.2 * (1 - remainingPercent));
        this.sprite.setAlpha(alpha);
        
        // Destroy after lifetime
        if (this.elapsed >= this.lifetime) {
            this.destroy();
        }
    }

    public destroy(): void {
        this.active = false;
        this.sprite.destroy();
    }

    public isActive(): boolean {
        return this.active;
    }

    public getBounds(): { x: number; y: number; width: number; height: number } {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }

    public getAngle(): number {
        return this.angle;
    }
    
    /**
     * Check if a projectile collides with this shield
     * Returns true if the projectile should be blocked
     * Uses a hybrid approach: check if projectile is in front of the shield AND within range
     */
    public blocksProjectile(projectileX: number, projectileY: number): boolean {
        if (!this.active) return false;
        
        const dx = projectileX - this.x;
        const dy = projectileY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // First check: Is the projectile close enough to the shield?
        // Use the shield's height (side-to-side width) as the blocking radius
        const blockingRadius = this.height / 2 + 35; // Height is the wide dimension
        
        if (distance > blockingRadius) {
            return false; // Too far away
        }
        
        // Second check: Is the projectile coming from in front of the shield?
        // Calculate the angle from shield to projectile
        const projectileAngle = Math.atan2(dy, dx);
        
        // Calculate the angle difference (how far off from straight ahead)
        let angleDiff = projectileAngle - this.angle;
        
        // Normalize to -PI to PI
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        // Block if projectile is within 100 degrees in front (±50 degrees from center)
        const blockingAngle = Math.PI * 0.55; // ~100 degrees total (50 each side)
        const blocked = Math.abs(angleDiff) <= blockingAngle;
        
        if (blocked) {
            console.log(`Shield blocked! Distance: ${distance.toFixed(1)}/${blockingRadius.toFixed(1)}, Angle diff: ${(angleDiff * 180 / Math.PI).toFixed(1)}°`);
        } else if (distance < blockingRadius) {
            console.log(`Shield MISS! Distance OK but angle too wide: ${(angleDiff * 180 / Math.PI).toFixed(1)}° (limit: ±${(blockingAngle * 180 / Math.PI).toFixed(1)}°)`);
        }
        
        return blocked;
    }
}
