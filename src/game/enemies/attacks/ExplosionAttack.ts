import { Scene } from 'phaser';

/**
 * Explosion attack for Elemental Spirit - area damage on suicide
 */
export class ExplosionAttack {
    public explosionSprite: Phaser.GameObjects.Sprite | null = null;
    public damage: number;
    public scene: Scene;
    private active: boolean = true;
    private lifetime: number = 0.5; // Explosion animation duration
    private elapsed: number = 0;
    public x: number;
    public y: number;
    private maxRadius: number = 120; // Maximum explosion radius
    public currentRadius: number;
    
    constructor(scene: Scene, x: number, y: number, damage: number) {
        this.scene = scene;
        this.damage = damage;
        this.x = x;
        this.y = y;
        this.currentRadius = this.maxRadius; // Set to max immediately
        
        // Check if explosion texture exists
        if (scene.textures.exists('explosion')) {
            // Create explosion sprite
            this.explosionSprite = scene.add.sprite(x, y, 'explosion');
            // Scale the 72x72 frame for explosion effect (smaller, tighter explosion)
            this.explosionSprite.setScale(2.5); // Scaled down for better visual balance
            this.explosionSprite.setDepth(7); // Above most game objects
            this.explosionSprite.setOrigin(0.5, 0.5); // Center origin
            
            // Play explosion animation if it exists
            if (scene.anims.exists('explosion-effect')) {
                this.explosionSprite.play('explosion-effect');
                
                // Destroy when animation completes
                this.explosionSprite.once('animationcomplete', () => {
                    this.destroy();
                });
            }
            
            console.log(`💥 Explosion sprite created at (${x.toFixed(0)}, ${y.toFixed(0)})`);
        } else {
            console.warn('Explosion texture not loaded, using fallback');
            // Fallback: Create a simple flash effect
            const fallbackFlash = scene.add.graphics();
            fallbackFlash.fillStyle(0xff6600, 0.8);
            fallbackFlash.fillCircle(x, y, this.maxRadius);
            fallbackFlash.setDepth(7);
            
            scene.time.delayedCall(300, () => {
                fallbackFlash.destroy();
                this.destroy();
            });
        }
    }

    public update(deltaTime: number): void {
        if (!this.active) return;
        
        this.elapsed += deltaTime;
        
        // Destroy after lifetime (safety check in case animation doesn't complete)
        if (this.elapsed >= this.lifetime) {
            this.destroy();
        }
    }

    public destroy(): void {
        this.active = false;
        if (this.explosionSprite && this.explosionSprite.scene) {
            this.explosionSprite.destroy();
        }
    }

    public isActive(): boolean {
        return this.active;
    }

    public isPointInExplosion(px: number, py: number): boolean {
        // Check if a point is within the explosion radius
        const dx = px - this.x;
        const dy = py - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= this.currentRadius;
    }
    
    public getPosition(): { x: number; y: number } {
        return { x: this.x, y: this.y };
    }
}
