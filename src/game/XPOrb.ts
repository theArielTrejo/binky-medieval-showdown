import { Scene } from 'phaser';
// REMOVED: Unused import
// import { EnhancedStyleHelpers } from '../ui/EnhancedDesignSystem';
import { XP_CONSTANTS } from './constants/XPConstants';
// REMOVED: Unused import
// import { calculateDistance } from './utils/MathUtils';
import { EffectManager } from './effects/EffectManager';

export class XPOrb {
    public sprite: Phaser.Physics.Arcade.Sprite; 
    public xpValue: number;
    public scene: Scene;
    private creationTime: number;
    private lifetime: number = XP_CONSTANTS.ORB_LIFETIME;
    private isCollected: boolean = false;
    private pulseTimer: number = 0;
    
    constructor(scene: Scene, x: number, y: number, xpValue: number) {
        this.scene = scene;
        this.xpValue = xpValue;
        this.creationTime = Date.now();
        
        this.sprite = scene.physics.add.sprite(x, y, 'green_orb');
        
        const glowColor = 0x00ff00; 
        const glow = this.sprite.postFX.addGlow(glowColor, 1, 0, false, 0.1, 10);
        
        this.sprite.setData('glowEffect', glow);
        this.sprite.setDepth(XP_CONSTANTS.DEPTH.ORB);
        this.sprite.setData('xpOrb', this);
        
        this.sprite.setScale(0);
        EffectManager.createSpawnAnimation(scene, [this.sprite]);
    }

    public update(deltaTime: number): boolean {
        if (this.isCollected) {
            return true;
        }
        
        const age = Date.now() - this.creationTime;
        
        if (age >= this.lifetime) {
            this.destroy();
            return true;
        }
        
        this.updateVisualEffects(deltaTime, age);
        
        return false;
    }
    
    private updateVisualEffects(deltaTime: number, age: number): void {
        this.pulseTimer += deltaTime;
        EffectManager.updatePulseAnimation(this.sprite, this.pulseTimer);
        EffectManager.updateFadeEffect(this.sprite, age, this.lifetime);
        EffectManager.updateBlinkEffect(this.sprite, age, this.lifetime);
    }
    
    public collect(targetX: number, targetY: number, onComplete: () => void): void {
        if (this.isCollected) return;
        
        this.isCollected = true;
        
        EffectManager.createCollectionAnimation(
            this.scene,
            [this.sprite],
            targetX,
            targetY,
            () => {
                this.destroy();
                onComplete();
            }
        );
        
        EffectManager.createFlashEffect(this.scene, this.sprite.x, this.sprite.y);
    }
    
    public getPosition(): { x: number; y: number } {
        return {
            x: this.sprite.x,
            y: this.sprite.y
        };
    }
    
    public isWithinRange(x: number, y: number, range: number): boolean {
        if (this.isCollected) return false;
        
        const distance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, x, y);
        return distance <= range;
    }
    
    public destroy(): void {
        if (this.sprite) {
            this.sprite.destroy();
        }
    }
    
    public getXPValue(): number {
        return this.xpValue;
    }
    
    public isOrbCollected(): boolean {
        return this.isCollected;
    }
}