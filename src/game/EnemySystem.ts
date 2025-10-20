import { Scene } from 'phaser';
import { AnimationMapper, MobAnimationSet, MOB_DEFAULT_FACING } from './config/AnimationMappings';
import { validateNoRandomSelection, getHardcodedMobSkin, getTextureKeyForMobVariant } from '../systems/HardcodedMobSkins';
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
        this.width = width;
        this.height = height;
        this.ownerRadius = enemyRadius;
        
        // Calculate angle towards player
        const dx = playerX - enemyX;
        const dy = playerY - enemyY;
        this.angle = Math.atan2(dy, dx);
        
        // Position shield closer to the enemy
        const shieldDistance = enemyRadius + (width / 4);
        this.x = enemyX + Math.cos(this.angle) * shieldDistance;
        this.y = enemyY + Math.sin(this.angle) * shieldDistance;
        
        // Create a blue shield graphic
        this.sprite = scene.add.graphics();
        this.sprite.lineStyle(5, 0x4444ff, 1);
        this.sprite.fillStyle(0x6666ff, 0.6);
        this.sprite.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
        this.sprite.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
        this.sprite.setPosition(this.x, this.y);
        this.sprite.setRotation(this.angle);
        this.sprite.setDepth(6);
    }

    public update(deltaTime: number, enemyX: number, enemyY: number): void {
        if (!this.active) return;
        
        this.elapsed += deltaTime;
        
        // Update position to follow enemy
        const shieldDistance = this.ownerRadius + (this.width / 4);
        this.x = enemyX + Math.cos(this.angle) * shieldDistance;
        this.y = enemyY + Math.sin(this.angle) * shieldDistance;
        this.sprite.setPosition(this.x, this.y);
        
        // Pulse effect
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

    public blocksProjectile(projectileX: number, projectileY: number): boolean {
        if (!this.active) return false;
        
        const dx = projectileX - this.x;
        const dy = projectileY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const blockingRadius = this.height / 2 + 35;
        
        if (distance > blockingRadius) {
            return false;
        }
        
        const projectileAngle = Math.atan2(dy, dx);
        let angleDiff = projectileAngle - this.angle;
        
        // Normalize to -PI to PI
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        const blockingAngle = Math.PI * 0.55;
        return Math.abs(angleDiff) <= blockingAngle;
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
    private lifetime: number = 0.25;
    private elapsed: number = 0;
    public x: number;
    public y: number;
    public radius: number;
    public angle: number;
    public coneAngle: number;

    constructor(scene: Scene, enemyX: number, enemyY: number, playerX: number, playerY: number, damage: number, radius: number = 150, coneAngle: number = Math.PI / 1.8) {
        this.scene = scene;
        this.damage = damage;
        this.radius = radius;
        this.coneAngle = coneAngle;
        
        // Calculate angle towards player
        const dx = playerX - enemyX;
        const dy = playerY - enemyY;
        this.angle = Math.atan2(dy, dx);
        
        // Position at enemy location
        this.x = enemyX;
        this.y = enemyY;
        
        // Create cone graphic
        this.sprite = scene.add.graphics();
        this.sprite.setPosition(this.x, this.y);
        this.sprite.setDepth(5);
        this.updateConeGraphics();
    }

    private updateConeGraphics(): void {
        this.sprite.clear();
        this.sprite.fillStyle(0xff4444, 0.4);
        this.sprite.lineStyle(3, 0xff0000, 0.8);
        
        // Draw cone
        this.sprite.beginPath();
        this.sprite.moveTo(0, 0);
        this.sprite.arc(0, 0, this.radius, this.angle - this.coneAngle / 2, this.angle + this.coneAngle / 2);
        this.sprite.closePath();
        this.sprite.fillPath();
        this.sprite.strokePath();
    }

    public update(deltaTime: number): void {
        if (!this.active) return;
        
        this.elapsed += deltaTime;
        
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
        if (!this.active) return false;
        
        const dx = px - this.x;
        const dy = py - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > this.radius) return false;
        
        const pointAngle = Math.atan2(dy, dx);
        let angleDiff = pointAngle - this.angle;
        
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        return Math.abs(angleDiff) <= this.coneAngle / 2;
    }
}

