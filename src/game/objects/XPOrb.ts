import { Scene } from 'phaser';
import { XP_CONSTANTS } from '../constants/XPConstants';
import { EffectManager } from '../effects/EffectManager';

// The class now extends Sprite, making it a true GameObject
export class XPOrb extends Phaser.Physics.Arcade.Sprite {
    public xpValue: number = 0;
    private creationTime: number = 0;
    private lifetime: number = XP_CONSTANTS.ORB_LIFETIME;
    private isCollected: boolean = false;
    private pulseTimer: number = 0;
    
    // Magnet behavior properties
    private isMagnetized: boolean = false;
    private targetX: number = 0;
    private targetY: number = 0;
    private magnetSpeed: number = 0;
    private velocityX: number = 0;
    private velocityY: number = 0;
    
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
        // Reset and enable the body, show the sprite, and set active
        this.enableBody(true, x, y, true, true);
        
        this.xpValue = xpValue;
        this.creationTime = this.scene.time.now;
        this.isCollected = false;
        
        // Reset magnet state
        this.isMagnetized = false;
        this.magnetSpeed = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        
        // Play spawn animation
        this.setScale(0);
        EffectManager.createSpawnAnimation(this.scene, [this]);
    }
    
    preUpdate(time: number, delta: number): void {
        super.preUpdate(time, delta);
        
        if (!this.active) {
            return;
        }

        const age = time - this.creationTime;
        
        // Handle magnet movement
        if (this.isMagnetized && !this.isCollected) {
            this.updateMagnetMovement(delta);
        }

        if (age >= this.lifetime && !this.isMagnetized) {
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
    
    /**
     * Starts moving the orb towards the target (player)
     */
    public magnetize(targetX: number, targetY: number, speed: number): void {
        this.isMagnetized = true;
        this.targetX = targetX;
        this.targetY = targetY;
        this.magnetSpeed = speed;
    }

    private updateMagnetMovement(delta: number): void {
        // Accelerate towards target
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.targetX, this.targetY);
        
        // Simple acceleration
        this.magnetSpeed += (delta * 0.5); // Increase speed over time
        
        this.velocityX = Math.cos(angle) * this.magnetSpeed;
        this.velocityY = Math.sin(angle) * this.magnetSpeed;
        
        this.x += this.velocityX * (delta / 1000);
        this.y += this.velocityY * (delta / 1000);
        
        // Update body if it exists to keep physics sync (though we are manually moving x/y)
        if (this.body) {
            this.body.reset(this.x, this.y);
        }
    }

    public collect(onComplete: () => void): void {
        if (this.isCollected) return;
        this.isCollected = true;
        
        // Instant visual feedback instead of long tween
        EffectManager.createFlashEffect(this.scene, this.x, this.y);
        
        this.kill();
        onComplete();
    }

    /**
     * Deactivates the orb and returns it to the object pool.
     */
    public kill(): void {
        // Disable the body (removes debug box), hide sprite, and deactivate
        this.disableBody(true, true);
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