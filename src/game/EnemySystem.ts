import { Scene } from 'phaser';
import { AnimationMapper, MobAnimationSet } from './config/AnimationMappings';
import { validateNoRandomSelection, getHardcodedMobSkin } from '../systems/HardcodedMobSkins.js';
import { EnemyType } from './types/EnemyTypes';

// Re-export EnemyType for backward compatibility
export { EnemyType };

/**
 * Enemy projectile class for ranged attacks
 */
export class Projectile {
    public sprite: Phaser.GameObjects.Graphics;
    public velocityX: number;
    public velocityY: number;
    public damage: number;
    public scene: Scene;
    private active: boolean = true;

    constructor(scene: Scene, x: number, y: number, targetX: number, targetY: number, damage: number, speed: number = 200) {
        this.scene = scene;
        this.damage = damage;
        
        // Create a red circle for the projectile
        this.sprite = scene.add.graphics();
        this.sprite.fillStyle(0xff0000, 1); // Red color
        this.sprite.fillCircle(0, 0, 8); // 8px radius circle
        this.sprite.setPosition(x, y);
        this.sprite.setDepth(10); // Above most game objects
        
        // Calculate direction to target
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Normalize and apply speed
        this.velocityX = (dx / distance) * speed;
        this.velocityY = (dy / distance) * speed;
    }

