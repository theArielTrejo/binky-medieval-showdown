import { Scene } from 'phaser';
import { AnimationMapper, MobAnimationSet } from './config/AnimationMappings';
import { validateNoRandomSelection, getHardcodedMobSkin } from '../systems/HardcodedMobSkins.js';
import { EnemyType } from './types/EnemyTypes';
import { Shield } from './enemies/attacks/Shield';
import { ConeAttack } from './enemies/attacks/ConeAttack';
import { SpearAttack } from './enemies/attacks/SpearAttack';
import { ExplosionAttack } from './enemies/attacks/ExplosionAttack';
import { VortexAttack } from './enemies/attacks/VortexAttack';
import { LightningStrikeAttack } from './enemies/attacks/LightningStrikeAttack';
import { MeleeAttack } from './enemies/attacks/MeleeAttack';
import { ArrowIndicator } from './enemies/attacks/ArrowIndicator';
import { EnemyProjectile } from './enemies/attacks/EnemyProjectile';
import { ArrowProjectile } from './enemies/attacks/ArrowProjectile';
import { ClawAttack } from './enemies/attacks/ClawAttack';

// Re-export EnemyType for backward compatibility
export { EnemyType };





















/**
 * Interface for enemy attack results
 */
export interface EnemyAttackResult {
    type: 'projectile' | 'melee' | 'cone' | 'spear' | 'explosion' | 'vortex' | 'shield' | 'lightning' | 'claw' | 'arrow';
    damage: number;
    position: { x: number; y: number };
    hitPlayer: boolean;
    specialEffects?: {
        slowEffect?: number;
        slowDuration?: number;
        knockback?: { x: number; y: number };
        blocked?: boolean;
    };
    attackObject?: EnemyProjectile | MeleeAttack | ConeAttack | SpearAttack | ExplosionAttack | VortexAttack | Shield | LightningStrikeAttack | ClawAttack | ArrowProjectile;
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
    
    // Skeleton Viking spear throwing state
    private isThrowingSpear: boolean = false; // Track if Viking is in throwing animation
    private throwAnimationTimer: number = 0; // Timer for throwing animation
    private throwAnimationDuration: number = 0.5; // Duration of throwing animation (12 frames at 24fps)
    
    // Skeleton Pirate slashing state
    private isSlashing: boolean = false; // Track if Pirate is in slashing animation
    private slashAnimationTimer: number = 0; // Timer for slashing animation
    private slashAnimationDuration: number = 0.275; // Spawn vortex ~3 frames before animation ends (12 frames at 24fps = 0.5s)
    private postAttackIdleTimer: number = 0; // Brief idle period after attacking to prevent animation jerk
    private lastAttackTime: number = 0;
    private attackCooldown: number = 1000;
    private facingLeft: boolean = false; // Track current facing direction
    
    // Gnoll-specific properties
    private gnollIsThrowing: boolean = false; // Track if Gnoll is in throwing animation
    private gnollThrowTimer: number = 0; // Timer for throwing animation
    private gnollThrowDuration: number = 0.6; // Duration of throwing animation (12 frames at 20fps)
    private gnollClawSpawned: boolean = false; // Track if claw attack has been spawned this cycle
    
    // Archer-specific properties
    private isChargingArrow: boolean = false; // Track if archer is drawing back arrow
    private arrowChargeTime: number = 0; // How long the arrow has been charging
    private arrowChargeDuration: number = 1.5; // How long to charge before releasing (seconds)
    private lockedArrowAngle: number = 0; // Locked direction for the arrow
    private activeArrowIndicator: ArrowIndicator | null = null; // Visual indicator for arrow path
    private archerDrawAnimPlayed: boolean = false; // Track if draw animation has finished
    private archerIsReleasing: boolean = false; // Track if playing release animation
    private archerReleaseTimer: number = 0; // Timer for release animation
    private arrowTipStar: Phaser.GameObjects.Graphics | null = null; // Visual star at arrow tip
    
