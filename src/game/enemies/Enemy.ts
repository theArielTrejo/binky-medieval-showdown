import { Scene } from 'phaser';
import { EnemyType, EnemyStats, EnemyAttackResult } from '../types/EnemyTypes';
import { validateNoRandomSelection, getHardcodedMobSkin } from '../systems/HardcodedMobSkins';
import { AnimationMapper, MobAnimationSet } from '../config/AnimationMappings';
import { Shield } from './attacks/Shield';
import { ConeAttack } from './attacks/ConeAttack';
import { ExplosionAttack } from './attacks/ExplosionAttack';
import { VortexAttack } from './attacks/VortexAttack';
import { LightningStrikeAttack } from './attacks/LightningStrikeAttack';
import { MeleeAttack } from './attacks/MeleeAttack';
import { ArrowIndicator } from './attacks/ArrowIndicator';
import { EnemyProjectile } from './attacks/EnemyProjectile';
import { ArrowProjectile } from './attacks/ArrowProjectile';
import { ClawAttack } from './attacks/ClawAttack';

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
    
    // Archer-specific properties
    private isChargingArrow: boolean = false; // Track if archer is drawing back arrow
    private arrowChargeTime: number = 0; // How long the arrow has been charging
    private arrowChargeDuration: number = 1.5; // How long to charge before releasing (seconds)
    private lockedArrowAngle: number = 0; // Locked direction for the arrow
    private activeArrowIndicator: ArrowIndicator | null = null; // Visual indicator for arrow path

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
            
            // Add animation complete listener for ogre attack animation
            if (type === EnemyType.OGRE) {
                this.sprite.on('animationcomplete', (anim: Phaser.Animations.Animation) => {
                    if (anim.key === 'ogre_attacking') {
                        // Return to walking animation after attack completes
                        if (this.sprite.anims) {
                            this.sprite.play('ogre_walking');
                        }
                    }
                });
                // Set slower attack interval for ogre (heavy, powerful attacks)
                this.meleeAttackInterval = 2.5; // Attack every 2.5 seconds (much slower than default 0.8)
                // Set longer attack duration to keep ogre locked during entire attack + bone slam
                this.attackDuration = 1.1; // 0.8s attack animation + 0.3s bone slam effect
            }
            
            // Set attack range based on enemy type
            // All ranges now use the dynamic sprite radius from getApproximateRadius()
            if (type === EnemyType.ARCHER) {
                this.attackRange = 350; // Ranged attack
            } else if (type === EnemyType.OGRE) {
                // Ogre melee attack range: stop when the attack hitbox would reach the player
                // Attack extends from sprite edge (radius) + attack width (100)
                const spriteRadius = this.getApproximateRadius();
                this.attackRange = spriteRadius + 100 + 20; // radius + attack width + small buffer
            } else if (type === EnemyType.SKELETON_VIKING) {
                this.attackRange = 100; // Close range for cone attack
            } else if (type === EnemyType.SKELETON_PIRATE) {
                this.attackRange = 600; // Vortex range (long range to make dodging easier)
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
            case EnemyType.OGRE:
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
        const cost = Enemy.calculateEnemyCost(baseStats, specialAbilities);
        const threatLevel = Enemy.calculateThreatLevel(baseStats, specialAbilities);
        
        return {
            ...baseStats,
            cost,
            threatLevel,
            specialAbilities
        };
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

    private getScaleForType(type: EnemyType): number {
        // All enemies scaled to match player size (0.05)
        switch (type) {
            case EnemyType.SKELETON_VIKING:
                return 0.05;
            case EnemyType.OGRE:
                return 0.12; // Larger than other enemies
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

    private getCollisionLayersFromScene(): Phaser.Tilemaps.TilemapLayer[] {
        // Try to get collision layers from the scene's data
        const collisionLayers: Phaser.Tilemaps.TilemapLayer[] = [];
        
        // Check if scene has collisionLayers stored
        if ((this.scene as any).collisionLayers) {
            return (this.scene as any).collisionLayers;
        }
        
        // Fallback: try to find collision layers by name
        const tilemap = this.scene.children.getAll().find(child => child.type === 'TilemapLayer') as Phaser.Tilemaps.TilemapLayer;
        if (tilemap) {
            collisionLayers.push(tilemap);
        }
        
        return collisionLayers;
    }

    private calculateArrowEndpoint(startX: number, startY: number, angle: number): { endX: number; endY: number } {
        const maxDistance = 1000;
        const step = 10; // Check every 10 pixels
        const collisionLayers = this.getCollisionLayersFromScene();
        
        // Raycast along the arrow path to find where it hits a wall
        for (let dist = step; dist < maxDistance; dist += step) {
            const checkX = startX + Math.cos(angle) * dist;
            const checkY = startY + Math.sin(angle) * dist;
            
            // Check collision with tilemap layers
            for (const layer of collisionLayers) {
                const tile = layer.getTileAtWorldXY(checkX, checkY);
                if (tile && tile.collides) {
                    return { endX: checkX, endY: checkY };
                }
            }
            
            // Check if out of bounds
            if (checkX < 0 || checkX > 4096 || checkY < 0 || checkY > 4096) {
                return { endX: checkX, endY: checkY };
            }
        }
        
        // No wall hit, return max distance endpoint
        return {
            endX: startX + Math.cos(angle) * maxDistance,
            endY: startY + Math.sin(angle) * maxDistance
        };
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
            // Defer destruction to update loop to allow for XP spawning
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
        // Archer behavior - charge arrow attack with locked direction
        else if (this.type === EnemyType.ARCHER) {
            const optimalRange = 300; // Preferred shooting distance
            const minRange = 150; // Minimum distance to maintain (kite away if closer)
            const inCameraView = this.isInCameraView();
            const body = this.sprite.body as Phaser.Physics.Arcade.Body;
            
            // If charging arrow, stay locked and update charge
            if (this.isChargingArrow) {
                // Lock position - no movement
                if (body) body.setVelocity(0, 0);
                this.playAnimation(this.mobAnimations.idle);
                
                // Update arrow indicator
                if (this.activeArrowIndicator) {
                    this.activeArrowIndicator.update(deltaTime);
                }
                
                // Update charge time
                this.arrowChargeTime += deltaTime;
                
                // Release arrow when charge is complete
                if (this.arrowChargeTime >= this.arrowChargeDuration) {
                    // Destroy the indicator
                    if (this.activeArrowIndicator) {
                        this.activeArrowIndicator.destroy();
                        this.activeArrowIndicator = null;
                    }
                    
                    // Get collision layers from scene
                    const collisionLayers = this.getCollisionLayersFromScene();
                    
                    // Create arrow projectile
                    const arrow = new ArrowProjectile(
                        this.scene,
                        this.sprite.x,
                        this.sprite.y,
                        this.lockedArrowAngle,
                        this.stats.damage,
                        collisionLayers,
                        600 // High speed
                    );
                    
                    // Reset charging state
                    this.isChargingArrow = false;
                    this.arrowChargeTime = 0;
                    this.shootCooldown = this.shootInterval;
                    
                    return { type: 'arrow', damage: this.stats.damage, position: { x: this.sprite.x, y: this.sprite.y }, hitPlayer: false, attackObject: arrow };
                }
            }
            // Not charging - handle movement and positioning (same pattern as skeleton pirate)
            else {
                // Movement logic - try to maintain optimal range and stay in camera view
                if (!inCameraView || distance > optimalRange) {
                    // Not in camera view or too far - move towards player
                    const velocityX = (dx / distance) * this.stats.speed;
                    const velocityY = (dy / distance) * this.stats.speed;
                    if (body) body.setVelocity(velocityX, velocityY);
                    this.playAnimation(this.mobAnimations.walk);
                } else if (distance < minRange) {
                    // Too close - kite away
                    const velocityX = -(dx / distance) * this.stats.speed;
                    const velocityY = -(dy / distance) * this.stats.speed;
                    if (body) body.setVelocity(velocityX, velocityY);
                    this.playAnimation(this.mobAnimations.walk);
                } else {
                    // In optimal range (150-300 pixels) - stop and idle
                    if (body) body.setVelocity(0, 0);
                    this.playAnimation(this.mobAnimations.idle);
                }
                
                // Attack logic - can start charging arrow when in camera view and cooldown ready
                if (inCameraView && this.shootCooldown <= 0) {
                    this.isChargingArrow = true;
                    this.arrowChargeTime = 0;
                    
                    // Lock the arrow direction
                    this.lockedArrowAngle = Math.atan2(dy, dx);
                    
                    // Calculate endpoint for indicator (raycast to find wall or max distance)
                    const { endX, endY } = this.calculateArrowEndpoint(
                        this.sprite.x,
                        this.sprite.y,
                        this.lockedArrowAngle
                    );
                    
                        // Create visual indicator
                        this.activeArrowIndicator = new ArrowIndicator(
                            this.scene,
                            this.sprite.x,
                            this.sprite.y,
                            endX,
                            endY
                        );
                }
            }
        }
        // Ogre behavior - walk up and melee attack
        else if (this.type === EnemyType.OGRE) {
            if (this.isAttacking) {
                // Keep attack animation playing (no need to retrigger, already playing)
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
                    const meleeAttack = new MeleeAttack(this.scene, this.sprite.x, this.sprite.y, playerX, playerY, this.stats.damage, enemyRadius, 100, 60, EnemyType.OGRE);
                    // Trigger attack animation
                    if (this.sprite.anims) {
                        this.sprite.play('ogre_attacking');
                    }
                    console.log(`Enemy #${this.sprite.getData('enemyId')} (OGRE) creating MELEE ATTACK with Bone Slam effect`);
                    return { type: 'melee', damage: this.stats.damage, position: { x: this.sprite.x, y: this.sprite.y }, hitPlayer: false, attackObject: meleeAttack };
                }
            }
        }
        // Skeleton Pirate behavior - vortex attacks at range
        else if (this.type === EnemyType.SKELETON_PIRATE) {
            const optimalRange = 600; // Preferred casting distance (far away for easier dodging)
            const minRange = 300; // Minimum distance to maintain (stay far from player)
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
        // Clean up arrow indicator if archer is charging
        if (this.activeArrowIndicator) {
            this.activeArrowIndicator.destroy();
            this.activeArrowIndicator = null;
        }
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
        this.scene.time.delayedCall(500, () => {
            this.isAttacking = false;
        });

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
        const projectile = new EnemyProjectile(
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
