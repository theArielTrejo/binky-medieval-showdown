import { Scene } from 'phaser';

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
