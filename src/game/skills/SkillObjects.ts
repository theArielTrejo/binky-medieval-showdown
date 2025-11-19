import { Scene } from 'phaser';
import { BaseProjectile } from '../objects/BaseProjectile';

export interface ProjectileOptions {
    ricochet?: boolean;
    freeze?: boolean;
    homing?: boolean;
    explosive?: boolean;
    crit?: boolean;
}

export interface CleaveOptions {
    lifesteal?: number; // value between 0-1
    sunder?: boolean;
    execution?: boolean;
    isWide?: boolean; // True if "Cleave" skill unlocked
}

export interface NovaOptions {
    pull?: boolean;
    slow?: boolean;
    heal?: number; // value between 0-1
    sunder?: boolean;
}

/**
 * Player projectile class for ranged skills (e.g. Fireball, Ice Bolt)
 */
export class PlayerProjectile extends BaseProjectile {
    private lifetime: number = 5.0; // Projectiles expire after 5 seconds
    private elapsed: number = 0;
    public pierceCount: number = 0; // How many enemies it can pass through
    public hitEnemies: Set<number> = new Set(); // Track enemies hit by ID to prevent double hits
    public options: ProjectileOptions;

    constructor(scene: Scene, x: number, y: number, targetX: number, targetY: number, damage: number, speed: number = 400, texture?: string, options: ProjectileOptions = {}) {
        super(scene, damage);
        this.options = options;
        
        // Create visual
        if (texture && scene.textures.exists(texture)) {
            this.sprite = scene.add.sprite(x, y, texture);
        } else {
            // Fallback: Blue orb
            this.sprite = scene.add.graphics();
            const graphics = this.sprite as Phaser.GameObjects.Graphics;
            
            let color = 0x00ffff; // Default Cyan
            if (this.options.explosive) color = 0xff4400; // Orange/Red
            if (this.options.freeze) color = 0xccffff; // Icy White
            if (this.options.crit) color = 0xff0000; // Red for crit

            graphics.fillStyle(color, 1);
            graphics.fillCircle(0, 0, this.options.crit ? 12 : 8); // Bigger if crit
            this.sprite.setPosition(x, y);
        }
        
        // Enable Arcade Physics
        scene.physics.add.existing(this.sprite);
        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        body.setCircle(this.options.crit ? 12 : 8); // Match visual radius
        body.setOffset(this.options.crit ? -12 : -8, this.options.crit ? -12 : -8); // Center body if graphics
        
        this.sprite.setDepth(10);
        
        // Calculate direction
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Normalize and apply speed
        if (distance > 0) {
            this.velocityX = (dx / distance) * speed;
            this.velocityY = (dy / distance) * speed;
            
            // Rotate sprite to face direction
            this.sprite.rotation = Math.atan2(dy, dx);
        } else {
            this.velocityX = speed;
            this.velocityY = 0;
        }
    }

    public update(deltaTime: number): void {
        if (!this.active) return;
        
        this.elapsed += deltaTime;
        if (this.elapsed >= this.lifetime) {
            this.destroy();
            return;
        }

        // Move projectile (handled by BaseProjectile)
        super.update(deltaTime);
    }
}

/**
 * Player Cleave attack (Cone shape) for Melee skills
 */
export class PlayerCleave {
    public sprite: Phaser.GameObjects.Graphics;
    public damage: number;
    public scene: Scene;
    private active: boolean = true;
    private lifetime: number = 0.2; // Very quick swipe
    private elapsed: number = 0;
    public x: number;
    public y: number;
    public radius: number;
    public angle: number; // Center angle
    public coneAngle: number; // Spread
    public options: CleaveOptions;
    public hitEnemies: Set<number> = new Set();

    constructor(scene: Scene, x: number, y: number, targetX: number, targetY: number, damage: number, radius: number = 150, coneAngle: number = Math.PI / 2, options: CleaveOptions = {}) {
        this.scene = scene;
        this.damage = damage;
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.coneAngle = coneAngle;
        this.options = options;
        
        const dx = targetX - x;
        const dy = targetY - y;
        this.angle = Math.atan2(dy, dx);
        
        // Visuals
        this.sprite = scene.add.graphics();
        let color = 0xffaa00; // Gold/Orange
        if (this.options.lifesteal) color = 0xff0000; // Red tint for blood/lifesteal
        
        this.sprite.fillStyle(color, 0.6); 
        
        const startAngle = -this.coneAngle / 2;
        const endAngle = this.coneAngle / 2;
        
        this.sprite.beginPath();
        this.sprite.moveTo(0, 0);
        this.sprite.arc(0, 0, this.radius, startAngle, endAngle, false);
        this.sprite.lineTo(0, 0);
        this.sprite.closePath();
        this.sprite.fillPath();
        
        this.sprite.setPosition(x, y);
        this.sprite.setRotation(this.angle);
        this.sprite.setDepth(10);
        
        // Enable Arcade Physics
        scene.physics.add.existing(this.sprite);
        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        body.setCircle(this.radius);
        body.setOffset(-this.radius, -this.radius);
    }

    public update(deltaTime: number): void {
        if (!this.active) return;
        
        this.elapsed += deltaTime;
        
        // Fade out
        this.sprite.setAlpha(0.6 * (1 - (this.elapsed / this.lifetime)));
        
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
        const dx = px - this.x;
        const dy = py - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > this.radius) return false;
        
        const pointAngle = Math.atan2(dy, dx);
        let angleDiff = pointAngle - this.angle;
        
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        return Math.abs(angleDiff) <= this.coneAngle / 2;
    }
}

/**
 * Player Nova attack (Explosion circle) for AoE skills
 */
export class PlayerNova {
    public sprite: Phaser.GameObjects.Graphics; // Or Sprite if using explosion texture
    public damage: number;
    public scene: Scene;
    private active: boolean = true;
    private lifetime: number = 0.5;
    private elapsed: number = 0;
    public x: number;
    public y: number;
    public radius: number;
    public options: NovaOptions;
    public hitEnemies: Set<number> = new Set();

    constructor(scene: Scene, x: number, y: number, damage: number, radius: number = 120, options: NovaOptions = {}) {
        this.scene = scene;
        this.damage = damage;
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.options = options;

        // Visuals
        this.sprite = scene.add.graphics();
        let color = 0x9933ff; // Purple
        if (this.options.slow) color = 0x33ccff; // Icy Blue
        if (this.options.pull) color = 0x000000; // Dark for gravity well

        this.sprite.fillStyle(color, 0.7); 
        this.sprite.fillCircle(0, 0, radius);
        this.sprite.setPosition(x, y);
        this.sprite.setDepth(10);
        
        // Enable Arcade Physics
        scene.physics.add.existing(this.sprite);
        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        body.setCircle(this.radius);
        body.setOffset(-this.radius, -this.radius);
    }

    public update(deltaTime: number): void {
        if (!this.active) return;
        
        this.elapsed += deltaTime;
        
        // Expanding ring effect or fade
        this.sprite.setAlpha(0.7 * (1 - (this.elapsed / this.lifetime)));
        
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

    public isPointInNova(px: number, py: number): boolean {
        const dx = px - this.x;
        const dy = py - this.y;
        return (dx * dx + dy * dy) <= (this.radius * this.radius);
    }
}