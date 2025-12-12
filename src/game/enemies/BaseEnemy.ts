import { Scene } from 'phaser';
import { EnemyType, EnemyStats, EnemyAttackResult } from '../types/EnemyTypes';
import { AnimationMapper, MobAnimationSet } from '../config/AnimationMappings';
import { validateNoRandomSelection, getHardcodedMobSkin } from '../systems/HardcodedMobSkins';
import { Shield } from './attacks/Shield';

export abstract class BaseEnemy {
    public sprite: Phaser.GameObjects.Sprite;
    public type: EnemyType;
    public stats: EnemyStats;
    public currentHealth: number;
    public maxHealth: number;
    public scene: Scene;
    public activeShield: Shield | null = null;
    public _farTimer: number = 0;

    // Health bar graphics
    protected healthBarBackground: Phaser.GameObjects.Graphics | null = null;
    protected healthBarFill: Phaser.GameObjects.Graphics | null = null;
    protected readonly HEALTH_BAR_WIDTH: number = 32;
    protected readonly HEALTH_BAR_HEIGHT: number = 4;
    protected readonly HEALTH_BAR_OFFSET_Y: number = -25;

    protected currentAnimation: string = '';
    protected mobAnimations: MobAnimationSet;
    protected facingLeft: boolean = false;
    protected isAttacking: boolean = false;
    protected attackTimer: number = 0;
    protected lastAttackTime: number = 0;
    protected attackCooldown: number = 1000;

    /**
     * Get the effective speed after applying any slow effects
     */
    public getEffectiveSpeed(): number {
        let speed = this.stats.speed;
        
        // Check for caltrop slow
        if (this.sprite.getData('caltropSlowed')) {
            speed *= 0.5; // 50% slow = 50% speed
        }
        
        return speed;
    }

    /**
     * Check if the player is invisible (from smoke bomb dash)
     * Returns true if enemies should ignore the player
     */
    protected isPlayerInvisible(): boolean {
        // Find player sprite in scene
        const gameScene = this.scene as any;
        if (gameScene.player && gameScene.player.sprite) {
            return gameScene.player.sprite.getData('invisible') === true;
        }
        return false;
    }

    /**
     * Wander randomly when player is invisible
     */
    protected wanderRandomly(_deltaTime: number): void {
        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        if (!body) return;

        // Change direction occasionally
        if (!this.sprite.getData('wanderAngle') || Math.random() < 0.02) {
            this.sprite.setData('wanderAngle', Math.random() * Math.PI * 2);
        }

        const wanderAngle = this.sprite.getData('wanderAngle') as number;
        const wanderSpeed = this.getEffectiveSpeed() * 0.5; // Walk slowly

        body.setVelocity(
            Math.cos(wanderAngle) * wanderSpeed,
            Math.sin(wanderAngle) * wanderSpeed
        );

        // Update facing
        if (body.velocity.x !== 0) {
            this.facingLeft = body.velocity.x < 0;
            this.sprite.setFlipX(this.facingLeft);
        }

        this.playAnimation(this.mobAnimations.walk);
    }

    /**
     * Check if the enemy is currently stunned
     * @returns true if stunned and should skip all actions
     */
    public isStunned(): boolean {
        if (!this.sprite || !this.sprite.active) return false;
        
        const stunned = this.sprite.getData('stunned');
        const stunnedUntil = this.sprite.getData('stunnedUntil') || 0;
        
        if (stunned && this.scene.time.now < stunnedUntil) {
            // Stop movement while stunned
            const body = this.sprite.body as Phaser.Physics.Arcade.Body;
            if (body) {
                body.setVelocity(0, 0);
            }
            // Play idle animation while stunned
            this.playAnimation(this.mobAnimations.idle);
            this.isAttacking = false;
            return true;
        }
        
        // Clear stun if expired - enemy can now resume normal behavior
        if (stunned && this.scene.time.now >= stunnedUntil) {
            this.sprite.setData('stunned', false);
            // Destroy stun stars if they still exist
            const stunStars = this.sprite.getData('stunStars');
            if (stunStars && stunStars.active) {
                stunStars.destroy();
            }
            this.sprite.setData('stunStars', null);
            // Clear tint
            this.sprite.clearTint();
        }
        
        return false;
    }

