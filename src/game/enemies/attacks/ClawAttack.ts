import { Scene } from 'phaser';

/**
 * Claw attack for Gnoll - animated melee effect that appears on the player
 */
export class ClawAttack {
    public clawSprite: Phaser.GameObjects.Sprite | null = null;
    public damage: number;
    public scene: Scene;
    private active: boolean = true;
    private lifetime: number = 0.5; // Claw animation duration
    private elapsed: number = 0;
    public x: number;
    public y: number;
    public width: number = 80; // Hitbox width for collision detection
    public height: number = 80; // Hitbox height for collision detection
    
    constructor(scene: Scene, targetX: number, targetY: number, damage: number) {
        this.scene = scene;
        this.damage = damage;
        this.x = targetX;
        this.y = targetY;
        
        // Check if claw texture exists
        if (scene.textures.exists('gnoll-claw-1')) {
            // Create claw sprite at player position
            this.clawSprite = scene.add.sprite(targetX, targetY, 'gnoll-claw-1');
            // Scale the claw effect smaller than the player
            this.clawSprite.setScale(0.05); // Smaller, more precise claw slash
            this.clawSprite.setDepth(7); // Above most game objects but below UI
            this.clawSprite.setOrigin(0.5, 0.5); // Center origin on player
            
            // Play claw animation if it exists
            if (scene.anims.exists('gnoll-claw-attack')) {
                this.clawSprite.play('gnoll-claw-attack');
                
                // Destroy when animation completes
                this.clawSprite.once('animationcomplete', () => {
                    this.destroy();
                });
            }
            
            console.log(`🐺 Claw sprite created at (${targetX.toFixed(0)}, ${targetY.toFixed(0)})`);
        } else {
            console.warn('Claw texture not loaded, using fallback');
            // Fallback: Create a simple red slash effect
            const fallbackSlash = scene.add.graphics();
            fallbackSlash.lineStyle(4, 0xff0000, 0.8);
            fallbackSlash.beginPath();
            fallbackSlash.moveTo(targetX - 30, targetY - 30);
            fallbackSlash.lineTo(targetX + 30, targetY + 30);
            fallbackSlash.strokePath();
            fallbackSlash.setDepth(7);
            
            scene.time.delayedCall(300, () => {
                fallbackSlash.destroy();
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
        if (this.clawSprite && this.clawSprite.scene) {
            this.clawSprite.destroy();
        }
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
    
    public getPosition(): { x: number; y: number } {
        return { x: this.x, y: this.y };
    }
}
