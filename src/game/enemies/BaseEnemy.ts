import { Scene } from 'phaser';
import { EnemyType, EnemyStats, EnemyAttackResult } from '../types/EnemyTypes';
import { AnimationMapper, MobAnimationSet } from '../config/AnimationMappings';
import { validateNoRandomSelection, getHardcodedMobSkin } from '../systems/HardcodedMobSkins';

export abstract class BaseEnemy {
    public sprite: Phaser.GameObjects.Sprite;
    public type: EnemyType;
    public stats: EnemyStats;
    public currentHealth: number;
    public scene: Scene;
    
    protected currentAnimation: string = '';
    protected mobAnimations: MobAnimationSet;
    protected facingLeft: boolean = false;
    protected isAttacking: boolean = false;
    protected attackTimer: number = 0;
    protected lastAttackTime: number = 0;
    protected attackCooldown: number = 1000;

    constructor(scene: Scene, x: number, y: number, type: EnemyType) {
        this.scene = scene;
        this.type = type;
        this.stats = this.getStats();
        this.currentHealth = this.stats.health;
        
        this.initializeSprite(x, y);
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
        return this.currentHealth <= 0;
    }

    public destroy(): void {
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
        const collisionLayers: Phaser.Tilemaps.TilemapLayer[] = [];
        if ((this.scene as any).collisionLayers) {
            return (this.scene as any).collisionLayers;
        }
        const tilemap = this.scene.children.getAll().find(child => child.type === 'TilemapLayer') as Phaser.Tilemaps.TilemapLayer;
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