    // Lightning Mage-specific properties
    private lightningMageIsSlashing: boolean = false; // Track if Lightning Mage is in slashing animation
    private lightningMageSlashTimer: number = 0; // Timer for slashing animation
    private lightningMageSlashDuration: number = 0.75; // Duration of slashing animation (12 frames at 16fps)
    private lightningMageStrikeSpawned: boolean = false; // Track if lightning strike has been spawned this cycle

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
                specialAbilities = ['shield', 'spear_attack'];
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
        
        // Track facing direction and flip sprite (only if not in any attack/animation state)
        // Use a deadzone to prevent rapid flipping when player is nearly centered
        if (!this.isAttacking && !this.isSlashing && !this.isChargingArrow && !this.archerIsReleasing && !this.isThrowingSpear && !this.gnollIsThrowing && !this.lightningMageIsSlashing) {
            const flipDeadzone = 20; // Don't flip if player is within 20px horizontally
            if (Math.abs(dx) > flipDeadzone) {
                const shouldFaceLeft = dx < 0;
                if (shouldFaceLeft !== this.facingLeft) {
                    this.facingLeft = shouldFaceLeft;
                    this.sprite.setFlipX(this.facingLeft);
                }
            }
        }
        
        // Skeleton Viking behavior - shield at range, spear attack up close
        if (this.type === EnemyType.SKELETON_VIKING) {
            const closeRange = 80; // Matches spear damage range (~70 length)
            
            // Check if in throwing animation first (highest priority)
            if (this.isThrowingSpear) {
                // Currently in throwing animation, wait for it to complete
                this.throwAnimationTimer += deltaTime;
                const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                if (body) body.setVelocity(0, 0);
                
                if (this.throwAnimationTimer >= this.throwAnimationDuration) {
                    // Throwing animation complete, spawn the spear
                    this.isThrowingSpear = false;
                    this.throwAnimationTimer = 0;
                    this.isAttacking = false;
                    const enemyRadius = this.getApproximateRadius();
                    const spearAttack = new SpearAttack(this.scene, this.sprite.x, this.sprite.y, playerX, playerY, this.stats.damage, enemyRadius);
                    return { type: 'spear', damage: this.stats.damage, position: { x: this.sprite.x, y: this.sprite.y }, hitPlayer: false, attackObject: spearAttack };
                }
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
                    // Pass player position for 360-degree shield orientation
                    const shield = new Shield(this.scene, this.sprite.x, this.sprite.y, playerX, playerY, enemyRadius);
                    return { type: 'shield', damage: 0, position: { x: this.sprite.x, y: this.sprite.y }, hitPlayer: false, attackObject: shield };
                }
            } else {
                // Close range - spear attack
                // Stop movement when in close range
                const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                if (body) body.setVelocity(0, 0);
                
                if (this.coneAttackCooldown <= 0) {
                    // Start throwing animation
                    this.coneAttackCooldown = this.coneAttackInterval;
                    this.isAttacking = true;
                    this.isThrowingSpear = true;
                    this.throwAnimationTimer = 0;
                    // Play the throwing animation
                    if (this.scene.anims.exists('skeleton_viking_throwing')) {
                        this.sprite.play('skeleton_viking_throwing', true);
                    }
                } else {
                    // Not attacking, play idle
                    this.playAnimation(this.mobAnimations.idle);
                }
            }
        }
        // Archer behavior - charge arrow attack with locked direction
        else if (this.type === EnemyType.ARCHER) {
            const optimalRange = 300; // Preferred shooting distance
            const minRange = 150; // Minimum distance to maintain (kite away if closer)
            const inCameraView = this.isInCameraView();
            const body = this.sprite.body as Phaser.Physics.Arcade.Body;
            const drawAnimDuration = 0.33; // 4 frames at 12fps
            const releaseAnimDuration = 0.31; // 5 frames at 16fps
            
            // State 1: Playing release animation after arrow is shot
            if (this.archerIsReleasing) {
                if (body) body.setVelocity(0, 0);
                this.archerReleaseTimer += deltaTime;
                
                if (this.archerReleaseTimer >= releaseAnimDuration) {
                    // Release animation done, go back to normal
                    this.archerIsReleasing = false;
                    this.archerReleaseTimer = 0;
                }
                return null;
            }
            
            // State 2: Charging arrow (drawing bow)
            if (this.isChargingArrow) {
                if (body) body.setVelocity(0, 0);
                
                // Update arrow indicator
                if (this.activeArrowIndicator) {
                    this.activeArrowIndicator.update(deltaTime);
                }
                
                // Update charge time
                this.arrowChargeTime += deltaTime;
                
                // Play draw animation at start, then hold at frame 003
                if (!this.archerDrawAnimPlayed) {
                    if (this.arrowChargeTime < drawAnimDuration) {
                        // Still in draw animation
                        if (this.currentAnimation !== 'skeleton_archer_shooting_draw') {
                            this.sprite.play('skeleton_archer_shooting_draw', true);
                            this.currentAnimation = 'skeleton_archer_shooting_draw';
                        }
                    } else {
                        // Draw animation done, hold at frame 003
                        this.archerDrawAnimPlayed = true;
                        this.sprite.stop();
                        this.sprite.setTexture('skeleton_archer_shooting_003');
                    }
                }
                
                // Update star effect position and appearance - only show when almost ready to fire
                const chargeProgress = (this.arrowChargeTime - drawAnimDuration) / (this.arrowChargeDuration - drawAnimDuration);
                const showStar = chargeProgress >= 0.60; // Only show star in last 40% of charge
                
                if (this.archerDrawAnimPlayed && showStar) {
                    // Create star if it doesn't exist
                    if (!this.arrowTipStar) {
                        this.arrowTipStar = this.scene.add.graphics();
                        this.arrowTipStar.setDepth(20);
                    }
                    
                    const starDistance = 18; // Distance from sprite center to bow side
                    // Star appears to the left or right based on facing direction
                    const starX = this.sprite.x + (this.facingLeft ? -starDistance : starDistance);
                    const starY = this.sprite.y + 5; // Slightly below center where bow is held
                    
                    // Clear and redraw star with pulsing effect
                    this.arrowTipStar.clear();
                    const pulse = 0.7 + Math.sin(this.arrowChargeTime * 20) * 0.3; // Fast pulsing
                    const starSize = 6; // Fixed size
                    const alpha = 0.9; // Bright
                    
                    // Draw 4-pointed star
                    this.arrowTipStar.fillStyle(0xffffff, alpha * pulse);
                    this.arrowTipStar.beginPath();
                    for (let i = 0; i < 8; i++) {
                        const angle = (i * Math.PI / 4) - Math.PI / 8;
                        const radius = i % 2 === 0 ? starSize : starSize * 0.4;
                        const px = starX + Math.cos(angle) * radius;
                        const py = starY + Math.sin(angle) * radius;
                        if (i === 0) {
                            this.arrowTipStar.moveTo(px, py);
                        } else {
                            this.arrowTipStar.lineTo(px, py);
                        }
                    }
                    this.arrowTipStar.closePath();
                    this.arrowTipStar.fillPath();
                    
                    // Add glow effect
                    this.arrowTipStar.fillStyle(0xffffff, alpha * pulse * 0.3);
                    this.arrowTipStar.fillCircle(starX, starY, starSize * 1.5);
                }
                
                // Release arrow when charge is complete
                if (this.arrowChargeTime >= this.arrowChargeDuration) {
                    // Destroy the indicator
                    if (this.activeArrowIndicator) {
                        this.activeArrowIndicator.destroy();
                        this.activeArrowIndicator = null;
                    }
                    
                    // Destroy the star effect
                    if (this.arrowTipStar) {
                        this.arrowTipStar.destroy();
                        this.arrowTipStar = null;
                    }
                    
                    // Play release animation
                    this.sprite.play('skeleton_archer_shooting_release', true);
                    this.currentAnimation = 'skeleton_archer_shooting_release';
                    this.archerIsReleasing = true;
                    this.archerReleaseTimer = 0;
                    
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
                    this.archerDrawAnimPlayed = false;
                    this.shootCooldown = this.shootInterval;
                    
                    return { type: 'arrow', damage: this.stats.damage, position: { x: this.sprite.x, y: this.sprite.y }, hitPlayer: false, attackObject: arrow };
                }
                return null;
            }
            
            // State 3: Not charging - handle movement and positioning
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
                this.archerDrawAnimPlayed = false;
                
                // Lock the arrow direction
                this.lockedArrowAngle = Math.atan2(dy, dx);
                
                // Play draw animation
                this.sprite.play('skeleton_archer_shooting_draw', true);
                this.currentAnimation = 'skeleton_archer_shooting_draw';
                
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
            const minRange = 150; // Back away if player gets closer than this
            const inCameraView = this.isInCameraView();
            const body = this.sprite.body as Phaser.Physics.Arcade.Body;
            
            // Always stop movement first, then decide what to do
            if (body) body.setVelocity(0, 0);
            
            // State 1: Currently in slashing animation
            if (this.isSlashing) {
                this.slashAnimationTimer += deltaTime;
                
                if (this.slashAnimationTimer >= this.slashAnimationDuration) {
                    // Animation complete - spawn vortex and reset
                    this.isSlashing = false;
                    this.slashAnimationTimer = 0;
                    this.isAttacking = false;
                    this.postAttackIdleTimer = 0.5;
                    
                    const enemyRadius = this.getApproximateRadius();
                    const vortexAttack = new VortexAttack(this.scene, this.sprite.x, this.sprite.y, playerX, playerY, this.stats.damage, enemyRadius);
                    
                    // Force switch to idle
                    this.sprite.play(this.mobAnimations.idle, true);
                    this.currentAnimation = this.mobAnimations.idle;
                    
                    return { type: 'vortex', damage: this.stats.damage, position: { x: this.sprite.x, y: this.sprite.y }, hitPlayer: false, 
                        specialEffects: { slowEffect: vortexAttack.slowEffect, slowDuration: vortexAttack.slowDuration }, attackObject: vortexAttack };
                }
                // Stay frozen during slash animation
                return null;
            }
            
            // State 2: Post-attack cooldown (brief pause)
            if (this.postAttackIdleTimer > 0) {
                this.postAttackIdleTimer -= deltaTime;
                // Stay still, don't change animation
                return null;
            }
            
            // State 3: Ready to attack (in view and cooldown ready)
            if (inCameraView && this.vortexAttackCooldown <= 0) {
                this.vortexAttackCooldown = this.vortexAttackInterval;
                this.isAttacking = true;
                this.isSlashing = true;
                this.slashAnimationTimer = 0;
                
                // Play slash animation
                this.sprite.play('skeleton_pirate_slashing', true);
                this.currentAnimation = 'skeleton_pirate_slashing';
                return null;
            }
            
            // State 4: Need to get into camera view
            if (!inCameraView) {
                const velocityX = (dx / distance) * this.stats.speed;
                const velocityY = (dy / distance) * this.stats.speed;
                if (body) body.setVelocity(velocityX, velocityY);
                this.playAnimation(this.mobAnimations.walk);
                return null;
            }
            
            // State 5: Player too close - back away
            if (distance < minRange) {
                const velocityX = -(dx / distance) * (this.stats.speed * 0.4);
                const velocityY = -(dy / distance) * (this.stats.speed * 0.4);
                if (body) body.setVelocity(velocityX, velocityY);
                this.playAnimation(this.mobAnimations.walk);
                return null;
            }
            
            // State 6: Default - idle and wait for cooldown
            this.playAnimation(this.mobAnimations.idle);
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
                // Play the dying animation - explosion happens after it finishes
                this.sprite.play('elemental_spirit_dying');
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
            const body = this.sprite.body as Phaser.Physics.Arcade.Body;
            
            // Always stop velocity at the start of the update, then apply if needed
            if (body) body.setVelocity(0, 0);
            
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
            
            // State 1: Currently in slashing animation (highest priority)
            if (this.lightningMageIsSlashing) {
                this.lightningMageSlashTimer += deltaTime;
                
                // Spawn lightning strike partway through animation (around 50%)
                if (!this.lightningMageStrikeSpawned && this.lightningMageSlashTimer >= this.lightningMageSlashDuration * 0.5) {
                    this.lightningMageStrikeSpawned = true;
                    const lightningStrike = new LightningStrikeAttack(this.scene, playerX, playerY, this.stats.damage);
                    return { 
                        type: 'lightning', 
                        damage: this.stats.damage, 
                        position: { x: playerX, y: playerY }, 
                        hitPlayer: false, 
                        attackObject: lightningStrike 
                    };
                }
                
                // Wait for full animation to complete before allowing other actions
                if (this.lightningMageSlashTimer >= this.lightningMageSlashDuration) {
                    this.lightningMageIsSlashing = false;
                    this.lightningMageSlashTimer = 0;
                    this.isAttacking = false;
                    this.lightningMageStrikeSpawned = false;
                    // Force transition to idle
                    if (this.scene.anims.exists(this.mobAnimations.idle)) {
                        this.sprite.play(this.mobAnimations.idle, true);
                        this.currentAnimation = this.mobAnimations.idle;
                    }
                }
                return null; // Don't do anything else while slashing
            }
            
            // State 2: Attack if in camera view and cooldown ready
            if (inCameraView && currentCooldown <= 0) {
                this.sprite.setData(lightningCooldown, lightningInterval);
                this.isAttacking = true;
                this.lightningMageIsSlashing = true;
                this.lightningMageSlashTimer = 0;
                this.lightningMageStrikeSpawned = false;
                // Play the slashing animation
                if (this.scene.anims.exists('lightning_mage_slashing')) {
                    this.sprite.play('lightning_mage_slashing', true);
                    this.currentAnimation = 'lightning_mage_slashing';
                }
                return null; // Attack initiated, return
            }
            
            // State 3: Movement - Approach if not in camera view or too far
            if (!inCameraView || distance > optimalRange) {
                const velocityX = (dx / distance) * this.stats.speed;
                const velocityY = (dy / distance) * this.stats.speed;
                if (body) body.setVelocity(velocityX, velocityY);
                this.playAnimation(this.mobAnimations.walk);
                return null;
            }
            
            // State 4: Movement - Back away if player is too close
            if (distance < minRange) {
                const velocityX = -(dx / distance) * (this.stats.speed * 0.7);
                const velocityY = -(dy / distance) * (this.stats.speed * 0.7);
                if (body) body.setVelocity(velocityX, velocityY);
                this.playAnimation(this.mobAnimations.walk);
                return null;
            }
            
            // State 5: Default - In camera view, good range, waiting for cooldown - stay idle
            this.playAnimation(this.mobAnimations.idle);
            return null;
        }
        // Gnoll behavior - fast melee with claw attacks
        else {
            const body = this.sprite.body as Phaser.Physics.Arcade.Body;
            
            // State 1: Playing throwing animation
            if (this.gnollIsThrowing) {
                if (body) body.setVelocity(0, 0);
                this.gnollThrowTimer += deltaTime;
                
                // Spawn claw attack partway through animation (around 50%) - only once!
                if (this.gnollThrowTimer >= this.gnollThrowDuration * 0.5 && !this.gnollClawSpawned) {
                    this.gnollClawSpawned = true;
                    // Spawn at player's current position
                    const clawAttack = new ClawAttack(this.scene, playerX, playerY, this.stats.damage);
                    return { type: 'claw', damage: this.stats.damage, position: { x: playerX, y: playerY }, hitPlayer: false, attackObject: clawAttack };
                }
                
                // Check if animation is complete
                if (this.gnollThrowTimer >= this.gnollThrowDuration) {
                    this.gnollIsThrowing = false;
                    this.gnollThrowTimer = 0;
                    this.gnollClawSpawned = false;
                    this.isAttacking = false;
                }
                return null;
            }
            
            // State 2: Moving towards player
            if (distance > this.attackRange) {
                const velocityX = (dx / distance) * this.stats.speed;
                const velocityY = (dy / distance) * this.stats.speed;
                if (body) body.setVelocity(velocityX, velocityY);
                this.playAnimation(this.mobAnimations.walk);
            } else {
                // State 3: In attack range
                if (body) body.setVelocity(0, 0);
                
                if (this.meleeAttackCooldown <= 0) {
                    // Start throwing animation
                    this.meleeAttackCooldown = this.meleeAttackInterval;
                    this.gnollIsThrowing = true;
                    this.gnollThrowTimer = 0;
                    this.gnollClawSpawned = false;
                    this.isAttacking = true;
                    this.sprite.play('gnoll_throwing', true);
                    this.currentAnimation = 'gnoll_throwing';
                } else {
                    // Waiting for cooldown
                    this.playAnimation(this.mobAnimations.idle);
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
        // Clean up arrow tip star effect
        if (this.arrowTipStar) {
            this.arrowTipStar.destroy();
            this.arrowTipStar = null;
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
     * Creates a shield facing the player (360-degree orientation)
     */
    private createShieldAttack(playerX: number, playerY: number): EnemyAttackResult {
        // Pass player position for 360-degree shield orientation
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
    private projectiles: EnemyProjectile[] = [];
    private meleeAttacks: MeleeAttack[] = [];
    private shields: Shield[] = [];
    private coneAttacks: ConeAttack[] = [];
    private spearAttacks: SpearAttack[] = [];
    private vortexAttacks: VortexAttack[] = [];
    private explosionAttacks: ExplosionAttack[] = [];
    private lightningStrikes: LightningStrikeAttack[] = [];
    private clawAttacks: ClawAttack[] = [];
    private arrowProjectiles: ArrowProjectile[] = [];
    public enemiesGroup: Phaser.Physics.Arcade.Group;
    private spawnRate: number = 1.0;
    private maxEnemies: number = 50;
    private player: any;
    private xpOrbSystem: any;
    private spawnTimer: Phaser.Time.TimerEvent | null = null;
    private onEnemySpawnedCallback: ((enemy: Enemy) => void) | null = null;
    
    // Attack object management
    private activeProjectiles: EnemyProjectile[] = [];
    private activeShields: Shield[] = [];
    private activeConeAttacks: ConeAttack[] = [];
    private activeExplosionAttacks: ExplosionAttack[] = [];
    private activeVortexAttacks: VortexAttack[] = [];
    private activeMeleeAttacks: MeleeAttack[] = [];
    private activeLightningStrikes: LightningStrikeAttack[] = [];
    private activeClawAttacks: ClawAttack[] = [];
    private activeArrowProjectiles: ArrowProjectile[] = [];

    constructor(scene: Scene, player?: any, xpOrbSystem?: any) {
        this.scene = scene;
        this.player = player;
        this.xpOrbSystem = xpOrbSystem;
        this.enemiesGroup = this.scene.physics.add.group();
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
        this.enemiesGroup.add(enemy.sprite);
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
            this.enemiesGroup.add(enemy.sprite);
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
        this.enemiesGroup.add(enemy.sprite);
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
                this.spawnWave(EnemyType.OGRE, 1, 'screen_edges');
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
                        this.projectiles.push(attackResult.attackObject as EnemyProjectile);
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
                    case 'spear':
                        this.spearAttacks.push(attackResult.attackObject as SpearAttack);
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
                    case 'arrow':
                        this.arrowProjectiles.push(attackResult.attackObject as ArrowProjectile);
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
        
        // Update all spear attacks
        this.spearAttacks.forEach(attack => {
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
        
        // Update all arrow projectiles
        this.arrowProjectiles.forEach(arrow => {
            arrow.update(deltaTime);
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
        this.spearAttacks = this.spearAttacks.filter(attack => attack.isActive());
        this.vortexAttacks = this.vortexAttacks.filter(attack => attack.isActive());
        this.explosionAttacks = this.explosionAttacks.filter(attack => attack.isActive());
        this.lightningStrikes = this.lightningStrikes.filter(attack => attack.isActive());
        this.clawAttacks = this.clawAttacks.filter(attack => attack.isActive());
        this.arrowProjectiles = this.arrowProjectiles.filter(arrow => arrow.isActive());
        // Update all active attack objects
        this.updateAttackObjects(deltaTime, playerX, playerY);
        
        // Remove destroyed enemies and spawn XP orbs
        this.enemies = this.enemies.filter(enemy => {
            const isDead = enemy.currentHealth <= 0;
            // Check if enemy is dead (health <= 0) or sprite was destroyed externally
            if (isDead || !enemy.sprite.active) {
                // Spawn XP orbs only if enemy died from damage (isDead)
                if (isDead && this.xpOrbSystem) {
                    // Use sprite position if active, otherwise try to use last known
                    const spawnX = enemy.sprite.active ? enemy.sprite.x : (enemy.sprite as any).x || 0;
                    const spawnY = enemy.sprite.active ? enemy.sprite.y : (enemy.sprite as any).y || 0;
                    
                    console.log(`Enemy died at (${spawnX}, ${spawnY}), spawning XP orbs with value ${enemy.stats.xpValue}`);
                    this.xpOrbSystem.spawnXPOrbs(
                        spawnX,
                        spawnY,
                        enemy.type,
                        enemy.stats.xpValue
                    );
                }

                // Ensure enemy is properly destroyed if it hasn't been already
                if (enemy.sprite.active) {
                    this.enemiesGroup.remove(enemy.sprite);
                    enemy.destroy();
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
        projectiles: EnemyProjectile[];
        shields: Shield[];
        coneAttacks: ConeAttack[];
        explosionAttacks: ExplosionAttack[];
        vortexAttacks: VortexAttack[];
        meleeAttacks: MeleeAttack[];
        lightningStrikes: LightningStrikeAttack[];
        clawAttacks: ClawAttack[];
        arrowProjectiles: ArrowProjectile[];
    } {
        return {
            projectiles: this.activeProjectiles,
            shields: this.activeShields,
            coneAttacks: this.activeConeAttacks,
            explosionAttacks: this.activeExplosionAttacks,
            vortexAttacks: this.activeVortexAttacks,
            meleeAttacks: this.activeMeleeAttacks,
            lightningStrikes: this.activeLightningStrikes,
            clawAttacks: this.activeClawAttacks,
            arrowProjectiles: this.activeArrowProjectiles
        };
    }

    /**
     * Clears all active attack objects
     */
    public clearAllAttacks(): void {
        // Destroy all attack objects
        [...this.activeProjectiles, ...this.activeShields, ...this.activeConeAttacks,
         ...this.activeExplosionAttacks, ...this.activeVortexAttacks, ...this.activeMeleeAttacks,
         ...this.activeLightningStrikes, ...this.activeClawAttacks, ...this.activeArrowProjectiles]
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
        this.activeArrowProjectiles = [];
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
    public getProjectiles(): EnemyProjectile[] {
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
     * Gets all active spear attacks
     * @returns Array of all active spear attacks
     */
    public getSpearAttacks(): SpearAttack[] {
        return this.spearAttacks;
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
     * Returns all active arrow projectiles
     */
    public getArrowProjectiles(): ArrowProjectile[] {
        return this.arrowProjectiles;
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
        this.arrowProjectiles.forEach(arrow => arrow.destroy());
        this.arrowProjectiles = [];
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

