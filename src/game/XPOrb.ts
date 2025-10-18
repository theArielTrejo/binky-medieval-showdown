import { Scene } from 'phaser';
import { XP_CONSTANTS } from './constants/XPConstants';
import { EffectManager } from './effects/EffectManager';

// The class now extends Sprite, making it a true GameObject
export class XPOrb extends Phaser.Physics.Arcade.Sprite {
    public xpValue: number = 0;
    private creationTime: number = 0;
    private lifetime: number = XP_CONSTANTS.ORB_LIFETIME;
    private isCollected: boolean = false;
    private pulseTimer: number = 0;
    
    constructor(scene: Scene, x: number, y: number) {
        // Call the parent constructor (Sprite)
        super(scene, x, y, 'green_orb');
        
        // Add this object to the scene's display list and physics world
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Add the Glow FX directly to this sprite
        const glow = this.postFX.addGlow(0x00ff00, 1, 0, false, 0.1, 10);
        this.setData('glowEffect', glow);
        this.setDepth(XP_CONSTANTS.DEPTH.ORB);
    }

    /**
     * This method is used by the object pool to activate and initialize a recycled orb.
     */
    public launch(x: number, y: number, xpValue: number): void {
        if (this.body) {
            this.body.reset(x, y);
        }
        this.setActive(true);
        this.setVisible(true);
        
        this.xpValue = xpValue;
        this.creationTime = this.scene.time.now;
        this.isCollected = false;
        
        // Play spawn animation
        this.setScale(0);
        EffectManager.createSpawnAnimation(this.scene, [this]);
    }
    
    // Renamed from 'update' to 'preUpdate' to be automatically called by the Group
    preUpdate(time: number, delta: number): void {
        super.preUpdate(time, delta);
        
        if (!this.active) {
            return;
        }

        const age = time - this.creationTime;
        
        if (age >= this.lifetime) {
            this.kill(); // Deactivate instead of destroying
            return;
        }
        
        // The deltaTime passed to preUpdate is in ms, EffectManager expects seconds
        this.updateVisualEffects(delta / 1000, age);
    }
    
    private updateVisualEffects(deltaTime: number, age: number): void {
        this.pulseTimer += deltaTime;
        EffectManager.updatePulseAnimation(this, this.pulseTimer);
        EffectManager.updateFadeEffect(this, age, this.lifetime);
        EffectManager.updateBlinkEffect(this, age, this.lifetime);
    }
    
    public collect(targetX: number, targetY: number, onComplete: () => void): void {
        if (this.isCollected) return;
        this.isCollected = true;
        
        EffectManager.createCollectionAnimation(this.scene, [this], targetX, targetY, () => {
            this.kill(); // Deactivate when collection is complete
            onComplete();
        });
        
        EffectManager.createFlashEffect(this.scene, this.x, this.y);
    }

    /**
     * Deactivates the orb and returns it to the object pool.
     */
    public kill(): void {
        this.setActive(false);
        this.setVisible(false);
        // It's good practice to disable the body as well
        if (this.body) {
            this.body.enable = false;
        }
    }

    public isWithinRange(x: number, y: number, range: number): boolean {
        if (!this.active || this.isCollected) return false;
        return Phaser.Math.Distance.Between(this.x, this.y, x, y) <= range;
    }

    public getXPValue(): number {
        return this.xpValue;
    }
    
    public isOrbCollected(): boolean {
        return this.isCollected;
    }
}