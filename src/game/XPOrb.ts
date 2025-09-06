import { Scene } from 'phaser';
import { EnhancedStyleHelpers } from '../ui/EnhancedDesignSystem';

export class XPOrb {
    public sprite: Phaser.GameObjects.Arc;
    public xpValue: number;
    public scene: Scene;
    private creationTime: number;
    private lifetime: number = 10000; // 10 seconds in milliseconds
    private isCollected: boolean = false;
    private pulseTimer: number = 0;
    private glowEffect: Phaser.GameObjects.Arc;

    constructor(scene: Scene, x: number, y: number, xpValue: number) {
        this.scene = scene;
        this.xpValue = xpValue;
        this.creationTime = Date.now();
        
        // Create the main orb sprite using Enhanced Design System colors
        this.sprite = scene.add.circle(x, y, 8, EnhancedStyleHelpers.xp.getOrbColor());
        this.sprite.setStrokeStyle(2, EnhancedStyleHelpers.xp.getOrbBorderColor());
        
        // Create a subtle glow effect
        this.glowEffect = scene.add.circle(x, y, 12, EnhancedStyleHelpers.xp.getOrbColor(), 0.3);
        this.glowEffect.setBlendMode(Phaser.BlendModes.ADD);
        
        // Set depth to ensure orbs appear above enemies but below UI
        this.sprite.setDepth(10);
        this.glowEffect.setDepth(9);
        
        // Store reference to this orb in the sprite data
        this.sprite.setData('xpOrb', this);
        
        // Add a subtle spawn animation
        this.sprite.setScale(0);
        this.glowEffect.setScale(0);
        
        scene.tweens.add({
            targets: [this.sprite, this.glowEffect],
            scaleX: 1,
            scaleY: 1,
            duration: 200,
            ease: 'Back.easeOut'
        });
    }

    /**
     * Updates the XP orb each frame
     * @param deltaTime - Time elapsed since last frame in seconds
     * @returns true if the orb should be removed (expired or collected)
     */
    public update(deltaTime: number): boolean {
        if (this.isCollected) {
            return true;
        }
        
        // Check if orb has expired
        const currentTime = Date.now();
        const age = currentTime - this.creationTime;
        
        if (age >= this.lifetime) {
            this.destroy();
            return true;
        }
        
        // Update visual effects
        this.updateVisualEffects(deltaTime, age);
        
        return false;
    }
    
    private updateVisualEffects(deltaTime: number, age: number): void {
        // Pulse animation
        this.pulseTimer += deltaTime;
        const pulseScale = 1 + Math.sin(this.pulseTimer * 3) * 0.1;
        this.sprite.setScale(pulseScale);
        this.glowEffect.setScale(pulseScale * 1.2);
        
        // Fade out effect as orb approaches expiration
        const fadeThreshold = this.lifetime * 0.7; // Start fading at 70% of lifetime
        if (age > fadeThreshold) {
            const fadeProgress = (age - fadeThreshold) / (this.lifetime - fadeThreshold);
            const alpha = 1 - (fadeProgress * 0.5); // Fade to 50% opacity
            this.sprite.setAlpha(alpha);
            this.glowEffect.setAlpha(alpha * 0.3);
        }
        
        // Blinking effect in the last 2 seconds
        if (age > this.lifetime - 2000) {
            const blinkSpeed = 8; // Blinks per second
            const shouldShow = Math.floor((age / 1000) * blinkSpeed) % 2 === 0;
            this.sprite.setVisible(shouldShow);
            this.glowEffect.setVisible(shouldShow);
        }
    }
    
    /**
     * Collects the XP orb with a collection animation
     * @param targetX - X position to animate towards (usually player position)
     * @param targetY - Y position to animate towards (usually player position)
     * @param onComplete - Callback function to execute when collection is complete
     */
    public collect(targetX: number, targetY: number, onComplete: () => void): void {
        if (this.isCollected) return;
        
        this.isCollected = true;
        
        // Create collection animation - orb flies towards player
        this.scene.tweens.add({
            targets: [this.sprite, this.glowEffect],
            x: targetX,
            y: targetY,
            scaleX: 0.3,
            scaleY: 0.3,
            alpha: 0,
            duration: 300,
            ease: 'Power2.easeIn',
            onComplete: () => {
                this.destroy();
                onComplete();
            }
        });
        
        // Add a brief flash effect at collection point using design system
        const flash = this.scene.add.circle(this.sprite.x, this.sprite.y, 15, 0xFFFFFF, 0.8);
        flash.setDepth(15);
        this.scene.tweens.add({
            targets: flash,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 200,
            ease: 'Power2.easeOut',
            onComplete: () => {
                flash.destroy();
            }
        });
    }
    
    /**
     * Gets the current position of the orb
     * @returns Object with x and y coordinates
     */
    public getPosition(): { x: number; y: number } {
        return {
            x: this.sprite.x,
            y: this.sprite.y
        };
    }
    
    /**
     * Checks if the orb is within collection range of a position
     * @param x - X coordinate to check
     * @param y - Y coordinate to check
     * @param range - Collection range in pixels
     * @returns true if within range
     */
    public isWithinRange(x: number, y: number, range: number): boolean {
        if (this.isCollected) return false;
        
        const dx = this.sprite.x - x;
        const dy = this.sprite.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance <= range;
    }
    
    /**
     * Destroys the orb and cleans up its sprites
     */
    public destroy(): void {
        if (this.sprite) {
            this.sprite.destroy();
        }
        if (this.glowEffect) {
            this.glowEffect.destroy();
        }
    }
    
    /**
     * Gets the XP value of this orb
     * @returns XP value
     */
    public getXPValue(): number {
        return this.xpValue;
    }
    
    /**
     * Checks if the orb has been collected
     * @returns true if collected
     */
    public isOrbCollected(): boolean {
        return this.isCollected;
    }
}