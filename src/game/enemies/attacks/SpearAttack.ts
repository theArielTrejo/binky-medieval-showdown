import { Scene } from 'phaser';

/**
 * Spear attack for skeleton Viking - animated spear thrust
 */
export class SpearAttack {
    public sprite: Phaser.GameObjects.Sprite;
    public damage: number;
    public scene: Scene;
    private active: boolean = true;
    private lifetime: number = 0.5; // Attack lasts 0.5 seconds for full animation
    private elapsed: number = 0;
    public x: number;
    public y: number;
    public angle: number; // Direction the spear points
    public length: number; // How far the spear extends
    private enemyRadius: number;
    private hasDealtDamage: boolean = false;

    constructor(scene: Scene, enemyX: number, enemyY: number, playerX: number, playerY: number, damage: number, enemyRadius: number, length: number = 70) {
        this.scene = scene;
        this.damage = damage;
        this.x = enemyX;
        this.y = enemyY;
        this.length = length; // Reduced to match smaller visual
        this.enemyRadius = enemyRadius;
        
        // Calculate angle towards player - full 360 degree support
        const dx = playerX - enemyX;
        const dy = playerY - enemyY;
        this.angle = Math.atan2(dy, dx);
        
        // Create spear animation from individual images if it doesn't exist
        if (!scene.anims.exists('spear-thrust')) {
            scene.anims.create({
                key: 'spear-thrust',
                frames: [
                    { key: 'spear-1' },
                    { key: 'spear-2' },
                    { key: 'spear-3' },
                    { key: 'spear-4' }
                ],
                frameRate: 8, // Slightly faster animation
                repeat: 0
            });
        }
        
        // Position the spear at the edge of the enemy, not the center
        const spearX = enemyX + Math.cos(this.angle) * enemyRadius;
        const spearY = enemyY + Math.sin(this.angle) * enemyRadius;
        
        // Create the spear sprite at the edge of the enemy
        this.sprite = scene.add.sprite(spearX, spearY, 'spear-1');
        this.sprite.setScale(0.09); // Slightly smaller
        this.sprite.setOrigin(0.0, 0.5); // Origin at left edge so spear extends outward from enemy edge
        this.sprite.setRotation(this.angle); // Point towards player
        this.sprite.setDepth(15); // High depth to ensure visibility above enemies
        
        // Play the animation
        this.sprite.play('spear-thrust');
    }

    public update(deltaTime: number): void {
        if (!this.active) return;
        
        this.elapsed += deltaTime;
        
        // Fade out near end of lifetime
        if (this.elapsed > this.lifetime * 0.7) {
            const fadeProgress = (this.elapsed - this.lifetime * 0.7) / (this.lifetime * 0.3);
            this.sprite.setAlpha(1 - fadeProgress);
        }
        
        // Destroy after lifetime
        if (this.elapsed >= this.lifetime) {
            this.destroy();
        }
    }

    public destroy(): void {
        this.active = false;
        if (this.sprite) {
            this.sprite.destroy();
        }
    }

    public isActive(): boolean {
        return this.active;
    }

    /**
     * Check if a point is hit by the spear
     * The spear is a line extending from the enemy in the attack direction
     */
    public isPointInSpear(px: number, py: number): boolean {
        if (!this.active) return false;
        
        // Get current animation progress (0-1)
        const progress = Math.min(this.elapsed / (this.lifetime * 0.5), 1);
        
        // Spear extends further as animation progresses
        const currentLength = this.length * progress;
        
        // Check if point is near the spear line
        // Use a capsule collision (line with thickness)
        const spearThickness = 12; // Width of the spear hitbox (reduced to match smaller visual)
        
        // Vector from enemy to point
        const epx = px - this.x;
        const epy = py - this.y;
        
        // Vector along spear direction
        const spearDirX = Math.cos(this.angle);
        const spearDirY = Math.sin(this.angle);
        
        // Project point onto spear line
        const projLength = epx * spearDirX + epy * spearDirY;
        
        // Check if projection is within spear range
        if (projLength < this.enemyRadius || projLength > this.enemyRadius + currentLength) {
            return false;
        }
        
        // Calculate perpendicular distance to spear line
        const projX = this.x + spearDirX * projLength;
        const projY = this.y + spearDirY * projLength;
        const perpDist = Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
        
        return perpDist <= spearThickness;
    }

    /**
     * Mark that damage has been dealt (to prevent multiple hits)
     */
    public markDamageDealt(): void {
        this.hasDealtDamage = true;
    }

    public hasDamageBeenDealt(): boolean {
        return this.hasDealtDamage;
    }
}