    public update(deltaTime: number): void {
        if (!this.active) return;
        
        // Move projectile
        this.sprite.x += this.velocityX * deltaTime;
        this.sprite.y += this.velocityY * deltaTime;
        
        // Check if out of bounds (assuming game bounds of 0-1024 x 0-768)
        if (this.sprite.x < -50 || this.sprite.x > 1074 || 
            this.sprite.y < -50 || this.sprite.y > 818) {
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

    public getPosition(): { x: number; y: number } {
        return { x: this.sprite.x, y: this.sprite.y };
    }
}

/**
 * Shield class for blocking projectiles
 */
export class Shield {
    public sprite: Phaser.GameObjects.Graphics;
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

    constructor(scene: Scene, enemyX: number, enemyY: number, playerX: number, playerY: number, enemyRadius: number, width: number = 60, height: number = 120) {
        this.scene = scene;
        this.width = width; // Narrow (front-to-back depth)
        this.height = height; // Tall (side-to-side width when rotated)
        this.ownerRadius = enemyRadius;
        
        // Calculate angle towards player
        const dx = playerX - enemyX;
        const dy = playerY - enemyY;
        this.angle = Math.atan2(dy, dx);
        
        // Position shield closer to the Viking - just touching the edge
        const shieldDistance = enemyRadius + (width / 4); // Reduced from width/2 to width/4
        this.x = enemyX + Math.cos(this.angle) * shieldDistance;
        this.y = enemyY + Math.sin(this.angle) * shieldDistance;
        
        console.log(`Shield created - Enemy radius: ${enemyRadius.toFixed(1)}, Shield distance from center: ${shieldDistance.toFixed(1)}, Position: (${this.x.toFixed(0)}, ${this.y.toFixed(0)})`);
        
        // Create a blue shield graphic (narrow front-to-back, tall side-to-side)
        this.sprite = scene.add.graphics();
        this.sprite.lineStyle(5, 0x4444ff, 1); // Thicker blue border
        this.sprite.fillStyle(0x6666ff, 0.6); // Blue semi-transparent fill
        this.sprite.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
        this.sprite.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
        this.sprite.setPosition(this.x, this.y);
        this.sprite.setRotation(this.angle);
        this.sprite.setDepth(6);
    }

    public update(deltaTime: number, enemyX: number, enemyY: number): void {
        if (!this.active) return;
        
        this.elapsed += deltaTime;
        
        // Update position to follow enemy - keep shield close to Viking
        const shieldDistance = this.ownerRadius + (this.width / 4);
        this.x = enemyX + Math.cos(this.angle) * shieldDistance;
        this.y = enemyY + Math.sin(this.angle) * shieldDistance;
        this.sprite.setPosition(this.x, this.y);
        
        // Pulse effect - shield gets brighter as it's about to expire
        const remainingPercent = 1 - (this.elapsed / this.lifetime);
        const alpha = 0.3 + (Math.sin(this.elapsed * 5) * 0.2 * (1 - remainingPercent));
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
     * Uses a hybrid approach: check if projectile is in front of the shield AND within range
     */
    public blocksProjectile(projectileX: number, projectileY: number): boolean {
        if (!this.active) return false;
        
        const dx = projectileX - this.x;
        const dy = projectileY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // First check: Is the projectile close enough to the shield?
        // Use the shield's height (side-to-side width) as the blocking radius
        const blockingRadius = this.height / 2 + 35; // Height is the wide dimension
        
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
        
        // Block if projectile is within 100 degrees in front (±50 degrees from center)
        const blockingAngle = Math.PI * 0.55; // ~100 degrees total (50 each side)
        const blocked = Math.abs(angleDiff) <= blockingAngle;
        
        if (blocked) {
            console.log(`Shield blocked! Distance: ${distance.toFixed(1)}/${blockingRadius.toFixed(1)}, Angle diff: ${(angleDiff * 180 / Math.PI).toFixed(1)}°`);
        } else if (distance < blockingRadius) {
            console.log(`Shield MISS! Distance OK but angle too wide: ${(angleDiff * 180 / Math.PI).toFixed(1)}° (limit: ±${(blockingAngle * 180 / Math.PI).toFixed(1)}°)`);
        }
        
        return blocked;
    }
}

/**
 * Cone attack for sweeping melee strikes
 */
export class ConeAttack {
    public sprite: Phaser.GameObjects.Graphics;
    public damage: number;
    public scene: Scene;
    private active: boolean = true;
    private lifetime: number = 0.25; // Attack lasts 0.25 seconds
    private elapsed: number = 0;
    public x: number;
    public y: number;
    public radius: number;
    public angle: number; // Center angle of the cone
    public coneAngle: number; // Total cone spread in radians

    constructor(scene: Scene, enemyX: number, enemyY: number, playerX: number, playerY: number, damage: number, enemyRadius: number, radius: number = 150, coneAngle: number = Math.PI / 1.8) {
        this.scene = scene;
        this.damage = damage;
        this.x = enemyX;
        this.y = enemyY;
        this.radius = radius; // Cone extends this far from enemy center
        this.coneAngle = coneAngle; // ~100 degrees spread (wider cone)
        
        // Calculate angle towards player
        const dx = playerX - enemyX;
        const dy = playerY - enemyY;
        this.angle = Math.atan2(dy, dx);
        
        // Create a cone-shaped attack
        this.sprite = scene.add.graphics();
        this.sprite.fillStyle(0xff6600, 0.7); // Orange
        
        // Draw cone as a pie slice starting from enemy's edge (invisible circle)
        // The cone originates at the sprite's visual edge
        const startAngle = -this.coneAngle / 2;
        const endAngle = this.coneAngle / 2;
        
        this.sprite.beginPath();
        this.sprite.moveTo(enemyRadius, 0); // Start exactly at the invisible circle's edge
        this.sprite.arc(0, 0, this.radius, startAngle, endAngle, false);
        this.sprite.lineTo(enemyRadius, 0);
        this.sprite.closePath();
        this.sprite.fillPath();
        
        this.sprite.setPosition(this.x, this.y);
        this.sprite.setRotation(this.angle);
        this.sprite.setDepth(5);
        
        // Add yellow dot at center for debug
        this.sprite.fillStyle(0xffff00, 1);
        this.sprite.fillCircle(0, 0, 3);
        
        console.log(`Cone attack created - Enemy radius: ${enemyRadius.toFixed(1)}, Cone extends to: ${this.radius.toFixed(1)}, Angle: ${(this.angle * 180 / Math.PI).toFixed(0)}°`);
    }

    public update(deltaTime: number): void {
        if (!this.active) return;
        
        this.elapsed += deltaTime;
        
        // Fade out over lifetime
        const alpha = (1 - (this.elapsed / this.lifetime)) * 0.7;
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

    public isPointInCone(px: number, py: number): boolean {
        // Check if a point is within the cone
        const dx = px - this.x;
        const dy = py - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check distance
        if (distance > this.radius) return false;
        
        // Check angle
        const pointAngle = Math.atan2(dy, dx);
        let angleDiff = pointAngle - this.angle;
        
        // Normalize angle difference to -PI to PI
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        return Math.abs(angleDiff) <= this.coneAngle / 2;
    }
}

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

/**
 * Vortex attack for Skeleton Pirate - a traveling, expanding trap
 */
export class VortexAttack {
    public sprite: Phaser.GameObjects.Graphics;
    public damage: number;
    public scene: Scene;
    private active: boolean = true;
    private travelTime: number = 1.0; // Time to reach max distance (1 second)
    private totalLifetime: number = 4.0; // Total: 1s travel + 3s stationary
    private elapsed: number = 0;
    public x: number;
    public y: number;
    private startX: number;
    private startY: number;
    private targetX: number;
    private targetY: number;
    private maxDistance: number = 350; // How far the vortex travels
    private startRadius: number = 25; // Starting radius
    private maxRadius: number = 100; // Maximum radius when fully expanded
    public currentRadius: number;
    private velocityX: number;
    private velocityY: number;
    private isTraveling: boolean = true; // Whether vortex is still moving
    private frozenExpansionProgress: number | null = null; // Stores size when stopped early
    public slowEffect: number = 0.5; // Slow multiplier (0.5 = 50% speed)
    public slowDuration: number = 2000; // How long the slow lasts on player in ms (2 seconds)
    
    constructor(scene: Scene, enemyX: number, enemyY: number, playerX: number, playerY: number, damage: number, _enemyRadius: number = 40) {
        this.scene = scene;
        this.damage = damage;
        this.startX = enemyX;
        this.startY = enemyY;
        this.x = enemyX;
        this.y = enemyY;
        this.currentRadius = this.startRadius;
        
        // Calculate direction towards player
        const dx = playerX - enemyX;
        const dy = playerY - enemyY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate target position
        this.targetX = enemyX + (dx / distance) * this.maxDistance;
        this.targetY = enemyY + (dy / distance) * this.maxDistance;
        
        // Calculate velocity for smooth travel
        this.velocityX = (this.targetX - this.startX) / this.travelTime;
        this.velocityY = (this.targetY - this.startY) / this.travelTime;
        
        // Create visual effect - cyan/blue vortex with swirl pattern
        this.sprite = scene.add.graphics();
        this.updateVortexGraphics();
        this.sprite.setDepth(4); // Below shields but above ground
        
        console.log(`Vortex created at (${enemyX.toFixed(0)}, ${enemyY.toFixed(0)}), targeting (${this.targetX.toFixed(0)}, ${this.targetY.toFixed(0)})`);
    }

    private updateVortexGraphics(): void {
        this.sprite.clear();
        
        // Calculate expansion progress
        let expansionProgress: number;
        if (this.frozenExpansionProgress !== null) {
            // Use frozen size when stopped early
            expansionProgress = this.frozenExpansionProgress;
        } else if (this.isTraveling) {
            // Expand while traveling
            expansionProgress = Math.min(1, this.elapsed / this.travelTime);
        } else {
            // Stay at max size while stationary (reached destination normally)
            expansionProgress = 1;
        }
        
        this.currentRadius = this.startRadius + (this.maxRadius - this.startRadius) * expansionProgress;
        
        // Calculate pulsing alpha for visual effect
        const pulseSpeed = 3;
        const pulseAlpha = 0.3 + Math.sin(this.elapsed * pulseSpeed) * 0.15;
        
        // Draw outer vortex circle (cyan/turquoise)
        this.sprite.fillStyle(0x00cccc, pulseAlpha);
        this.sprite.fillCircle(0, 0, this.currentRadius);
        
        // Draw inner darker circle for depth
        this.sprite.fillStyle(0x0088aa, pulseAlpha * 1.3);
        this.sprite.fillCircle(0, 0, this.currentRadius * 0.7);
        
        // Draw swirl lines for vortex effect
        this.sprite.lineStyle(2, 0x00ffff, pulseAlpha * 1.5);
        const spiralCount = 3;
        for (let i = 0; i < spiralCount; i++) {
            const spiralAngle = (this.elapsed * 2 + (i * Math.PI * 2 / spiralCount)) % (Math.PI * 2);
            const spiralRadius = this.currentRadius * 0.8;
            
            this.sprite.beginPath();
            this.sprite.arc(0, 0, spiralRadius * 0.5, spiralAngle, spiralAngle + Math.PI * 0.5, false);
            this.sprite.strokePath();
        }
        
        // Draw center dot
        this.sprite.fillStyle(0xffffff, pulseAlpha * 2);
        this.sprite.fillCircle(0, 0, 3);
        
        this.sprite.setPosition(this.x, this.y);
    }

    public update(deltaTime: number): void {
        if (!this.active) return;
        
        this.elapsed += deltaTime;
        
        // Travel phase
        if (this.isTraveling && this.elapsed < this.travelTime) {
            // Move vortex
            this.x += this.velocityX * deltaTime;
            this.y += this.velocityY * deltaTime;
        } else if (this.isTraveling) {
            // Transition to stationary phase
            this.isTraveling = false;
            this.x = this.targetX;
            this.y = this.targetY;
        }
        
        // Update visual
        this.updateVortexGraphics();
        
        // Fade out in the last 0.5 seconds
        if (this.elapsed > this.totalLifetime - 0.5) {
            const fadeProgress = (this.totalLifetime - this.elapsed) / 0.5;
            this.sprite.setAlpha(fadeProgress);
        }
        
        // Destroy after total lifetime
        if (this.elapsed >= this.totalLifetime) {
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

    public isPointInVortex(px: number, py: number): boolean {
        // Check if a point is within the vortex circle
        const dx = px - this.x;
        const dy = py - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= this.currentRadius;
    }
    
    public getPosition(): { x: number; y: number } {
        return { x: this.x, y: this.y };
    }
    
    public isTravelingToTarget(): boolean {
        return this.isTraveling;
    }
    
    public stopAtCurrentPosition(): void {
        // Stop the vortex at its current position when it hits the player
        if (this.isTraveling) {
            // Calculate and freeze the current expansion progress
            this.frozenExpansionProgress = Math.min(1, this.elapsed / this.travelTime);
            this.isTraveling = false;
            this.targetX = this.x;
            this.targetY = this.y;
            console.log(`Vortex stopped early at (${this.x.toFixed(0)}, ${this.y.toFixed(0)}) with ${(this.frozenExpansionProgress * 100).toFixed(0)}% size`);
        }
    }
}

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

/**
 * Melee attack hitbox class for close-range enemies
 */
export class MeleeAttack {
    public sprite: Phaser.GameObjects.Graphics;
    public damage: number;
    public scene: Scene;
    private active: boolean = true;
    private lifetime: number = 0.3; // Attack lasts 0.3 seconds
    private elapsed: number = 0;
    public x: number;
    public y: number;
    public width: number;
    public height: number;
    private angle: number; // Store rotation angle in radians
    private corners: { x: number; y: number }[]; // Rotated corner positions

    constructor(scene: Scene, enemyX: number, enemyY: number, playerX: number, playerY: number, damage: number, enemyRadius: number = 40, width: number = 100, height: number = 60) {
        this.scene = scene;
        this.damage = damage;
        this.width = width;
        this.height = height;
        
        // Calculate angle towards player
        const dx = playerX - enemyX;
        const dy = playerY - enemyY;
        this.angle = Math.atan2(dy, dx);
        
        // Position the attack hitbox outside the invisible circle (sprite's edge)
        // The attack starts at the edge of the sprite + half the attack width
        const attackDistance = enemyRadius + (width / 2);
        this.x = enemyX + Math.cos(this.angle) * attackDistance;
        this.y = enemyY + Math.sin(this.angle) * attackDistance;
        
        console.log(`Melee attack created - Enemy radius: ${enemyRadius.toFixed(1)}, Attack distance from center: ${attackDistance.toFixed(1)}, Position: (${this.x.toFixed(0)}, ${this.y.toFixed(0)})`);
        
        // Calculate rotated corners for collision detection
        this.updateCorners();
        
        // Create a orange/yellow rectangle for the melee attack
        this.sprite = scene.add.graphics();
        this.sprite.fillStyle(0xff0000, 1); // Red color
        this.sprite.fillRect(-width / 2, -height / 2, width, height);
        this.sprite.setPosition(this.x, this.y);
        this.sprite.setRotation(this.angle); // Rotate to face player
        this.sprite.setDepth(5); // Below projectiles but above ground
        
        // Add a small circle at the attack origin for debugging
        this.sprite.fillStyle(0xffff00, 1); // Yellow
        this.sprite.fillCircle(0, 0, 5); // Small yellow dot at attack center
    }

    private updateCorners(): void {
        // Calculate the four corners of the rotated rectangle
        const halfW = this.width / 2;
        const halfH = this.height / 2;
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        
        this.corners = [
            { // Top-left
                x: this.x + (-halfW * cos - -halfH * sin),
                y: this.y + (-halfW * sin + -halfH * cos)
            },
            { // Top-right
                x: this.x + (halfW * cos - -halfH * sin),
                y: this.y + (halfW * sin + -halfH * cos)
            },
            { // Bottom-right
                x: this.x + (halfW * cos - halfH * sin),
                y: this.y + (halfW * sin + halfH * cos)
            },
            { // Bottom-left
                x: this.x + (-halfW * cos - halfH * sin),
                y: this.y + (-halfW * sin + halfH * cos)
            }
        ];
    }

    public update(deltaTime: number): void {
        if (!this.active) return;
        
        this.elapsed += deltaTime;
        
        // Fade out over lifetime
        const alpha = 1 - (this.elapsed / this.lifetime);
        this.sprite.setAlpha(alpha * 0.6); // Max alpha is 0.6
        
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
        // Return axis-aligned bounding box for simple collision
        // This is a simplified version - for more accuracy, use the corners
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }

    public getCorners(): { x: number; y: number }[] {
        return this.corners;
    }
}

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
        // Return axis-aligned bounding box for collision detection
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

/**
 * Interface for enemy attack results
 */
export interface EnemyAttackResult {
    type: 'projectile' | 'melee' | 'cone' | 'explosion' | 'vortex' | 'shield' | 'lightning' | 'claw';
    damage: number;
    position: { x: number; y: number };
    hitPlayer: boolean;
    specialEffects?: {
        slowEffect?: number;
        slowDuration?: number;
        knockback?: { x: number; y: number };
        blocked?: boolean;
    };
    attackObject?: Projectile | MeleeAttack | ConeAttack | ExplosionAttack | VortexAttack | Shield | LightningStrikeAttack | ClawAttack;
}

// EnemyType enum moved to ./types/EnemyTypes.ts to avoid circular imports

// Old mapping structures removed - now using standardized system from AnimationMappings.ts

export interface EnemyStats {
    health: number;
    speed: number;
    damage: number;
    size: number;
    xpValue: number;
    cost: number;           // Dynamic cost for AI resource management
    threatLevel: number;    // Overall combat effectiveness rating
    specialAbilities: string[]; // List of special abilities
}

export class Enemy {
    public sprite: Phaser.GameObjects.Sprite;
    public type: EnemyType;
    public stats: EnemyStats;
    public currentHealth: number;
    public scene: Scene;
    private currentAnimation: string = '';
    private mobVariant: string;
    private mobAnimations: MobAnimationSet;
    private shootCooldown: number = 0;
    private shootInterval: number = 2.0; // Shoot every 2 seconds for ranged enemies
    private attackRange: number = 300; // Range for ranged attacks
    private meleeAttackCooldown: number = 0;
    private meleeAttackInterval: number = 0.8; // Melee attack every 0.8 seconds (fast for Gnoll)
    private isAttacking: boolean = false; // Track if currently performing attack
    private attackDuration: number = 0.3; // Duration enemy is locked during attack
    private attackTimer: number = 0; // Timer for attack animation lock
    private shieldCooldown: number = 0;
    private shieldInterval: number = 8.0; // Shield every 8 seconds
    private coneAttackCooldown: number = 0;
    private coneAttackInterval: number = 2.0; // Cone attack every 2 seconds
    private activeShield: Shield | null = null; // Track active shield
    private vortexAttackCooldown: number = 0;
    private vortexAttackInterval: number = 4.0; // Vortex attack every 4 seconds
    private isExploding: boolean = false; // Track if elemental spirit is in death/explosion sequence
    private deathAnimationDuration: number = 0.75; // Duration of death animation (15 frames at ~20fps)
    private deathTimer: number = 0; // Timer for death animation
    private lastAttackTime: number = 0;
    private attackCooldown: number = 1000;
    private facingLeft: boolean = false; // Track current facing direction

    constructor(scene: Scene, x: number, y: number, type: EnemyType) {
        try {
            console.log(`🎯 Creating enemy of type: ${type} at (${x}, ${y})`);
            
            this.scene = scene;
            this.type = type;
            this.stats = this.getStatsForType(type);
            this.currentHealth = this.stats.health;
            
            // Use hardcoded mob variant selection - NO RANDOMIZATION
            this.mobVariant = AnimationMapper.getHardcodedMobForEnemyType(type);
            console.log(`✅ Got mob variant: ${this.mobVariant}`);
            
            // VALIDATION: Ensure no random selection occurred
            const expectedSkin = getHardcodedMobSkin(type);
            validateNoRandomSelection(this.mobVariant, expectedSkin, type);
            
            this.mobAnimations = this.createMobAnimations(this.mobVariant);
            console.log(`✅ Got animations:`, this.mobAnimations);
            
            // Create physics sprite using the mob texture atlas key
            const textureKey = this.mobAnimations.texture;
            console.log(`✅ Creating sprite with texture: ${textureKey}`);
            
            // Check if texture exists
            if (!scene.textures.exists(textureKey)) {
                throw new Error(`Texture '${textureKey}' does not exist! Available textures: ${scene.textures.getTextureKeys().filter(k => k.startsWith('mob-')).join(', ')}`);
            }
            
            this.sprite = scene.physics.add.sprite(x, y, textureKey) as Phaser.GameObjects.Sprite;
            this.sprite.setScale(this.getScaleForType(type));
            this.sprite.setData('enemy', this);
            this.sprite.setDepth(3); // Make sure sprites are visible
            this.sprite.setOrigin(0.5, 0.5); // Ensure centered origin
            this.sprite.setAngle(0); // Ensure no rotation
            this.sprite.setRotation(0); // Explicitly set rotation to 0
            
            // Enable crisp pixel rendering for better sprite quality
            this.sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
            
            // Enable collision with world bounds (same as player)
            const body = this.sprite.body as Phaser.Physics.Arcade.Body;
            if (body) {
                body.setCollideWorldBounds(true);
            }
            
            const enemyId = Math.floor(Math.random() * 10000);
            this.sprite.setData('enemyId', enemyId);
            console.log(`✅ Created enemy #${enemyId} - Type: ${type}, Sprite: ${textureKey}`);
            
            // Set attack range based on enemy type
            // All ranges now use the dynamic sprite radius from getApproximateRadius()
            if (type === EnemyType.ARCHER) {
                this.attackRange = 350; // Ranged attack
            } else if (type === EnemyType.GOLEM) {
                // Golem melee attack range: stop when the attack hitbox would reach the player
                // Attack extends from sprite edge (radius) + attack width (100)
                const spriteRadius = this.getApproximateRadius();
                this.attackRange = spriteRadius + 100 + 20; // radius + attack width + small buffer
            } else if (type === EnemyType.SKELETON_VIKING) {
                this.attackRange = 100; // Close range for cone attack
            } else if (type === EnemyType.SKELETON_PIRATE) {
                this.attackRange = 320; // Vortex range (reduced to fit in camera view)
            } else if (type === EnemyType.ELEMENTAL_SPIRIT) {
                this.attackRange = 30; // Explosion trigger range (adjusted for size 30)
            } else if (type === EnemyType.LIGHTNING_MAGE) {
                this.attackRange = 320; // Lightning strike range (reduced to fit in camera view)
            } else {
                this.attackRange = 30; // Close melee range for Gnoll claw attacks
            }
            
            // Initialize facing direction based on sprite's default state
            this.facingLeft = this.sprite.flipX;
            
            // Start with idle animation using the mob-specific animation key
            console.log(`✅ Playing idle animation: ${this.mobAnimations.idle}`);
            this.playAnimation(this.mobAnimations.idle);
            console.log(`✅ Enemy construction complete!`);
            
        } catch (error) {
            console.error(`❌ ENEMY CONSTRUCTION FAILED for type ${type}:`, error);
            throw error;
        }
    }

    private getStatsForType(type: EnemyType): EnemyStats {
        let baseStats: Omit<EnemyStats, 'cost' | 'threatLevel' | 'specialAbilities'>;
        let specialAbilities: string[];
        
        switch (type) {
            case EnemyType.SKELETON_VIKING:
                baseStats = {
                    health: 120,
                    speed: 45,
                    damage: 30,
                    size: 35,
                    xpValue: 18
                };
                specialAbilities = ['shield', 'cone_attack'];
                break;
            case EnemyType.GOLEM:
                baseStats = {
                    health: 150,
                    speed: 30,
                    damage: 20,
                    size: 50,
                    xpValue: 25
                };
                specialAbilities = ['melee_attack', 'high_damage'];
                break;
            case EnemyType.ARCHER:
                baseStats = {
                    health: 40,
                    speed: 50,
                    damage: 10,
                    size: 30,
                    xpValue: 12
                };
                specialAbilities = ['ranged_attack', 'kiting'];
                break;
            case EnemyType.GNOLL:
                baseStats = {
                    health: 50,
                    speed: 80,
                    damage: 6,
                    size: 25,
                    xpValue: 10
                };
                specialAbilities = ['fast_movement'];
                break;
            case EnemyType.SKELETON_PIRATE:
                baseStats = {
                    health: 60,
                    speed: 50,
                    damage: 5, // Light damage from vortex
                    size: 35,
                    xpValue: 18
                };
                specialAbilities = ['vortex_attack', 'slow_debuff', 'area_control'];
                break;
            case EnemyType.ELEMENTAL_SPIRIT:
                baseStats = {
                    health: 30, // Low health - designed to explode
                    speed: 110, // Very high mobility to rush player
                    damage: 25, // High explosion damage
                    size: 30,
                    xpValue: 20
                };
                specialAbilities = ['explosive_death', 'high_mobility', 'suicide_attack'];
                break;
            case EnemyType.LIGHTNING_MAGE:
                baseStats = {
                    health: 70, // Medium health - ranged caster
                    speed: 40, // Slow movement - prefers to keep distance
                    damage: 35, // High AOE damage
                    size: 35,
                    xpValue: 22
                };
                specialAbilities = ['lightning_strike', 'aoe_damage', 'ranged_caster', 'immobilize_during_cast'];
                break;
        }
        
        // Calculate dynamic cost and threat level using static methods
        const cost = EnemySystem.calculateEnemyCost(baseStats, specialAbilities);
        const threatLevel = EnemySystem.calculateThreatLevel(baseStats, specialAbilities);
        
        return {
            ...baseStats,
            cost,
            threatLevel,
            specialAbilities
        };
    }



    private getScaleForType(type: EnemyType): number {
        // All enemies scaled to match player size (0.05)
        switch (type) {
            case EnemyType.SKELETON_VIKING:
                return 0.05;
            case EnemyType.GOLEM:
                return 0.05;
            case EnemyType.ARCHER:
                return 0.05;
            case EnemyType.GNOLL:
                return 0.05;
            case EnemyType.SKELETON_PIRATE:
                return 0.05;
            case EnemyType.ELEMENTAL_SPIRIT:
                return 0.05;
            default:
                return 0.05;
        }
    }

    private getApproximateRadius(): number {
        // Calculate approximate radius based on actual sprite bounds
        // Scale down by 60% to get closer to the visual sprite edge (not the empty space)
        const bounds = this.sprite.getBounds();
        // Use the larger dimension (width or height) to get the radius
        const radius = Math.max(bounds.width, bounds.height) / 2;
        return radius * 0.6; // 60% of the full bounds to get closer to actual character
    }

    private isInCameraView(): boolean {
        // Check if enemy is within the camera's viewport
        const camera = this.scene.cameras.main;
        const worldView = camera.worldView;
        
        // Use negative buffer to require enemies to be well within frame before attacking
        const buffer = -100; // Negative buffer = must be inside by 100 pixels
        
        return (
            this.sprite.x >= worldView.x - buffer &&
            this.sprite.x <= worldView.x + worldView.width + buffer &&
            this.sprite.y >= worldView.y - buffer &&
            this.sprite.y <= worldView.y + worldView.height + buffer
        );
    }
    private createMobAnimations(mobVariant: string): MobAnimationSet {
        // Use AnimationMapper to get the correct animation configuration
        return AnimationMapper.getMobAnimations(mobVariant);
    }



    private playAnimation(animationName: string): void {
        if (this.sprite.anims && this.currentAnimation !== animationName) {
            // Check if this animation is already playing (using Phaser's animation state)
            const currentlyPlaying = this.sprite.anims.currentAnim?.key;
            
            if (currentlyPlaying !== animationName && this.scene.anims.exists(animationName)) {
                // Preserve the current flip state before playing animation
                const currentFlipX = this.sprite.flipX;
                this.sprite.play(animationName);
                this.currentAnimation = animationName;
                // Restore flip state after animation starts (prevents animation from resetting flip)
                this.sprite.setFlipX(currentFlipX);
            }
        }
    }

    /**
     * Applies damage to the enemy
     * @param amount - Amount of damage to apply
     * @returns True if enemy died, false if it survived
     */
    public takeDamage(amount: number): boolean {
        // console.log('Enemy taking damage:', amount, 'current health:', this.currentHealth, 'new health:', this.currentHealth - amount);
        this.currentHealth -= amount;
        if (this.currentHealth <= 0) {
            // console.log('Enemy destroyed!');
            this.destroy();
            return true; // Enemy died
        }
        // console.log('Enemy survived with health:', this.currentHealth);
        return false; // Enemy survived
    }

    /**
     * Updates the enemy's position and behavior
     * @param playerX - Player's X coordinate
     * @param playerY - Player's Y coordinate
     * @param deltaTime - Time elapsed since last frame in seconds
     * @returns Attack result containing projectile or melee attack if performed
     */
    public update(playerX: number, playerY: number, deltaTime: number): EnemyAttackResult | null {
        const dx = playerX - this.sprite.x;
        const dy = playerY - this.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Update cooldowns
        if (this.shootCooldown > 0) {
            this.shootCooldown -= deltaTime;
        }
        if (this.meleeAttackCooldown > 0) {
            this.meleeAttackCooldown -= deltaTime;
        }
        if (this.shieldCooldown > 0) {
            this.shieldCooldown -= deltaTime;
        }
        if (this.coneAttackCooldown > 0) {
            this.coneAttackCooldown -= deltaTime;
        }
        if (this.vortexAttackCooldown > 0) {
            this.vortexAttackCooldown -= deltaTime;
        }
        
        // Update attack timer
        if (this.isAttacking) {
            this.attackTimer -= deltaTime;
            if (this.attackTimer <= 0) {
                this.isAttacking = false;
            }
        }
        
        // Track facing direction and flip sprite (only if not attacking)
        // Only update flip when direction actually changes to prevent flickering
        if (!this.isAttacking) {
            const shouldFaceLeft = dx < 0;
            if (shouldFaceLeft !== this.facingLeft) {
                this.facingLeft = shouldFaceLeft;
                this.sprite.setFlipX(this.facingLeft);
            }
        }
        
        // Skeleton Viking behavior - shield at range, cone attack up close
        if (this.type === EnemyType.SKELETON_VIKING) {
            const closeRange = 100;
            
            if (this.isAttacking) {
                this.playAnimation(this.mobAnimations.idle);
                // Stop movement when attacking
                const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                if (body) body.setVelocity(0, 0);
            } else if (distance > closeRange) {
                // Move towards player using physics velocity
                const velocityX = (dx / distance) * this.stats.speed;
                const velocityY = (dy / distance) * this.stats.speed;
                const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                if (body) body.setVelocity(velocityX, velocityY);
                this.playAnimation(this.mobAnimations.walk);
                
                // Deploy shield at medium range
                if (distance < 250 && this.shieldCooldown <= 0 && !this.activeShield) {
                    this.shieldCooldown = this.shieldInterval;
                    const enemyRadius = this.getApproximateRadius();
                    const shield = new Shield(this.scene, this.sprite.x, this.sprite.y, playerX, playerY, enemyRadius);
                    console.log(`Enemy #${this.sprite.getData('enemyId')} (SKELETON_VIKING) creating SHIELD`);
                    return { type: 'shield', damage: 0, position: { x: this.sprite.x, y: this.sprite.y }, hitPlayer: false, attackObject: shield };
            }
        } else {
                // Close range - cone attack
                this.playAnimation(this.mobAnimations.idle);
                // Stop movement when in close range
                const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                if (body) body.setVelocity(0, 0);
                if (this.coneAttackCooldown <= 0) {
                    this.coneAttackCooldown = this.coneAttackInterval;
                    this.isAttacking = true;
                    this.attackTimer = 0.25;
                    const enemyRadius = this.getApproximateRadius();
                    const coneAttack = new ConeAttack(this.scene, this.sprite.x, this.sprite.y, playerX, playerY, this.stats.damage, enemyRadius);
                    console.log(`Enemy #${this.sprite.getData('enemyId')} (SKELETON_VIKING) creating CONE ATTACK`);
                    return { type: 'cone', damage: this.stats.damage, position: { x: this.sprite.x, y: this.sprite.y }, hitPlayer: false, attackObject: coneAttack };
                }
            }
        }
        // Archer behavior - stay at range and shoot
        else if (this.type === EnemyType.ARCHER) {
            if (distance > this.attackRange) {
                // Move towards player using physics velocity
                const velocityX = (dx / distance) * this.stats.speed;
                const velocityY = (dy / distance) * this.stats.speed;
                const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                if (body) body.setVelocity(velocityX, velocityY);
                this.playAnimation(this.mobAnimations.walk);
            } else if (distance < this.attackRange - 50) {
                // Kite away using physics velocity
                const velocityX = -(dx / distance) * this.stats.speed;
                const velocityY = -(dy / distance) * this.stats.speed;
                const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                if (body) body.setVelocity(velocityX, velocityY);
                this.playAnimation(this.mobAnimations.walk);
            } else {
                this.playAnimation(this.mobAnimations.idle);
                // Stop movement when in optimal range
                const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                if (body) body.setVelocity(0, 0);
                if (this.shootCooldown <= 0) {
                    this.shootCooldown = this.shootInterval;
                    const projectile = new Projectile(this.scene, this.sprite.x, this.sprite.y, playerX, playerY, this.stats.damage);
                    console.log(`Enemy #${this.sprite.getData('enemyId')} (ARCHER) creating PROJECTILE`);
                    return { type: 'projectile', damage: this.stats.damage, position: { x: this.sprite.x, y: this.sprite.y }, hitPlayer: false, attackObject: projectile };
                }
            }
        }
        // Golem behavior - walk up and melee attack
        else if (this.type === EnemyType.GOLEM) {
            if (this.isAttacking) {
                this.playAnimation(this.mobAnimations.idle);
                // Stop movement when attacking
                const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                if (body) body.setVelocity(0, 0);
            } else if (distance > this.attackRange) {
                // Move towards player using physics velocity
                const velocityX = (dx / distance) * this.stats.speed;
                const velocityY = (dy / distance) * this.stats.speed;
                const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                if (body) body.setVelocity(velocityX, velocityY);
                this.playAnimation(this.mobAnimations.walk);
            } else {
                this.playAnimation(this.mobAnimations.idle);
                // Stop movement when in attack range
                const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                if (body) body.setVelocity(0, 0);
                if (this.meleeAttackCooldown <= 0) {
                    this.meleeAttackCooldown = this.meleeAttackInterval;
                    this.isAttacking = true;
                    this.attackTimer = this.attackDuration;
                    const enemyRadius = this.getApproximateRadius();
                    const meleeAttack = new MeleeAttack(this.scene, this.sprite.x, this.sprite.y, playerX, playerY, this.stats.damage, enemyRadius);
                    console.log(`Enemy #${this.sprite.getData('enemyId')} (GOLEM) creating MELEE ATTACK`);
                    return { type: 'melee', damage: this.stats.damage, position: { x: this.sprite.x, y: this.sprite.y }, hitPlayer: false, attackObject: meleeAttack };
                }
            }
        }
        // Skeleton Pirate behavior - vortex attacks at range
        else if (this.type === EnemyType.SKELETON_PIRATE) {
            const optimalRange = 320; // Preferred casting distance (reduced to fit in camera view)
            const minRange = 150; // Minimum distance to maintain
            const inCameraView = this.isInCameraView();
            
            // Movement logic - try to maintain optimal range and stay in camera view
            if (this.isAttacking) {
                // Stop movement while casting
                this.playAnimation(this.mobAnimations.idle);
                const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                if (body) body.setVelocity(0, 0);
            } else if (!inCameraView || distance > optimalRange) {
                // Not in camera view or too far - move towards player using physics velocity
                const velocityX = (dx / distance) * this.stats.speed;
                const velocityY = (dy / distance) * this.stats.speed;
                const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                if (body) body.setVelocity(velocityX, velocityY);
                this.playAnimation(this.mobAnimations.walk);
            } else if (distance < minRange) {
                // Too close - back away slightly using physics velocity
                const velocityX = -(dx / distance) * (this.stats.speed * 0.5);
                const velocityY = -(dy / distance) * (this.stats.speed * 0.5);
                const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                if (body) body.setVelocity(velocityX, velocityY);
                this.playAnimation(this.mobAnimations.walk);
            } else {
                // In optimal range - idle
                this.playAnimation(this.mobAnimations.idle);
                const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                if (body) body.setVelocity(0, 0);
            }
            
            // Attack logic - can attack from any distance when in camera view
            if (inCameraView && !this.isAttacking && this.vortexAttackCooldown <= 0) {
                this.vortexAttackCooldown = this.vortexAttackInterval;
                this.isAttacking = true;
                this.attackTimer = 0.5; // Brief casting animation lock
                const enemyRadius = this.getApproximateRadius();
                const vortexAttack = new VortexAttack(this.scene, this.sprite.x, this.sprite.y, playerX, playerY, this.stats.damage, enemyRadius);
                console.log(`Enemy #${this.sprite.getData('enemyId')} (SKELETON_PIRATE) creating VORTEX ATTACK at distance ${distance.toFixed(0)}`);
                return { type: 'vortex', damage: this.stats.damage, position: { x: this.sprite.x, y: this.sprite.y }, hitPlayer: false, 
                    specialEffects: { slowEffect: vortexAttack.slowEffect, slowDuration: vortexAttack.slowDuration }, attackObject: vortexAttack };
            }
        }
        // Elemental Spirit behavior - suicide bomber
        else if (this.type === EnemyType.ELEMENTAL_SPIRIT) {
            const explosionTriggerRange = 30; // Distance at which to trigger death/explosion (adjusted for size 30)
            
            if (this.isExploding) {
                // Currently in death animation, wait for it to complete
                this.deathTimer += deltaTime;
                // Stop movement when exploding
                const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                if (body) body.setVelocity(0, 0);
                
                if (this.deathTimer >= this.deathAnimationDuration) {
                    // Death animation complete, trigger explosion
                    console.log(`Enemy #${this.sprite.getData('enemyId')} (ELEMENTAL_SPIRIT) creating EXPLOSION`);
                    const explosion = new ExplosionAttack(this.scene, this.sprite.x, this.sprite.y, this.stats.damage);
                    
                    // Destroy the sprite immediately after creating explosion
                    this.destroy();
                    
                    return { type: 'explosion', damage: this.stats.damage, position: { x: this.sprite.x, y: this.sprite.y }, hitPlayer: false, attackObject: explosion };
                }
            } else if (distance <= explosionTriggerRange) {
                // Close enough to trigger death animation
                this.isExploding = true;
                this.deathTimer = 0;
                // Stop movement when triggering explosion
                const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                if (body) body.setVelocity(0, 0);
                this.playAnimation(this.mobAnimations.idle); // Use idle as death animation fallback
                console.log(`Enemy #${this.sprite.getData('enemyId')} (ELEMENTAL_SPIRIT) triggered death sequence`);
            } else {
                // Rush towards player with high speed using physics velocity
                const velocityX = (dx / distance) * this.stats.speed;
                const velocityY = (dy / distance) * this.stats.speed;
                const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                if (body) body.setVelocity(velocityX, velocityY);
                this.playAnimation(this.mobAnimations.walk);
            }
        }
        // Lightning Mage behavior - ranged AOE caster
        else if (this.type === EnemyType.LIGHTNING_MAGE) {
            const optimalRange = 320; // Preferred casting distance (reduced to fit in camera view)
            const minRange = 180; // Minimum distance to maintain
            const lightningCooldown = 'lightningCooldown';
            const lightningInterval = 3.0; // Cast every 3 seconds
            
            // Initialize cooldown if not exists
            if (!this.sprite.getData(lightningCooldown)) {
                this.sprite.setData(lightningCooldown, 0);
            }
            
            let currentCooldown = this.sprite.getData(lightningCooldown) as number;
            if (currentCooldown > 0) {
                this.sprite.setData(lightningCooldown, currentCooldown - deltaTime);
                currentCooldown = this.sprite.getData(lightningCooldown) as number;
            }
            
            // Check if in camera view
            const inCameraView = this.isInCameraView();
            
            // Movement logic - try to maintain optimal range and stay in camera view
            if (this.isAttacking) {
                // Immobilized while casting
                this.playAnimation(this.mobAnimations.idle);
                const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                if (body) body.setVelocity(0, 0);
            } else if (!inCameraView || distance > optimalRange) {
                // Not in camera view or too far - move closer
                const velocityX = (dx / distance) * this.stats.speed;
                const velocityY = (dy / distance) * this.stats.speed;
                const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                if (body) body.setVelocity(velocityX, velocityY);
                this.playAnimation(this.mobAnimations.walk);
            } else if (distance < minRange) {
                // Too close - back away
                const velocityX = -(dx / distance) * (this.stats.speed * 0.7);
                const velocityY = -(dy / distance) * (this.stats.speed * 0.7);
                const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                if (body) body.setVelocity(velocityX, velocityY);
                this.playAnimation(this.mobAnimations.walk);
            } else {
                // In optimal range - idle
                this.playAnimation(this.mobAnimations.idle);
                const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                if (body) body.setVelocity(0, 0);
            }
            
            // Attack logic - can only attack when in camera view
            if (inCameraView && !this.isAttacking && currentCooldown <= 0) {
                // Cast lightning strike at player's position
                this.sprite.setData(lightningCooldown, lightningInterval);
                this.isAttacking = true;
                this.attackTimer = 1.5; // Immobilized for warning duration
                
                const lightningStrike = new LightningStrikeAttack(this.scene, playerX, playerY, this.stats.damage);
                console.log(`Enemy #${this.sprite.getData('enemyId')} (LIGHTNING_MAGE) creating LIGHTNING STRIKE at distance ${distance.toFixed(0)}`);
                return { 
                    type: 'lightning', 
                    damage: this.stats.damage, 
                    position: { x: playerX, y: playerY }, 
                    hitPlayer: false, 
                    attackObject: lightningStrike 
                };
            }
        }
        // Gnoll behavior - fast melee with claw attacks
        else {
            if (this.isAttacking) {
                this.playAnimation(this.mobAnimations.idle);
                // Stop movement when attacking
                const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                if (body) body.setVelocity(0, 0);
            } else if (distance > this.attackRange) {
                // Move towards player using physics velocity
                const velocityX = (dx / distance) * this.stats.speed;
                const velocityY = (dy / distance) * this.stats.speed;
                const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                if (body) body.setVelocity(velocityX, velocityY);
                this.playAnimation(this.mobAnimations.walk);
            } else {
                this.playAnimation(this.mobAnimations.idle);
                // Stop movement when in attack range
                const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                if (body) body.setVelocity(0, 0);
                if (this.meleeAttackCooldown <= 0) {
                    this.meleeAttackCooldown = this.meleeAttackInterval;
                    this.isAttacking = true;
                    this.attackTimer = this.attackDuration;
                    // Create claw attack at player position
                    const clawAttack = new ClawAttack(this.scene, playerX, playerY, this.stats.damage);
                    console.log(`Enemy #${this.sprite.getData('enemyId')} (GNOLL) creating CLAW ATTACK at player position`);
                    return { type: 'claw', damage: this.stats.damage, position: { x: playerX, y: playerY }, hitPlayer: false, attackObject: clawAttack };
                }
            }
        }
        
        return null;
    }

    /**
     * Destroys the enemy and cleans up its sprite
     */
    public destroy(): void {
        this.sprite.destroy();
    }

    /**
     * Gets the resource cost of this enemy
     * @returns The cost value for AI resource management
     */
    public getCost(): number {
        return this.stats.cost;
    }

    /**
     * Gets the threat level of this enemy
     * @returns The threat level rating (0-100)
     */
    public getThreatLevel(): number {
        return this.stats.threatLevel;
    }

    /**
     * Gets the list of special abilities for this enemy
     * @returns Array of special ability names
     */
    public getSpecialAbilities(): string[] {
        return this.stats.specialAbilities;
    }

    /**
     * Checks if the enemy can attack based on cooldown and range
     */
    public canAttack(playerX: number, playerY: number): boolean {
        const currentTime = Date.now();
        const timeSinceLastAttack = currentTime - this.lastAttackTime;
        const distance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, playerX, playerY);
        
        return !this.isAttacking && 
               timeSinceLastAttack >= this.attackCooldown && 
               distance <= this.attackRange;
    }

    /**
     * Attempts to attack the player based on enemy type and abilities
     */
    public attemptAttack(playerX: number, playerY: number): EnemyAttackResult | null {
        if (!this.canAttack(playerX, playerY)) {
            return null;
        }

        this.lastAttackTime = Date.now();
        this.isAttacking = true;

        // Reset attacking state after a short delay
        setTimeout(() => {
            this.isAttacking = false;
        }, 500);

        // Determine attack type based on enemy type and special abilities
        const abilities = this.getSpecialAbilities();
        
        if (abilities.includes('projectile_attack')) {
            return this.createProjectileAttack(playerX, playerY);
        } else if (abilities.includes('cone_attack')) {
            return this.createConeAttack(playerX, playerY);
        } else if (abilities.includes('explosion_attack')) {
            return this.createExplosionAttack(playerX, playerY);
        } else if (abilities.includes('vortex_attack')) {
            return this.createVortexAttack(playerX, playerY);
        } else if (abilities.includes('shield_ability')) {
            return this.createShieldAttack(playerX, playerY);
        } else {
            return this.createMeleeAttack(playerX, playerY);
        }
    }

    /**
     * Creates a projectile attack
     */
    private createProjectileAttack(playerX: number, playerY: number): EnemyAttackResult {
        const projectile = new Projectile(
            this.scene,
            this.sprite.x,
            this.sprite.y,
            playerX,
            playerY,
            this.stats.damage
        );

        return {
            type: 'projectile',
            damage: this.stats.damage,
            position: { x: this.sprite.x, y: this.sprite.y },
            hitPlayer: false,
            attackObject: projectile
        };
    }

    /**
     * Creates a melee attack
     */
    private createMeleeAttack(playerX: number, playerY: number): EnemyAttackResult {
        const meleeAttack = new MeleeAttack(
            this.scene,
            this.sprite.x,
            this.sprite.y,
            playerX,
            playerY,
            this.stats.damage,
            this.stats.size
        );

        return {
            type: 'melee',
            damage: this.stats.damage,
            position: { x: this.sprite.x, y: this.sprite.y },
            hitPlayer: false,
            attackObject: meleeAttack
        };
    }

    /**
     * Creates a cone attack
     */
    private createConeAttack(playerX: number, playerY: number): EnemyAttackResult {
        const coneAttack = new ConeAttack(
            this.scene,
            this.sprite.x,
            this.sprite.y,
            playerX,
            playerY,
            this.stats.damage,
            this.stats.size
        );

        return {
            type: 'cone',
            damage: this.stats.damage,
            position: { x: this.sprite.x, y: this.sprite.y },
            hitPlayer: false,
            attackObject: coneAttack
        };
    }

    /**
     * Creates an explosion attack
     */
    private createExplosionAttack(playerX: number, playerY: number): EnemyAttackResult {
        const explosionAttack = new ExplosionAttack(
            this.scene,
            playerX,
            playerY,
            this.stats.damage
        );

        return {
            type: 'explosion',
            damage: this.stats.damage,
            position: { x: playerX, y: playerY },
            hitPlayer: false,
            attackObject: explosionAttack
        };
    }

    /**
     * Creates a vortex attack
     */
    private createVortexAttack(playerX: number, playerY: number): EnemyAttackResult {
        const vortexAttack = new VortexAttack(
            this.scene,
            this.sprite.x,
            this.sprite.y,
            playerX,
            playerY,
            this.stats.damage,
            this.stats.size
        );

        return {
            type: 'vortex',
            damage: this.stats.damage,
            position: { x: this.sprite.x, y: this.sprite.y },
            hitPlayer: false,
            specialEffects: {
                slowEffect: vortexAttack.slowEffect,
                slowDuration: vortexAttack.slowDuration
            },
            attackObject: vortexAttack
        };
    }

    /**
     * Creates a shield
     */
    private createShieldAttack(playerX: number, playerY: number): EnemyAttackResult {
        const shield = new Shield(
            this.scene,
            this.sprite.x,
            this.sprite.y,
            playerX,
            playerY,
            this.stats.size
        );

        return {
            type: 'shield',
            damage: 0,
            position: { x: this.sprite.x, y: this.sprite.y },
            hitPlayer: false,
            attackObject: shield
        };
    }


}

export class EnemySystem {
    private scene: Scene;
    private enemies: Enemy[] = [];
    private projectiles: Projectile[] = [];
    private meleeAttacks: MeleeAttack[] = [];
    private shields: Shield[] = [];
    private coneAttacks: ConeAttack[] = [];
    private vortexAttacks: VortexAttack[] = [];
    private explosionAttacks: ExplosionAttack[] = [];
    private lightningStrikes: LightningStrikeAttack[] = [];
    private clawAttacks: ClawAttack[] = [];
    private spawnRate: number = 1.0;
    private maxEnemies: number = 50;
    private player: any;
    private xpOrbSystem: any;
    private spawnTimer: Phaser.Time.TimerEvent | null = null;
    private onEnemySpawnedCallback: ((enemy: Enemy) => void) | null = null;
    
    // Attack object management
    private activeProjectiles: Projectile[] = [];
    private activeShields: Shield[] = [];
    private activeConeAttacks: ConeAttack[] = [];
    private activeExplosionAttacks: ExplosionAttack[] = [];
    private activeVortexAttacks: VortexAttack[] = [];
    private activeMeleeAttacks: MeleeAttack[] = [];
    private activeLightningStrikes: LightningStrikeAttack[] = [];
    private activeClawAttacks: ClawAttack[] = [];

    constructor(scene: Scene, player?: any, xpOrbSystem?: any) {
        this.scene = scene;
        this.player = player;
        this.xpOrbSystem = xpOrbSystem;
    }

    /**
     * Sets a callback to be called whenever a new enemy is spawned
     * @param callback - Function to call with the newly spawned enemy
     */
    public setEnemySpawnedCallback(callback: (enemy: Enemy) => void): void {
        this.onEnemySpawnedCallback = callback;
    }

    /**
     * Starts the enemy spawning system
     */
    public startSpawning(): void {
        // Start a timer that spawns enemies periodically
        this.spawnTimer = this.scene.time.addEvent({
            delay: 2000 / this.spawnRate,
            callback: this.spawnRandomEnemy,
            callbackScope: this,
            loop: true
        });
        
        // console.log('Enemy spawning started');
    }

    /**
     * Stops the enemy spawning system
     */
    public stopSpawning(): void {
        if (this.spawnTimer) {
            this.spawnTimer.destroy();
            this.spawnTimer = null;
        }
    }

    /**
     * Spawns a random enemy near the player
     */
    private spawnRandomEnemy(): void {
        if (!this.player || this.enemies.length >= this.maxEnemies) {
            return;
        }

        // Get player position
        const playerX = this.player.x || 512;
        const playerY = this.player.y || 384;

        // Choose a random enemy type
        const enemyTypes = Object.values(EnemyType);
        const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)] as EnemyType;

        // Spawn the enemy
        this.spawnWave(randomType, 1, 'near_player', playerX, playerY);
    }

    /**
     * Spawns a single enemy at a specific position (for testing/debugging)
     * @param enemyType - Type of enemy to spawn
     * @param x - X coordinate to spawn at
     * @param y - Y coordinate to spawn at
     * @returns The spawned enemy or null if max enemies reached
     */
    public spawnEnemy(enemyType: EnemyType, x: number, y: number): Enemy | null {
        if (this.enemies.length >= this.maxEnemies) {
            console.warn('Max enemies reached, cannot spawn more');
            return null;
        }

        const enemy = new Enemy(this.scene, x, y, enemyType);
        this.enemies.push(enemy);
        return enemy;
    }

    /**
     * Spawns a wave of enemies of the specified type
     * @param enemyType - Type of enemy to spawn
     * @param count - Number of enemies to spawn
     * @param location - Spawn location strategy ('near_player', 'screen_edges', 'random_ambush')
     * @param playerX - Player's X coordinate for positioning
     * @param playerY - Player's Y coordinate for positioning
     * @returns Array of spawned enemies
     */
    public spawnWave(enemyType: EnemyType, count: number, location: string, playerX: number = 512, playerY: number = 384): Enemy[] {
        if (this.enemies.length >= this.maxEnemies) {
            return []; // Don't spawn if max is reached
        }

        const remainingCapacity = this.maxEnemies - this.enemies.length;
        const spawnCount = Math.min(count, remainingCapacity);
        const spawnedEnemies: Enemy[] = [];

        for (let i = 0; i < spawnCount; i++) {
            const spawnPos = this.getSpawnPosition(location, playerX, playerY);
            const enemy = new Enemy(this.scene, spawnPos.x, spawnPos.y, enemyType);
            this.enemies.push(enemy);
            spawnedEnemies.push(enemy);
            
            // Notify callback if registered
            if (this.onEnemySpawnedCallback) {
                this.onEnemySpawnedCallback(enemy);
            }
        }
        
        return spawnedEnemies;
    }

    /**
     * Spawn a single enemy at a specific position
     * @returns The spawned enemy, or null if max enemies reached
     */
    public spawnEnemyAt(enemyType: EnemyType, x: number, y: number): Enemy | null {
        if (this.enemies.length >= this.maxEnemies) {
            return null; // Don't spawn if max is reached
        }

        const enemy = new Enemy(this.scene, x, y, enemyType);
        this.enemies.push(enemy);
        return enemy;
    }

    private getSpawnPosition(location: string, playerX: number, playerY: number): { x: number; y: number } {
        // Get camera world view bounds instead of hardcoded screen dimensions
        const camera = this.scene.cameras.main;
        const worldView = camera.worldView;
        const gameWidth = worldView.width;
        const gameHeight = worldView.height;
        const cameraX = worldView.x;
        const cameraY = worldView.y;
        
        const safeZoneRadius = 200; // Safe zone around player
        
        let spawnX, spawnY;
        let attempts = 0;
        const maxAttempts = 20;
        
        do {
            switch (location) {
                case 'near_player':
                    // Spawn in a circle around player but outside safe zone
                    const angle = Math.random() * Math.PI * 2;
                    const distance = safeZoneRadius + 50 + Math.random() * 100;
                    spawnX = playerX + Math.cos(angle) * distance;
                    spawnY = playerY + Math.sin(angle) * distance;
                    break;
                case 'screen_edges':
                    const edge = Math.floor(Math.random() * 4);
                    switch (edge) {
                        case 0: spawnX = cameraX + Math.random() * gameWidth; spawnY = cameraY; break; // Top
                        case 1: spawnX = cameraX + gameWidth; spawnY = cameraY + Math.random() * gameHeight; break; // Right
                        case 2: spawnX = cameraX + Math.random() * gameWidth; spawnY = cameraY + gameHeight; break; // Bottom
                        case 3: spawnX = cameraX; spawnY = cameraY + Math.random() * gameHeight; break; // Left
                        default: spawnX = cameraX; spawnY = cameraY;
                    }
                    break;
                case 'random_ambush':
                default:
                    spawnX = cameraX + Math.random() * gameWidth;
                    spawnY = cameraY + Math.random() * gameHeight;
                    break;
            }
            
            // Ensure spawn position is within world bounds (get from physics world)
            const worldBounds = this.scene.physics.world.bounds;
            spawnX = Math.max(worldBounds.x + 20, Math.min(worldBounds.width - 20, spawnX));
            spawnY = Math.max(worldBounds.y + 20, Math.min(worldBounds.height - 20, spawnY));
            
            attempts++;
        } while (this.isInSafeZone(spawnX, spawnY, playerX, playerY, safeZoneRadius) && attempts < maxAttempts);
        
        return { x: spawnX, y: spawnY };
    }
    
    private isInSafeZone(x: number, y: number, playerX: number, playerY: number, safeRadius: number): boolean {
        const distance = Math.sqrt(Math.pow(x - playerX, 2) + Math.pow(y - playerY, 2));
        return distance < safeRadius;
    }

    /**
     * Starts a special enemy event
     * @param eventType - Type of special event to trigger
     */
    public startSpecialEvent(eventType: string): void {
        switch (eventType) {
            case 'boss_encounter':
                this.spawnWave(EnemyType.GOLEM, 1, 'screen_edges');
                break;
        }
    }

    /**
     * Increases the spawn rate by a percentage
     * @param percentage - Percentage increase in spawn rate
     */
    public increaseSpawnRate(percentage: number): void {
        this.spawnRate *= (1 + percentage / 100);
    }

    /**
     * Updates all enemies in the system
     * @param playerX - Player's X coordinate
     * @param playerY - Player's Y coordinate
     * @param deltaTime - Time elapsed since last frame in seconds
     */
    public update(playerX: number, playerY: number, deltaTime: number): void {
        // Update enemies and collect new attacks
        this.enemies.forEach(enemy => {
            const attackResult = enemy.update(playerX, playerY, deltaTime);
            if (attackResult && attackResult.attackObject) {
                switch (attackResult.type) {
                    case 'projectile':
                        this.projectiles.push(attackResult.attackObject as Projectile);
                        break;
                    case 'melee':
                        this.meleeAttacks.push(attackResult.attackObject as MeleeAttack);
                        break;
                    case 'shield':
                        this.shields.push(attackResult.attackObject as Shield);
                        // Store reference to shield in enemy
                        (enemy as any).activeShield = attackResult.attackObject;
                        break;
                    case 'cone':
                        this.coneAttacks.push(attackResult.attackObject as ConeAttack);
                        break;
                    case 'vortex':
                        this.vortexAttacks.push(attackResult.attackObject as VortexAttack);
                        break;
                    case 'explosion':
                        this.explosionAttacks.push(attackResult.attackObject as ExplosionAttack);
                        break;
                    case 'lightning':
                        this.lightningStrikes.push(attackResult.attackObject as LightningStrikeAttack);
                        break;
                    case 'claw':
                        this.clawAttacks.push(attackResult.attackObject as ClawAttack);
                        break;
                }
            }
        });
        
        // Update all projectiles and check for shield collisions
        this.projectiles.forEach(projectile => {
            projectile.update(deltaTime);
            
            // Check if any shield blocks this projectile
            for (const shield of this.shields) {
                if (shield.isActive() && shield.blocksProjectile(projectile.sprite.x, projectile.sprite.y)) {
                    projectile.destroy();
                    console.log('Shield blocked projectile!');
                    break; // Projectile is blocked, no need to check other shields
                }
            }
        });
        
        // Update all melee attacks
        this.meleeAttacks.forEach(attack => {
            attack.update(deltaTime);
        });
        
        // Update all shields (follow their owners)
        this.shields.forEach(shield => {
            // Find the enemy that owns this shield
            const owner = this.enemies.find(e => (e as any).activeShield === shield);
            if (owner) {
                shield.update(deltaTime, owner.sprite.x, owner.sprite.y);
            } else {
                shield.update(deltaTime, shield.x, shield.y);
            }
        });
        
        // Update all cone attacks
        this.coneAttacks.forEach(attack => {
            attack.update(deltaTime);
        });
        
        // Update all vortex attacks
        this.vortexAttacks.forEach(attack => {
            attack.update(deltaTime);
        });
        
        // Update all explosion attacks
        this.explosionAttacks.forEach(attack => {
            attack.update(deltaTime);
        });
        
        // Update all lightning strikes
        this.lightningStrikes.forEach(attack => {
            attack.update(deltaTime);
        });
        
        // Update all claw attacks
        this.clawAttacks.forEach(attack => {
            attack.update(deltaTime);
        });
        
        // Clean up inactive shields from enemy references
        this.shields.forEach(shield => {
            if (!shield.isActive()) {
                this.enemies.forEach(enemy => {
                    if ((enemy as any).activeShield === shield) {
                        (enemy as any).activeShield = null;
                    }
                });
            }
        });
        
        // Remove destroyed enemies, inactive projectiles, and expired attacks
        this.enemies = this.enemies.filter(enemy => enemy.sprite.active);
        this.projectiles = this.projectiles.filter(projectile => projectile.isActive());
        this.meleeAttacks = this.meleeAttacks.filter(attack => attack.isActive());
        this.shields = this.shields.filter(shield => shield.isActive());
        this.coneAttacks = this.coneAttacks.filter(attack => attack.isActive());
        this.vortexAttacks = this.vortexAttacks.filter(attack => attack.isActive());
        this.explosionAttacks = this.explosionAttacks.filter(attack => attack.isActive());
        this.lightningStrikes = this.lightningStrikes.filter(attack => attack.isActive());
        this.clawAttacks = this.clawAttacks.filter(attack => attack.isActive());
        // Update all active attack objects
        this.updateAttackObjects(deltaTime, playerX, playerY);
        
        // Remove destroyed enemies and spawn XP orbs
        this.enemies = this.enemies.filter(enemy => {
            if (!enemy.sprite.active) {
                // Spawn XP orbs when enemy dies
                if (this.xpOrbSystem) {
                    console.log(`Enemy died at (${enemy.sprite.x}, ${enemy.sprite.y}), spawning XP orbs with value ${enemy.stats.xpValue}`);
                    this.xpOrbSystem.spawnXPOrbs(
                        enemy.sprite.x,
                        enemy.sprite.y,
                        enemy.type,
                        enemy.stats.xpValue
                    );
                }
                return false; // Remove the enemy
            }
            return true; // Keep the enemy
        });
    }

    /**
     * Gets the total number of active enemies
     * @returns Current enemy count
     */
    public getEnemyCount(): number {
        return this.enemies.length;
    }


    /**
     * Updates all active attack objects and removes inactive ones
     * @param deltaTime - Time elapsed since last frame
     * @param playerX - Player's X position
     * @param playerY - Player's Y position
     */
    private updateAttackObjects(deltaTime: number, _playerX: number, _playerY: number): void {
        // Update and filter projectiles
        this.activeProjectiles = this.activeProjectiles.filter(projectile => {
            projectile.update(deltaTime);
            if (!projectile.isActive()) {
                projectile.destroy();
                return false;
            }
            return true;
        });

        // Update and filter shields (need enemy position for shields)
        this.activeShields = this.activeShields.filter(shield => {
            // Find the enemy that owns this shield (simplified - could be improved with owner tracking)
            const ownerEnemy = this.enemies.find(enemy => 
                Math.abs(enemy.sprite.x - shield.x) < 50 && Math.abs(enemy.sprite.y - shield.y) < 50
            );
            
            if (ownerEnemy) {
                shield.update(deltaTime, ownerEnemy.sprite.x, ownerEnemy.sprite.y);
            } else {
                shield.update(deltaTime, shield.x, shield.y);
            }
            
            if (!shield.isActive()) {
                shield.destroy();
                return false;
            }
            return true;
        });

        // Update and filter cone attacks
        this.activeConeAttacks = this.activeConeAttacks.filter(cone => {
            cone.update(deltaTime);
            if (!cone.isActive()) {
                cone.destroy();
                return false;
            }
            return true;
        });

        // Update and filter explosion attacks
        this.activeExplosionAttacks = this.activeExplosionAttacks.filter(explosion => {
            explosion.update(deltaTime);
            if (!explosion.isActive()) {
                explosion.destroy();
                return false;
            }
            return true;
        });

        // Update and filter vortex attacks
        this.activeVortexAttacks = this.activeVortexAttacks.filter(vortex => {
            vortex.update(deltaTime);
            if (!vortex.isActive()) {
                vortex.destroy();
                return false;
            }
            return true;
        });

        // Update and filter melee attacks
        this.activeMeleeAttacks = this.activeMeleeAttacks.filter(melee => {
            melee.update(deltaTime);
            if (!melee.isActive()) {
                melee.destroy();
                return false;
            }
            return true;
        });

        // Update and filter lightning strikes
        this.activeLightningStrikes = this.activeLightningStrikes.filter(lightning => {
            lightning.update(deltaTime);
            if (!lightning.isActive()) {
                lightning.destroy();
                return false;
            }
            return true;
        });

        // Update and filter claw attacks
        this.activeClawAttacks = this.activeClawAttacks.filter(claw => {
            claw.update(deltaTime);
            if (!claw.isActive()) {
                claw.destroy();
                return false;
            }
            return true;
        });
    }

    /**
     * Gets all active attack objects for collision detection
     * @returns Object containing arrays of all active attack objects
     */
    public getActiveAttacks(): {
        projectiles: Projectile[];
        shields: Shield[];
        coneAttacks: ConeAttack[];
        explosionAttacks: ExplosionAttack[];
        vortexAttacks: VortexAttack[];
        meleeAttacks: MeleeAttack[];
        lightningStrikes: LightningStrikeAttack[];
        clawAttacks: ClawAttack[];
    } {
        return {
            projectiles: this.activeProjectiles,
            shields: this.activeShields,
            coneAttacks: this.activeConeAttacks,
            explosionAttacks: this.activeExplosionAttacks,
            vortexAttacks: this.activeVortexAttacks,
            meleeAttacks: this.activeMeleeAttacks,
            lightningStrikes: this.activeLightningStrikes,
            clawAttacks: this.activeClawAttacks
        };
    }

    /**
     * Clears all active attack objects
     */
    public clearAllAttacks(): void {
        // Destroy all attack objects
        [...this.activeProjectiles, ...this.activeShields, ...this.activeConeAttacks,
         ...this.activeExplosionAttacks, ...this.activeVortexAttacks, ...this.activeMeleeAttacks,
         ...this.activeLightningStrikes, ...this.activeClawAttacks]
            .forEach(attack => attack.destroy());

        // Clear arrays
        this.activeProjectiles = [];
        this.activeShields = [];
        this.activeConeAttacks = [];
        this.activeExplosionAttacks = [];
        this.activeVortexAttacks = [];
        this.activeMeleeAttacks = [];
        this.activeLightningStrikes = [];
        this.activeClawAttacks = [];
    }

    /**
     * Gets the count of enemies of a specific type
     * @param type - The enemy type to count
     * @returns Number of enemies of the specified type
     */
    public getEnemyCountByType(type: EnemyType): number {
        return this.enemies.filter(enemy => enemy.type === type).length;
    }

    /**
     * Gets the array of all active enemies
     * @returns Array of enemy objects
     */
    public getEnemies(): Enemy[] {
        return this.enemies;
    }

    /**
     * Gets all active projectiles
     * @returns Array of all active projectiles
     */
    public getProjectiles(): Projectile[] {
        return this.projectiles;
    }

    /**
     * Gets all active melee attacks
     * @returns Array of all active melee attacks
     */
    public getMeleeAttacks(): MeleeAttack[] {
        return this.meleeAttacks;
    }

    /**
     * Gets all active shields
     * @returns Array of all active shields
     */
    public getShields(): Shield[] {
        return this.shields;
    }

    /**
     * Gets all active cone attacks
     * @returns Array of all active cone attacks
     */
    public getConeAttacks(): ConeAttack[] {
        return this.coneAttacks;
    }

    /**
     * Gets all active vortex attacks
     * @returns Array of all active vortex attacks
     */
    public getVortexAttacks(): VortexAttack[] {
        return this.vortexAttacks;
    }

    /**
     * Gets all active explosion attacks
     * @returns Array of all active explosion attacks
     */
    public getExplosionAttacks(): ExplosionAttack[] {
        return this.explosionAttacks;
    }

    /**
     * Gets all active lightning strikes
     * @returns Array of all active lightning strikes
     */
    public getLightningStrikes(): LightningStrikeAttack[] {
        return this.lightningStrikes;
    }

    /**
     * Gets all active claw attacks
     * @returns Array of all active claw attacks
     */
    public getClawAttacks(): ClawAttack[] {
        return this.clawAttacks;
    }

    /**
     * Destroys all enemies and clears the enemy array
     */
    public clearAllEnemies(): void {
        this.enemies.forEach(enemy => enemy.destroy());
        this.enemies = [];
        this.projectiles.forEach(projectile => projectile.destroy());
        this.projectiles = [];
        this.meleeAttacks.forEach(attack => attack.destroy());
        this.meleeAttacks = [];
        this.shields.forEach(shield => shield.destroy());
        this.shields = [];
        this.coneAttacks.forEach(attack => attack.destroy());
        this.coneAttacks = [];
        this.vortexAttacks.forEach(attack => attack.destroy());
        this.vortexAttacks = [];
        this.explosionAttacks.forEach(attack => attack.destroy());
        this.explosionAttacks = [];
        this.lightningStrikes.forEach(attack => attack.destroy());
        this.lightningStrikes = [];
        this.clawAttacks.forEach(attack => attack.destroy());
        this.clawAttacks = [];
    }

    // Dynamic cost calculation based on combat effectiveness
    public static calculateEnemyCost(stats: Omit<EnemyStats, 'cost' | 'threatLevel' | 'specialAbilities'>, abilities: string[]): number {
        // Base cost calculation
        let baseCost = Math.round(
            (stats.health * 0.1) + 
            (stats.damage * 2) + 
            (stats.speed * 0.5) + 
            (stats.xpValue * 0.3)
        );
        
        // Ability multipliers
        let abilityMultiplier = 1.0;
        abilities.forEach(ability => {
            switch (ability) {
                case 'armor_plating':
                case 'shield_regeneration':
                    abilityMultiplier += 0.3;
                    break;
                case 'speed_boost':
                case 'phase_shift':
                    abilityMultiplier += 0.2;
                    break;
                case 'explosive_death':
                case 'projectile_attack':
                    abilityMultiplier += 0.25;
                    break;
                case 'boss_abilities':
                case 'area_damage':
                    abilityMultiplier += 0.5;
                    break;
                case 'rage_mode':
                case 'charge_attack':
                    abilityMultiplier += 0.35;
                    break;
                default:
                    abilityMultiplier += 0.1;
            }
        });
        
        return Math.max(1, Math.round(baseCost * abilityMultiplier));
    }



    // Calculate overall threat level (0-10 scale)
    public static calculateThreatLevel(stats: Omit<EnemyStats, 'cost' | 'threatLevel' | 'specialAbilities'>, abilities: string[]): number {
        // Base threat calculation (0-100 scale)
        let baseThreat = Math.min(100, Math.round(
            (stats.health * 0.15) + 
            (stats.damage * 3) + 
            (stats.speed * 0.8) + 
            (stats.xpValue * 0.4)
        ));
        
        // Ability threat modifiers
        let threatModifier = 0;
        abilities.forEach(ability => {
            switch (ability) {
                case 'armor_plating':
                    threatModifier += 15;
                    break;
                case 'shield_regeneration':
                    threatModifier += 20;
                    break;
                case 'speed_boost':
                    threatModifier += 10;
                    break;
                case 'phase_shift':
                    threatModifier += 25;
                    break;
                case 'explosive_death':
                    threatModifier += 12;
                    break;
                case 'projectile_attack':
                    threatModifier += 18;
                    break;
                case 'boss_abilities':
                    threatModifier += 40;
                    break;
                case 'area_damage':
                    threatModifier += 30;
                    break;
                case 'rage_mode':
                    threatModifier += 22;
                    break;
                case 'charge_attack':
                    threatModifier += 16;
                    break;
                default:
                    threatModifier += 5;
            }
        });
        
        return Math.min(100, Math.max(1, baseThreat + threatModifier));
    }



    /**
     * Gets the total resource cost of all current enemies
     * @returns Sum of all enemy costs
     */
    public getTotalEnemyCost(): number {
        return this.enemies.reduce((total, enemy) => total + enemy.getCost(), 0);
    }

    // Get average threat level of current enemies
    public getAverageThreatLevel(): number {
        if (this.enemies.length === 0) return 0;
        const totalThreat = this.enemies.reduce((total, enemy) => total + enemy.getThreatLevel(), 0);
        return Math.round((totalThreat / this.enemies.length) * 10) / 10;
    }

    // Get cost breakdown by enemy type
    public getCostBreakdown(): { [key: string]: { count: number; totalCost: number; avgThreat: number } } {
        const breakdown: { [key: string]: { count: number; totalCost: number; avgThreat: number } } = {};
        
        this.enemies.forEach(enemy => {
            const type = enemy.type;
            if (!breakdown[type]) {
                breakdown[type] = { count: 0, totalCost: 0, avgThreat: 0 };
            }
            breakdown[type].count++;
            breakdown[type].totalCost += enemy.getCost();
            breakdown[type].avgThreat += enemy.getThreatLevel();
        });
        
        // Calculate averages
        Object.keys(breakdown).forEach(type => {
            breakdown[type].avgThreat = Math.round((breakdown[type].avgThreat / breakdown[type].count) * 10) / 10;
        });
        
        return breakdown;
    }
}

