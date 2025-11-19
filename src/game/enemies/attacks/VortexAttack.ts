import { Scene } from 'phaser';

/**
 * Vortex attack for Skeleton Pirate - a traveling, expanding trap
 */
export class VortexAttack {
    public sprite: Phaser.GameObjects.Sprite;
    public damage: number;
    public scene: Scene;
    private active: boolean = true;
    private travelTime: number = 1.0; // Time to reach player (1.5 seconds)
    private totalLifetime: number = 4.0; // Total: 1.0s travel + 3s stationary
    private elapsed: number = 0;
    public x: number;
    public y: number;
    private startX: number;
    private startY: number;
    private targetX: number;
    private targetY: number;
    private maxDistance: number = 600; // Maximum distance the vortex can travel
    private totalDistance: number = 0; // Total distance to travel (calculated in constructor)
    private startScale: number = 0.01; // Starting scale (very small)
    private maxScale: number = 0.10; // Maximum scale when fully expanded (much smaller)
    public currentRadius: number;
    private velocityX: number;
    private velocityY: number;
    private isTraveling: boolean = true; // Whether vortex is still moving
    private frozenExpansionProgress: number | null = null; // Stores size when stopped early
    public slowEffect: number = 0.5; // Slow multiplier (0.5 = 50% speed)
    public slowDuration: number = 2000; // How long the slow lasts on player in ms (2 seconds)
    private rotationSpeed: number = 3; // Radians per second for rotation
    
    constructor(scene: Scene, enemyX: number, enemyY: number, playerX: number, playerY: number, damage: number, _enemyRadius: number = 40) {
        this.scene = scene;
        this.damage = damage;
        this.startX = enemyX;
        this.startY = enemyY;
        this.x = enemyX;
        this.y = enemyY;
        
        // Calculate direction towards player
        const dx = playerX - enemyX;
        const dy = playerY - enemyY;
        const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
        
        // Limit the travel distance and target the player's position directly
        this.totalDistance = Math.min(distanceToPlayer, this.maxDistance);
        
        // If player is within max distance, target them exactly to trap them in the center
        // Otherwise, travel max distance in their direction
        if (distanceToPlayer <= this.maxDistance) {
            this.targetX = playerX;
            this.targetY = playerY;
        } else {
            const directionX = dx / distanceToPlayer;
            const directionY = dy / distanceToPlayer;
            this.targetX = enemyX + directionX * this.maxDistance;
            this.targetY = enemyY + directionY * this.maxDistance;
        }
        
        // Calculate velocity for smooth travel
        this.velocityX = (this.targetX - this.startX) / this.travelTime;
        this.velocityY = (this.targetY - this.startY) / this.travelTime;
        
        // Create whirlpool sprite
        this.sprite = scene.add.sprite(enemyX, enemyY, 'whirlpool');
        this.sprite.setScale(this.startScale);
        this.sprite.setDepth(4); // Below shields but above ground
        this.sprite.setAlpha(0.8); // Slightly transparent
        
        // Calculate initial radius based on sprite size and scale
        // Whirlpool.png is assumed to be roughly circular
        this.currentRadius = (this.sprite.width / 2) * this.startScale;
        
        console.log(`Vortex created at (${enemyX.toFixed(0)}, ${enemyY.toFixed(0)}), targeting player at (${this.targetX.toFixed(0)}, ${this.targetY.toFixed(0)})`);
    }

    public update(deltaTime: number): void {
        if (!this.active) return;
        
        this.elapsed += deltaTime;
        
        // Calculate expansion progress based on distance traveled
        let expansionProgress: number;
        if (this.frozenExpansionProgress !== null) {
            // Use frozen size when stopped early
            expansionProgress = this.frozenExpansionProgress;
        } else if (this.isTraveling) {
            // Calculate distance traveled from start position
            const dx = this.x - this.startX;
            const dy = this.y - this.startY;
            const distanceTraveled = Math.sqrt(dx * dx + dy * dy);
            // Expand based on distance traveled vs total distance
            expansionProgress = Math.min(1, distanceTraveled / this.totalDistance);
        } else {
            // Stay at max size while stationary (reached destination normally)
            expansionProgress = 1;
        }
        
        // Update scale based on expansion progress
        const currentScale = this.startScale + (this.maxScale - this.startScale) * expansionProgress;
        this.sprite.setScale(currentScale);
        
        // Update radius for collision detection
        this.currentRadius = (this.sprite.width / 2) * currentScale;
        
        // Rotate the whirlpool
        this.sprite.rotation += this.rotationSpeed * deltaTime;
        
        // Travel phase
        if (this.isTraveling && this.elapsed < this.travelTime) {
            // Move vortex
            this.x += this.velocityX * deltaTime;
            this.y += this.velocityY * deltaTime;
            this.sprite.setPosition(this.x, this.y);
        } else if (this.isTraveling) {
            // Transition to stationary phase
            this.isTraveling = false;
            this.x = this.targetX;
            this.y = this.targetY;
            this.sprite.setPosition(this.x, this.y);
        }
        
        // Fade out in the last 0.5 seconds
        if (this.elapsed > this.totalLifetime - 0.5) {
            const fadeProgress = (this.totalLifetime - this.elapsed) / 0.5;
            this.sprite.setAlpha(0.8 * fadeProgress);
        }
        
        // Destroy after total lifetime
        if (this.elapsed >= this.totalLifetime) {
            this.destroy();
        }
    }

    public destroy(): void {
        this.active = false;
        if (this.sprite && this.sprite.scene) {
            this.sprite.destroy();
        }
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
            // Calculate and freeze the current expansion progress based on distance
            const dx = this.x - this.startX;
            const dy = this.y - this.startY;
            const distanceTraveled = Math.sqrt(dx * dx + dy * dy);
            this.frozenExpansionProgress = Math.min(1, distanceTraveled / this.totalDistance);
            this.isTraveling = false;
            this.targetX = this.x;
            this.targetY = this.y;
            console.log(`Vortex stopped early at (${this.x.toFixed(0)}, ${this.y.toFixed(0)}) with ${(this.frozenExpansionProgress * 100).toFixed(0)}% size`);
        }
    }
}
