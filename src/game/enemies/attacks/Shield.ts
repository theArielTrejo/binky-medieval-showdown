import { Scene } from 'phaser';

/**
 * Shield class for blocking projectiles
 * Uses the bone shield sprite and orients based on direction to player (360 degrees)
 */
export class Shield {
    public sprite: Phaser.GameObjects.Sprite;
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

    /**
     * Creates a shield that faces towards the player position (360-degree orientation)
     * @param scene - The Phaser scene
     * @param enemyX - Enemy X position
     * @param enemyY - Enemy Y position
     * @param targetX - Target X position (usually player) to face towards
     * @param targetY - Target Y position (usually player) to face towards
     * @param enemyRadius - The enemy's collision radius
     * @param shieldHeight - How tall the shield should appear (default 50 - smaller shield)
     */
    constructor(scene: Scene, enemyX: number, enemyY: number, targetX: number, targetY: number, enemyRadius: number, shieldHeight: number = 50) {
        this.scene = scene;
        this.ownerRadius = enemyRadius;
        
        // Calculate angle towards the target (player) - this gives full 360-degree support
        const dx = targetX - enemyX;
        const dy = targetY - enemyY;
        this.angle = Math.atan2(dy, dx);
        
        // Create the bone shield sprite first to get its dimensions
        this.sprite = scene.add.sprite(0, 0, 'bone-shield');
        
        // Scale the sprite to desired height (smaller shield)
        // After rotation, the texture width becomes the visual height
        const textureWidth = this.sprite.width;
        const textureHeight = this.sprite.height;
        const scale = shieldHeight / textureWidth; // Use texture width since we're rotating 90 degrees
        this.sprite.setScale(scale);
        
        // After 90 degree rotation, width and height swap visually
        this.width = textureHeight * scale;  // The "depth" of the shield (narrow)
        this.height = textureWidth * scale;  // The "height" of the shield (tall)
        
        // Position shield just outside the Viking's radius
        const shieldDistance = enemyRadius + 10; // Just outside enemy, not overlapping
        this.x = enemyX + Math.cos(this.angle) * shieldDistance;
        this.y = enemyY + Math.sin(this.angle) * shieldDistance;
        this.sprite.setPosition(this.x, this.y);
        
        // Rotate the sprite to stand upright AND face the correct direction
        // Base rotation: -90 degrees to stand the horizontal sprite upright
        // Then add the facing angle to point it towards the target
        this.sprite.setRotation(this.angle - Math.PI / 2);
        
        this.sprite.setDepth(6);
        this.sprite.setAlpha(0.9);
    }

    public update(deltaTime: number, enemyX: number, enemyY: number): void {
        if (!this.active) return;
        
        this.elapsed += deltaTime;
        
        // Update position to follow enemy - keep shield just outside Viking
        const shieldDistance = this.ownerRadius + 10; // Same as constructor
        this.x = enemyX + Math.cos(this.angle) * shieldDistance;
        this.y = enemyY + Math.sin(this.angle) * shieldDistance;
        this.sprite.setPosition(this.x, this.y);
        
        // Pulse effect - shield pulses as it's about to expire
        const remainingPercent = 1 - (this.elapsed / this.lifetime);
        const alpha = 0.7 + (Math.sin(this.elapsed * 5) * 0.2 * (1 - remainingPercent));
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
     * Uses distance and angle checks to determine if projectile hits the shield
     */
    public blocksProjectile(projectileX: number, projectileY: number): boolean {
        if (!this.active) return false;
        
        const dx = projectileX - this.x;
        const dy = projectileY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // First check: Is the projectile close enough to the shield?
        // Use the shield's height (the tall/long dimension) plus a small buffer for the smaller shield
        const blockingRadius = this.height / 2 + 10; // Reduced buffer for smaller shield
        
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
        
        // Block if projectile is within 90 degrees in front (±45 degrees from center)
        // Tighter blocking arc for smaller shield
        const blockingAngle = Math.PI * 0.5; // ~90 degrees total (45 each side)
        const blocked = Math.abs(angleDiff) <= blockingAngle;
        
        return blocked;
    }
}