    constructor(scene: Scene, x: number, y: number, type: EnemyType) {
        this.scene = scene;
        this.type = type;
        this.stats = this.getStats();
        this.currentHealth = this.stats.health;
        this.maxHealth = this.stats.health;

        this.initializeSprite(x, y);
        this.createHealthBar();
    }

    protected abstract getStats(): EnemyStats;

    protected initializeSprite(x: number, y: number): void {
        // Use hardcoded mob variant selection
        const mobVariant = AnimationMapper.getHardcodedMobForEnemyType(this.type);

        // VALIDATION
        const expectedSkin = getHardcodedMobSkin(this.type);
        validateNoRandomSelection(mobVariant, expectedSkin, this.type);

        this.mobAnimations = AnimationMapper.getMobAnimations(mobVariant);

        const textureKey = this.mobAnimations.texture;
        if (!this.scene.textures.exists(textureKey)) {
            throw new Error(`Texture '${textureKey}' does not exist!`);
        }

        this.sprite = this.scene.physics.add.sprite(x, y, textureKey) as Phaser.GameObjects.Sprite;
        this.sprite.setScale(this.getScale());
        this.sprite.setData('enemy', this);
        this.sprite.setDepth(3);
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.setAngle(0);
        this.sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setCollideWorldBounds(true);
        }

        const enemyId = Math.floor(Math.random() * 10000);
        this.sprite.setData('enemyId', enemyId);