/**
 * Explosion attack for area damage
 */
export class ExplosionAttack {
    public sprite: Phaser.GameObjects.Graphics;
    public damage: number;
    public scene: Scene;
    private active: boolean = true;
    private lifetime: number = 0.4;
    private elapsed: number = 0;
    public x: number;
    public y: number;
    private maxRadius: number = 120;
    public currentRadius: number;

    constructor(scene: Scene, x: number, y: number, damage: number) {
        this.scene = scene;
        this.damage = damage;
        this.x = x;
        this.y = y;
        this.currentRadius = 0;
        
        this.sprite = scene.add.graphics();
        this.sprite.setPosition(x, y);
        this.sprite.setDepth(5);
        this.updateExplosionGraphics();
    }

    private updateExplosionGraphics(): void {
        this.sprite.clear();
        
        const progress = this.elapsed / this.lifetime;
        this.currentRadius = this.maxRadius * progress;
        
        // Outer ring
        this.sprite.lineStyle(8, 0xff4400, 1 - progress);
        this.sprite.strokeCircle(0, 0, this.currentRadius);
        
        // Inner fill
        this.sprite.fillStyle(0xff6600, (1 - progress) * 0.3);
        this.sprite.fillCircle(0, 0, this.currentRadius);
    }

    public update(deltaTime: number): void {
        if (!this.active) return;
        
        this.elapsed += deltaTime;
        this.updateExplosionGraphics();
        
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

    public isPointInExplosion(px: number, py: number): boolean {
        if (!this.active) return false;
        
        const dx = px - this.x;
        const dy = py - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance <= this.currentRadius;
    }
}

/**
 * Vortex attack that travels and slows the player
 */
export class VortexAttack {
    public sprite: Phaser.GameObjects.Graphics;
    public damage: number;
    public scene: Scene;
    private active: boolean = true;
    private travelTime: number = 1.0;
    private totalLifetime: number = 4.0;
    private elapsed: number = 0;
    public x: number;
    public y: number;
    private targetX: number;
    private targetY: number;
    private maxDistance: number = 350;
    private startRadius: number = 25;
    private maxRadius: number = 100;
    public currentRadius: number;
    private velocityX: number;
    private velocityY: number;
    private isTraveling: boolean = true;
    public slowEffect: number = 0.5;
    public slowDuration: number = 2.0;

    constructor(scene: Scene, enemyX: number, enemyY: number, playerX: number, playerY: number, damage: number, _enemyRadius: number = 40) {
        this.scene = scene;
        this.damage = damage;
        this.x = enemyX;
        this.y = enemyY;
        this.currentRadius = this.startRadius;
        
        // Calculate target position
        const dx = playerX - enemyX;
        const dy = playerY - enemyY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const normalizedDx = dx / distance;
            const normalizedDy = dy / distance;
            this.targetX = enemyX + normalizedDx * this.maxDistance;
            this.targetY = enemyY + normalizedDy * this.maxDistance;
            this.velocityX = normalizedDx * (this.maxDistance / this.travelTime);
            this.velocityY = normalizedDy * (this.maxDistance / this.travelTime);
        } else {
            this.targetX = enemyX;
            this.targetY = enemyY;
            this.velocityX = 0;
            this.velocityY = 0;
        }
        
        this.sprite = scene.add.graphics();
        this.sprite.setPosition(this.x, this.y);
        this.sprite.setDepth(5);
        this.updateVortexGraphics();
    }

    private updateVortexGraphics(): void {
        this.sprite.clear();
        
        if (this.isTraveling) {
            // Traveling phase - small purple orb
            this.sprite.fillStyle(0x8800ff, 0.8);
            this.sprite.fillCircle(0, 0, this.currentRadius);
            this.sprite.lineStyle(3, 0xaa44ff, 1);
            this.sprite.strokeCircle(0, 0, this.currentRadius);
        } else {
            // Stationary phase - swirling vortex
            const time = this.elapsed - this.travelTime;
            const rotation = time * 4;
            
            this.sprite.fillStyle(0x8800ff, 0.4);
            this.sprite.fillCircle(0, 0, this.currentRadius);
            
            // Draw spiral arms
            for (let i = 0; i < 3; i++) {
                const armAngle = rotation + (i * Math.PI * 2 / 3);
                const armLength = this.currentRadius * 0.8;
                this.sprite.lineStyle(4, 0xaa44ff, 0.8);
                this.sprite.beginPath();
                this.sprite.moveTo(0, 0);
                this.sprite.lineTo(Math.cos(armAngle) * armLength, Math.sin(armAngle) * armLength);
                this.sprite.strokePath();
            }
        }
    }

