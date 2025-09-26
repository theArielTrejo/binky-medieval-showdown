import { Scene } from 'phaser';
import { EnhancedStyleHelpers } from '../ui/EnhancedDesignSystem';
import { XP_CONSTANTS } from './constants/XPConstants';
import { calculateDistance } from './utils/MathUtils';
import { EffectManager } from './effects/EffectManager';

export class XPOrb {
    public sprite: Phaser.GameObjects.Arc;
    public xpValue: number;
    public scene: Scene;
    private creationTime: number;
    private lifetime: number = XP_CONSTANTS.ORB_LIFETIME;
    private isCollected: boolean = false;
    private pulseTimer: number = 0;
    private glowEffect: Phaser.GameObjects.Arc;

    constructor(scene: Scene, x: number, y: number, xpValue: number) {
        this.scene = scene;
        this.xpValue = xpValue;
        this.creationTime = Date.now();
        
        // Create the main orb sprite using Enhanced Design System colors
        this.sprite = scene.add.circle(x, y, XP_CONSTANTS.ORB_RADIUS, EnhancedStyleHelpers.xp.getOrbColor());
        this.sprite.setStrokeStyle(XP_CONSTANTS.ORB_STROKE_WIDTH, EnhancedStyleHelpers.xp.getOrbBorderColor());
        
        // Create a subtle glow effect
        this.glowEffect = scene.add.circle(x, y, XP_CONSTANTS.GLOW_RADIUS, EnhancedStyleHelpers.xp.getOrbColor(), XP_CONSTANTS.GLOW_ALPHA);
        this.glowEffect.setBlendMode(Phaser.BlendModes.ADD);
        
        // Set depth to ensure orbs appear above enemies but below UI
        this.sprite.setDepth(XP_CONSTANTS.DEPTH.ORB);
        this.glowEffect.setDepth(XP_CONSTANTS.DEPTH.GLOW_EFFECT);
        
        // Store reference to this orb in the sprite data
        this.sprite.setData('xpOrb', this);
        
        // Add a subtle spawn animation
        this.sprite.setScale(0);
        this.glowEffect.setScale(0);
        
        EffectManager.createSpawnAnimation(scene, [this.sprite, this.glowEffect]);
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
        EffectManager.updatePulseAnimation(this.sprite, this.glowEffect, this.pulseTimer);
        
        // Fade out effect as orb approaches expiration
        EffectManager.updateFadeEffect(this.sprite, this.glowEffect, age, this.lifetime);
        
        // Blinking effect in the last moments
        EffectManager.updateBlinkEffect(this.sprite, this.glowEffect, age, this.lifetime);
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
        EffectManager.createCollectionAnimation(
            this.scene,
            [this.sprite, this.glowEffect],
            targetX,
            targetY,
            () => {
                this.destroy();
                onComplete();
            }
        );
        
        // Add a brief flash effect at collection point
        EffectManager.createFlashEffect(this.scene, this.sprite.x, this.sprite.y);
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
        
        const distance = calculateDistance(this.sprite.x, this.sprite.y, x, y);
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