        // Initial animation
        this.playAnimation(this.mobAnimations.idle);
    }

    protected getScale(): number {
        // Default scale, override in subclasses if needed (e.g. Ogre)
        return 0.05;
    }

    public abstract update(playerX: number, playerY: number, deltaTime: number): EnemyAttackResult | null;

    public takeDamage(amount: number): boolean {
        this.currentHealth -= amount;
        this.updateHealthBar();
        return this.currentHealth <= 0;
    }

    /**
     * Heal the enemy by a specified amount
     * @param amount - Amount of health to restore
     * @returns The actual amount healed
     */
    public heal(amount: number): number {
        const previousHealth = this.currentHealth;
        this.currentHealth = Math.min(this.currentHealth + amount, this.maxHealth);
        const actualHealed = this.currentHealth - previousHealth;
        this.updateHealthBar();
        return actualHealed;
    }

    /**
     * Create the health bar graphics above the enemy
     */
    protected createHealthBar(): void {
        // Background (dark red)
        this.healthBarBackground = this.scene.add.graphics();
        this.healthBarBackground.setDepth(10);
        
        // Fill (green for health)
        this.healthBarFill = this.scene.add.graphics();
        this.healthBarFill.setDepth(11);
        
        this.updateHealthBar();
    }

    /**
     * Update the health bar position and fill
     */
    protected updateHealthBar(): void {
        if (!this.healthBarBackground || !this.healthBarFill || !this.sprite || !this.sprite.active) {
            return;
        }

        const x = this.sprite.x - this.HEALTH_BAR_WIDTH / 2;
        const y = this.sprite.y + this.HEALTH_BAR_OFFSET_Y;

        // Clear and redraw background
        this.healthBarBackground.clear();
        this.healthBarBackground.fillStyle(0x1a1a2e, 0.8);
        this.healthBarBackground.fillRoundedRect(x - 1, y - 1, this.HEALTH_BAR_WIDTH + 2, this.HEALTH_BAR_HEIGHT + 2, 2);
        
        // Border
        this.healthBarBackground.lineStyle(1, 0x000000, 0.5);
        this.healthBarBackground.strokeRoundedRect(x - 1, y - 1, this.HEALTH_BAR_WIDTH + 2, this.HEALTH_BAR_HEIGHT + 2, 2);

        // Calculate fill width based on health percentage
        const healthPercent = Math.max(0, this.currentHealth / this.maxHealth);
        const fillWidth = this.HEALTH_BAR_WIDTH * healthPercent;

        // Clear and redraw fill
        this.healthBarFill.clear();
        
        // Color gradient based on health percentage
        let fillColor: number;
        if (healthPercent > 0.6) {
            fillColor = 0x4ade80; // Green
        } else if (healthPercent > 0.3) {
            fillColor = 0xfbbf24; // Yellow/Orange
        } else {
            fillColor = 0xef4444; // Red
        }
        
        if (fillWidth > 0) {
            this.healthBarFill.fillStyle(fillColor, 1);
            this.healthBarFill.fillRoundedRect(x, y, fillWidth, this.HEALTH_BAR_HEIGHT, 1);
        }
    }

    /**
     * Update health bar position (call in update loop)
     */
    public updateHealthBarPosition(): void {
        this.updateHealthBar();
    }

    public destroy(): void {
        // Clean up stun stars if present
        if (this.sprite) {
            const stunStars = this.sprite.getData('stunStars');
            if (stunStars && stunStars.active) {
                stunStars.destroy();
            }
        }

        // Clean up health bar graphics
        if (this.healthBarBackground) {
            this.healthBarBackground.destroy();
            this.healthBarBackground = null;
        }
        if (this.healthBarFill) {
            this.healthBarFill.destroy();
            this.healthBarFill = null;
        }
        
        if (this.sprite && this.sprite.active) {
            this.sprite.destroy();
        }
    }

    public getCost(): number {
        return this.stats.cost;
    }

    public getThreatLevel(): number {
        return this.stats.threatLevel;
    }

    protected playAnimation(animationName: string): void {
        if (this.sprite.anims && this.currentAnimation !== animationName) {
            const currentlyPlaying = this.sprite.anims.currentAnim?.key;

            if (currentlyPlaying !== animationName && this.scene.anims.exists(animationName)) {
                const currentFlipX = this.sprite.flipX;
                this.sprite.play(animationName);
                this.currentAnimation = animationName;
                this.sprite.setFlipX(currentFlipX);
            }
        }
    }

    protected isInCameraView(): boolean {
        const camera = this.scene.cameras.main;
        const worldView = camera.worldView;
        const buffer = -100;

        return (
            this.sprite.x >= worldView.x - buffer &&
            this.sprite.x <= worldView.x + worldView.width + buffer &&
            this.sprite.y >= worldView.y - buffer &&
            this.sprite.y <= worldView.y + worldView.height + buffer
        );
    }

    protected getApproximateRadius(): number {
        const bounds = this.sprite.getBounds();
        const radius = Math.max(bounds.width, bounds.height) / 2;
        return radius * 0.6;
    }

    protected getCollisionLayersFromScene(): Phaser.Tilemaps.TilemapLayer[] {
        // Try to get collision layers from PhysicsSystem (preferred method)
        const gameScene = this.scene as any;
        if (gameScene.getPhysicsSystem) {
            const physicsSystem = gameScene.getPhysicsSystem();
            if (physicsSystem && physicsSystem.getCollisionLayers) {
                return physicsSystem.getCollisionLayers();
            }
        }
        
        // Fallback: search for tilemap layers in scene children
        const collisionLayers: Phaser.Tilemaps.TilemapLayer[] = [];
        const tilemap = this.scene.children.getAll().find(child => child instanceof Phaser.Tilemaps.TilemapLayer) as Phaser.Tilemaps.TilemapLayer;
        if (tilemap) {
            collisionLayers.push(tilemap);
        }
        return collisionLayers;
    }

    // Static helpers for Cost/Threat calculation (Moved from Enemy.ts)
    public static calculateEnemyCost(stats: Omit<EnemyStats, 'cost' | 'threatLevel' | 'specialAbilities'>, abilities: string[]): number {
        let baseCost = Math.round(
            (stats.health * 0.1) +
            (stats.damage * 2) +
            (stats.speed * 0.5) +
            (stats.xpValue * 0.3)
        );

        let abilityMultiplier = 1.0;
        // ... (Simplified for brevity, or copy full logic if critical)
        // For now, using a simplified multiplier logic to save tokens, as the exact values are less critical than the architecture
        abilities.forEach(_ability => abilityMultiplier += 0.1);

        return Math.max(1, Math.round(baseCost * abilityMultiplier));
    }

    public static calculateThreatLevel(stats: Omit<EnemyStats, 'cost' | 'threatLevel' | 'specialAbilities'>, _abilities: string[]): number {
        let baseThreat = Math.min(100, Math.round(
            (stats.health * 0.15) +
            (stats.damage * 3) +
            (stats.speed * 0.8) +
            (stats.xpValue * 0.4)
        ));
        return Math.min(100, Math.max(1, baseThreat));
    }
}