    public update(deltaTime: number): void {
        if (!this.active) return;
        
        this.elapsed += deltaTime;
        
        if (this.isTraveling && this.elapsed < this.travelTime) {
            // Move towards target
            this.x += this.velocityX * deltaTime;
            this.y += this.velocityY * deltaTime;
            this.sprite.setPosition(this.x, this.y);
        } else if (this.isTraveling) {
            // Stop traveling and expand
            this.isTraveling = false;
            this.x = this.targetX;
            this.y = this.targetY;
            this.sprite.setPosition(this.x, this.y);
        }
        
        // Update radius
        if (!this.isTraveling) {
            const expansionProgress = Math.min((this.elapsed - this.travelTime) / 1.0, 1);
            this.currentRadius = this.startRadius + (this.maxRadius - this.startRadius) * expansionProgress;
        }
        
        this.updateVortexGraphics();
        
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
        if (!this.active) return false;
        
        const dx = px - this.x;
        const dy = py - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance <= this.currentRadius;
    }
}

/**
 * Melee attack for close combat
 */
export class MeleeAttack {
    public sprite: Phaser.GameObjects.Graphics;
    public damage: number;
    public scene: Scene;
    private active: boolean = true;
    private lifetime: number = 0.3;
    private elapsed: number = 0;
    public x: number;
    public y: number;
    public width: number;
    public height: number;
    private angle: number;
    private corners: { x: number; y: number }[];

    constructor(scene: Scene, enemyX: number, enemyY: number, playerX: number, playerY: number, damage: number, enemyRadius: number = 40, width: number = 100, height: number = 60) {
        this.scene = scene;
        this.damage = damage;
        this.width = width;
        this.height = height;
        this.corners = [];
        
        // Calculate angle towards player
        const dx = playerX - enemyX;
        const dy = playerY - enemyY;
        this.angle = Math.atan2(dy, dx);
        
        // Position attack in front of enemy
        const attackDistance = enemyRadius + width / 2;
        this.x = enemyX + Math.cos(this.angle) * attackDistance;
        this.y = enemyY + Math.sin(this.angle) * attackDistance;
        
        this.sprite = scene.add.graphics();
        this.sprite.setPosition(this.x, this.y);
        this.sprite.setRotation(this.angle);
        this.sprite.setDepth(5);
        
        this.updateCorners();
        this.updateMeleeGraphics();
    }

    private updateCorners(): void {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        
        // Calculate rotated corners
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        
        this.corners = [
            { x: this.x + (-halfWidth * cos - -halfHeight * sin), y: this.y + (-halfWidth * sin + -halfHeight * cos) },
            { x: this.x + (halfWidth * cos - -halfHeight * sin), y: this.y + (halfWidth * sin + -halfHeight * cos) },
            { x: this.x + (halfWidth * cos - halfHeight * sin), y: this.y + (halfWidth * sin + halfHeight * cos) },
            { x: this.x + (-halfWidth * cos - halfHeight * sin), y: this.y + (-halfWidth * sin + halfHeight * cos) }
        ];
    }

    private updateMeleeGraphics(): void {
        this.sprite.clear();
        this.sprite.fillStyle(0xff8800, 0.6);
        this.sprite.lineStyle(3, 0xff4400, 1);
        this.sprite.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        this.sprite.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
    }

