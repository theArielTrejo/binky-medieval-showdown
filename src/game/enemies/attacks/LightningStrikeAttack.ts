import { Scene } from 'phaser';

/**
 * Lightning Strike attack - AOE delayed attack with warning indicator
 */
export class LightningStrikeAttack {
    public sprite: Phaser.GameObjects.Graphics;
    public lightningSprite: Phaser.GameObjects.Sprite | null = null;
    public damage: number;
    public scene: Scene;
    private active: boolean = true;
    private warningTime: number = 1.5; // Warning indicator lasts 1.5 seconds
    private elapsed: number = 0;
    public x: number;
    public y: number;
    public radius: number = 50; // AOE damage radius (reduced for tighter strikes)
    private hasStruck: boolean = false; // Track if lightning has struck
    
    constructor(scene: Scene, targetX: number, targetY: number, damage: number) {
        this.scene = scene;
        this.damage = damage;
        this.x = targetX;
        this.y = targetY;
        
        // Create flashing circle warning indicator
        this.sprite = scene.add.graphics();
        this.updateWarningGraphics();
        this.sprite.setDepth(4); // Below most game objects but visible
        
        console.log(`Lightning Strike warning at (${targetX.toFixed(0)}, ${targetY.toFixed(0)})`);
    }

    private updateWarningGraphics(): void {
        this.sprite.clear();
        
        // Calculate flash effect based on elapsed time
        const flashSpeed = 8; // Faster flashing as time runs out
        const flashIntensity = Math.sin(this.elapsed * flashSpeed) * 0.5 + 0.5;
        
        // Warning progress (how close to striking)
        const progress = this.elapsed / this.warningTime;
        
        // Simple translucent fill (gets more intense as time progresses)
        const fillAlpha = 0.15 + (progress * 0.35 * flashIntensity);
        this.sprite.fillStyle(0x66ddff, fillAlpha);
        this.sprite.fillCircle(0, 0, this.radius);
        
        this.sprite.setPosition(this.x, this.y);
    }

    private createLightningStrike(): void {
        // Remove warning indicator
        this.sprite.destroy();
        
        // Check if lightning bolt texture exists
        if (this.scene.textures.exists('lightning-bolt')) {
            // Create lightning bolt sprite - offset Y position downward for better ground impact
            const strikeY = this.y + 30; // Offset down to strike at ground level
            this.lightningSprite = this.scene.add.sprite(this.x, strikeY, 'lightning-bolt');
            // Frame is 72x72, warning circle is radius 50 (100 diameter), so scale: 100/72 = 1.39
            this.lightningSprite.setScale(1.39); // Scale to match warning circle size
            this.lightningSprite.setDepth(8); // Above most objects
            this.lightningSprite.setOrigin(0.5, 1.0); // Bottom center - lightning strikes down to player's feet
            
            // Play lightning animation if it exists
            if (this.scene.anims.exists('lightning-strike')) {
                this.lightningSprite.play('lightning-strike');
            }
            
            // Add flash effect at impact point
            const flash = this.scene.add.graphics();
            flash.fillStyle(0xffffff, 0.8);
            flash.fillCircle(this.x, this.y, this.radius * 0.7);
            flash.setDepth(7);
            
            // Fade out flash
            this.scene.tweens.add({
                targets: flash,
                alpha: 0,
                duration: 200,
                onComplete: () => flash.destroy()
            });
            
            console.log(`Lightning struck at (${this.x.toFixed(0)}, ${this.y.toFixed(0)})`);
        } else {
            console.warn('Lightning bolt texture not loaded, using fallback effect');
            // Fallback: Create a simple lightning effect with graphics
            const fallbackLightning = this.scene.add.graphics();
            fallbackLightning.lineStyle(8, 0xffffff, 1);
            fallbackLightning.lineBetween(this.x, this.y - 200, this.x, this.y);
            fallbackLightning.lineStyle(4, 0x66ddff, 1);
            fallbackLightning.lineBetween(this.x, this.y - 200, this.x, this.y);
            fallbackLightning.setDepth(8);
            
            this.scene.time.delayedCall(300, () => {
                fallbackLightning.destroy();
            });
        }
    }

    public update(deltaTime: number): void {
        if (!this.active) return;
        
        this.elapsed += deltaTime;
        
        if (!this.hasStruck) {
            // Update warning indicator
            this.updateWarningGraphics();
            
            // Check if it's time to strike
            if (this.elapsed >= this.warningTime) {
                this.hasStruck = true;
                this.createLightningStrike();
            }
        } else {
            // Lightning has struck, wait a bit then destroy
            if (this.elapsed >= this.warningTime + 0.5) {
                this.destroy();
            }
        }
    }

    public destroy(): void {
        this.active = false;
        if (this.sprite && this.sprite.scene) {
            this.sprite.destroy();
        }
        if (this.lightningSprite && this.lightningSprite.scene) {
            this.lightningSprite.destroy();
        }
    }

    public isActive(): boolean {
        return this.active;
    }

    public hasStruckLightning(): boolean {
        return this.hasStruck;
    }

    public isPointInStrike(px: number, py: number): boolean {
        // Only deal damage if lightning has struck
        if (!this.hasStruck) return false;
        
        // Check if point is within the strike radius
        const dx = px - this.x;
        const dy = py - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= this.radius;
    }
    
    public getPosition(): { x: number; y: number } {
        return { x: this.x, y: this.y };
    }
}