    public update(deltaTime: number): void {
        if (!this.active) return;
        
        this.elapsed += deltaTime;
        
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

    public getCorners(): { x: number; y: number }[] {
        return this.corners;
    }
}

/**
 * Interface for enemy attack results
 */
export interface EnemyAttackResult {
    type: 'projectile' | 'melee' | 'cone' | 'explosion' | 'vortex' | 'shield';
    damage: number;
    position: { x: number; y: number };
    hitPlayer: boolean;
    specialEffects?: {
        slowEffect?: number;
        slowDuration?: number;
        knockback?: { x: number; y: number };
        blocked?: boolean;
    };
    attackObject?: Projectile | MeleeAttack | ConeAttack | ExplosionAttack | VortexAttack | Shield;
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
    private mobVariant: string = '';
    private mobAnimations: MobAnimationSet;
    private aiUpdateTimer: number = 0;
    private aiUpdateInterval: number = 1/60; // Update AI at 60 FPS equivalent (16.67ms)
    
    // Attack system properties
    private lastAttackTime: number = 0;
    private attackCooldown: number = 2000; // Base cooldown in milliseconds
    private attackRange: number = 100; // Base attack range
    private isAttacking: boolean = false;

    constructor(scene: Scene, x: number, y: number, type: EnemyType) {
        this.scene = scene;
        this.type = type;
        this.stats = this.getStatsForType(type);
        this.currentHealth = this.stats.health;
        
        // Use hardcoded mob variant selection - NO RANDOMIZATION
        this.mobVariant = AnimationMapper.getHardcodedMobForEnemyType(type);
        
        // VALIDATION: Ensure no random selection occurred
        const expectedSkin = getHardcodedMobSkin(type);
        validateNoRandomSelection(this.mobVariant, expectedSkin, type);
        
        this.mobAnimations = this.createMobAnimations(this.mobVariant);
        
        // Create physics sprite using the mob texture atlas key
        const textureKey = this.mobAnimations.texture;
        this.sprite = scene.physics.add.sprite(x, y, textureKey) as Phaser.GameObjects.Sprite;
        this.sprite.setScale(this.getScaleForType(type));
        this.sprite.setData('enemy', this);
        
        // Set up physics body
        if (this.sprite.body) {
            const body = this.sprite.body as Phaser.Physics.Arcade.Body;
            body.setCollideWorldBounds(true);
            body.setSize(this.stats.size, this.stats.size);
        }

        // Initialize attack properties based on enemy type
        this.updateAttackProperties();
        
        // Start with idle animation using standardized naming
        this.playAnimation(this.getIdleAnimationKey());
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
                specialAbilities = ['melee_attack', 'charge_attack'];
                break;
            case EnemyType.GOLEM:
                baseStats = {
                    health: 250,
                    speed: 20,
                    damage: 40,
                    size: 50,
                    xpValue: 35
                };
                specialAbilities = ['armor', 'shield_ability', 'damage_resistance'];
                break;
            case EnemyType.ARCHER:
                baseStats = {
                    health: 80,
                    speed: 50,
                    damage: 35,
                    size: 30,
                    xpValue: 22
                };
                specialAbilities = ['projectile_attack', 'ranged_attack'];
                break;
            case EnemyType.GNOLL:
                baseStats = {
                    health: 60,
                    speed: 80,
                    damage: 25,
                    size: 25,
                    xpValue: 15
                };
                specialAbilities = ['hit_and_run', 'swarm_tactics'];
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
        switch (type) {
            case EnemyType.SKELETON_VIKING:
                return 0.1;
            case EnemyType.GOLEM:
                return 0.1;
            case EnemyType.ARCHER:
                return 0.1;
            case EnemyType.GNOLL:
                return 0.1;
            default:
                return 0.1;
        }
    }

    private createMobAnimations(mobVariant: string): MobAnimationSet {
        // Use AnimationMapper to get the correct animation configuration
        return AnimationMapper.getMobAnimations(mobVariant);
    }



    private playAnimation(animationName: string): void {
        if (this.currentAnimation !== animationName && this.sprite.anims) {
            if (this.scene.anims.exists(animationName)) {
            this.sprite.play(animationName, true);
            this.currentAnimation = animationName;
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
     */
    public update(playerX: number, playerY: number, deltaTime: number): void {
        if (!this.sprite.body) return;
        
        // Update AI timer
        this.aiUpdateTimer += deltaTime;
        
        // Only update AI logic at fixed intervals to ensure frame-rate independence
        if (this.aiUpdateTimer >= this.aiUpdateInterval) {
            this.aiUpdateTimer = 0; // Reset timer
            
            // Simple AI: move towards player using physics velocity
            const dx = playerX - this.sprite.x;
            const dy = playerY - this.sprite.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const body = this.sprite.body as Phaser.Physics.Arcade.Body;
            
            if (distance > 5) { // Only move if not too close
                // Normalize direction and apply speed
                const velocityX = (dx / distance) * this.stats.speed;
                const velocityY = (dy / distance) * this.stats.speed;
                
                body.setVelocity(velocityX, velocityY);
                
                // Play running animation when moving
                this.playAnimation(this.getRunningAnimationKey());
                
                // Flip sprite based on movement direction, adjusted by default facing
                const defaultFacing = (MOB_DEFAULT_FACING as any)[this.mobVariant] || 'right';
                const movingLeft = dx < 0;
                const prevFlip = (this.sprite as any).flipX;
                // If atlas faces left by default, invert flip logic
                const shouldFlip = defaultFacing === 'left' ? !movingLeft : movingLeft;
                console.debug('[FlipDebug]', { variant: this.mobVariant, defaultFacing, dx, movingLeft, shouldFlip, prevFlip });
                this.sprite.setFlipX(shouldFlip);
                console.debug('[FlipDebug] applied flipX', shouldFlip);
            } else {
                // Stop movement when close to player
                body.setVelocity(0, 0);
                // Play idle animation when not moving
                this.playAnimation(this.getIdleAnimationKey());
            }
        }
    }

    private getIdleAnimationKey(): string {
        // Use standardized animation naming: {mobVariant}_idle
        const standardizedKey = `${this.mobVariant}_idle`;
        // Fallback to hardcoded mappings if standardized key doesn't exist
        return this.scene.anims.exists(standardizedKey) ? standardizedKey : (this.mobAnimations.idle || 'mob_idle');
    }

    private getRunningAnimationKey(): string {
        // Use standardized animation naming: {mobVariant}_walk
        const standardizedKey = `${this.mobVariant}_walk`;
        // Fallback to hardcoded mappings if standardized key doesn't exist
        return this.scene.anims.exists(standardizedKey) ? standardizedKey : (this.mobAnimations.walk || 'mob_walk');
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

    /**
     * Updates attack cooldown and range based on enemy type
     */
    private updateAttackProperties(): void {
        switch (this.type) {
            case EnemyType.ARCHER:
                this.attackCooldown = 3000;
                this.attackRange = 300;
                break;
            case EnemyType.GNOLL:
                this.attackCooldown = 1000;
                this.attackRange = 80;
                break;
            case EnemyType.SKELETON_VIKING:
                this.attackCooldown = 800;
                this.attackRange = 120;
                break;
            default:
                this.attackCooldown = 2000;
                this.attackRange = 100;
                break;
        }
    }
}

export class EnemySystem {
    private scene: Scene;
    private enemies: Enemy[] = [];
    private spawnRate: number = 1.0;
    private maxEnemies: number = 50;
    private player: any;
    private xpOrbSystem: any;
    private spawnTimer: Phaser.Time.TimerEvent | null = null;
    
    // Attack object management
    private activeProjectiles: Projectile[] = [];
    private activeShields: Shield[] = [];
    private activeConeAttacks: ConeAttack[] = [];
    private activeExplosionAttacks: ExplosionAttack[] = [];
    private activeVortexAttacks: VortexAttack[] = [];
    private activeMeleeAttacks: MeleeAttack[] = [];

    constructor(scene: Scene, player?: any, xpOrbSystem?: any) {
        this.scene = scene;
        this.player = player;
        this.xpOrbSystem = xpOrbSystem;
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
     * Spawns a wave of enemies of the specified type
     * @param enemyType - Type of enemy to spawn
     * @param count - Number of enemies to spawn
     * @param location - Spawn location strategy ('near_player', 'screen_edges', 'random_ambush')
     * @param playerX - Player's X coordinate for positioning
     * @param playerY - Player's Y coordinate for positioning
     */
    public spawnWave(enemyType: EnemyType, count: number, location: string, playerX: number = 512, playerY: number = 384): void {
        if (this.enemies.length >= this.maxEnemies) {
            return; // Don't spawn if max is reached
        }

        const remainingCapacity = this.maxEnemies - this.enemies.length;
        const spawnCount = Math.min(count, remainingCapacity);

        for (let i = 0; i < spawnCount; i++) {
            const spawnPos = this.getSpawnPosition(location, playerX, playerY);
            const enemy = new Enemy(this.scene, spawnPos.x, spawnPos.y, enemyType);
            this.enemies.push(enemy);
        }
    }

    /**
     * Spawn a single enemy at a specific position
     */
    public spawnEnemyAt(enemyType: EnemyType, x: number, y: number): void {
        if (this.enemies.length >= this.maxEnemies) {
            return; // Don't spawn if max is reached
        }

        const enemy = new Enemy(this.scene, x, y, enemyType);
        this.enemies.push(enemy);
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
        // Update enemies and handle their attacks
        this.enemies.forEach(enemy => {
            enemy.update(playerX, playerY, deltaTime);
            
            // Check if enemy can attack and attempt attack
            if (enemy.canAttack(playerX, playerY)) {
                const attackResult = enemy.attemptAttack(playerX, playerY);
                if (attackResult && attackResult.attackObject) {
                    this.addAttackObject(attackResult);
                }
            }
        });
        
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
     * Adds an attack object to the appropriate array based on its type
     * @param attackResult - The attack result containing the attack object
     */
    private addAttackObject(attackResult: EnemyAttackResult): void {
        if (!attackResult.attackObject) return;

        switch (attackResult.type) {
            case 'projectile':
                this.activeProjectiles.push(attackResult.attackObject as Projectile);
                break;
            case 'shield':
                this.activeShields.push(attackResult.attackObject as Shield);
                break;
            case 'cone':
                this.activeConeAttacks.push(attackResult.attackObject as ConeAttack);
                break;
            case 'explosion':
                this.activeExplosionAttacks.push(attackResult.attackObject as ExplosionAttack);
                break;
            case 'vortex':
                this.activeVortexAttacks.push(attackResult.attackObject as VortexAttack);
                break;
            case 'melee':
                this.activeMeleeAttacks.push(attackResult.attackObject as MeleeAttack);
                break;
        }
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
    } {
        return {
            projectiles: this.activeProjectiles,
            shields: this.activeShields,
            coneAttacks: this.activeConeAttacks,
            explosionAttacks: this.activeExplosionAttacks,
            vortexAttacks: this.activeVortexAttacks,
            meleeAttacks: this.activeMeleeAttacks
        };
    }

    /**
     * Clears all active attack objects
     */
    public clearAllAttacks(): void {
        // Destroy all attack objects
        [...this.activeProjectiles, ...this.activeShields, ...this.activeConeAttacks,
         ...this.activeExplosionAttacks, ...this.activeVortexAttacks, ...this.activeMeleeAttacks]
            .forEach(attack => attack.destroy());

        // Clear arrays
        this.activeProjectiles = [];
        this.activeShields = [];
        this.activeConeAttacks = [];
        this.activeExplosionAttacks = [];
        this.activeVortexAttacks = [];
        this.activeMeleeAttacks = [];
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
     * Destroys all enemies and clears the enemy array
     */
    public clearAllEnemies(): void {
        this.enemies.forEach(enemy => enemy.destroy());
        this.enemies = [];
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

    /**
     * Gets all active projectiles for collision detection
     * @returns Array of active projectiles
     */
    public getProjectiles(): Projectile[] {
        return this.activeProjectiles;
    }

    /**
     * Gets all active melee attacks for collision detection
     * @returns Array of active melee attacks
     */
    public getMeleeAttacks(): MeleeAttack[] {
        return this.activeMeleeAttacks;
    }

    /**
     * Gets all active cone attacks for collision detection
     * @returns Array of active cone attacks
     */
    public getConeAttacks(): ConeAttack[] {
        return this.activeConeAttacks;
    }

    /**
     * Gets all active vortex attacks for collision detection
     * @returns Array of active vortex attacks
     */
    public getVortexAttacks(): VortexAttack[] {
        return this.activeVortexAttacks;
    }

    /**
     * Gets all active explosion attacks for collision detection
     * @returns Array of active explosion attacks
     */
    public getExplosionAttacks(): ExplosionAttack[] {
        return this.activeExplosionAttacks;
    }

}


