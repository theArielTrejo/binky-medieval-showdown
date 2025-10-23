import { Scene } from 'phaser';
import { PlayerArchetype, PlayerArchetypeType } from './PlayerArchetype';
import { Enemy, EnemyType, Projectile, MeleeAttack, ConeAttack, Shield, VortexAttack, ExplosionAttack } from './EnemySystem';
import { EnhancedStyleHelpers } from '../ui/EnhancedDesignSystem';
import { AnimationMapper, CharacterAnimationSet } from './config/AnimationMappings';

export class Player {
    public sprite: Phaser.Physics.Arcade.Sprite;
    private archetype: PlayerArchetype;
    private currentAnimation: string = '';
    private scene: Scene;

	private characterVariant: string = 'Knight_1'; // Default to standardized knight variant
	private characterAnimations: CharacterAnimationSet;
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasdKeys: any;
    private pointerDownHandler?: (pointer: Phaser.Input.Pointer) => void;
    private lastAttackTime: number = 0;
    private attackCooldown: number;
    private bullets: Phaser.GameObjects.Rectangle[] = [];
    private healthBar: Phaser.GameObjects.Rectangle;
    private healthBarBg: Phaser.GameObjects.Rectangle;
    private archetypeText: Phaser.GameObjects.Text;
    private activeEffects: Phaser.GameObjects.GameObject[] = [];
    public lastDamageTime: number = 0;
    public damageCooldown: number = 1000; // 1 second invincibility frames
    private isInvulnerable: boolean = false;
    private onEnemyDeathCallback: ((x: number, y: number, enemyType: EnemyType, xpValue: number) => void) | null = null;
    private slowMultiplier: number = 1.0; // Current speed multiplier (1.0 = normal, 0.5 = 50% speed)
    private slowEndTime: number = 0; // Timestamp when slow effect ends
    private lastVortexHitTime: number = 0; // Last time player was hit by vortex
    private vortexHitCooldown: number = 500; // Cooldown between vortex hits (ms)

    constructor(scene: Scene, x: number, y: number, archetypeType: PlayerArchetypeType) {
        this.scene = scene;
        this.archetype = new PlayerArchetype(archetypeType);
        this.attackCooldown = 1000 / this.archetype.stats.attackSpeed; // Convert to milliseconds
        
        // Use random character selection for players (mobs use hardcoded system)
        // Note: Player character selection remains random for variety, only mob skins are hardcoded
        this.characterVariant = AnimationMapper.getRandomCharacterForArchetype(this.archetype.type);
        this.characterAnimations = AnimationMapper.getCharacterAnimations(this.characterVariant);
        
        console.log(`🎮 Selected character variant: ${this.characterVariant} for archetype: ${this.archetype.type}`);
        console.log('🎮 Character animations:', this.characterAnimations);
        
        // Character animations are now directly accessible via this.characterAnimations
        
        // Use the texture from hardcoded mappings
        const textureKey = this.characterAnimations.texture;
        
        // Create player physics sprite with the determined texture
        this.sprite = scene.physics.add.sprite(x, y, textureKey);
        console.log(`🎮 Created player sprite with texture: ${textureKey}`);
        this.sprite.setScale(0.05); // Scale down significantly to match enemy proportions
        this.sprite.setDepth(3); // Correct layer of characters
        
        // Enable crisp pixel rendering for better sprite quality
        this.sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        
        // ✅ Big hitbox like your working JS
        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);

        // These are WORLD pixels (not scaled texture pixels) — same values you used in GameScence.js
        body.setSize(410, 545);     // width, height
        body.setOffset(265, 175);   // shift right (x), shift down (y)

        // Optional: if drag was added earlier, keep it
        body.setDrag(800);

        // Start with idle animation
        this.playAnimation('idle');
        
        // Set up input
        this.cursors = scene.input.keyboard!.createCursorKeys();
        this.wasdKeys = scene.input.keyboard!.addKeys('W,S,A,D,SPACE');
        
        // Create health bar background
        this.healthBarBg = scene.add.rectangle(x, y - 35, 50, 8, 0x000000);
        this.healthBarBg.setDepth(15);

        // Create health bar
        this.healthBar = scene.add.rectangle(x, y - 35, 48, 6, 0x00ff00);
        this.healthBar.setDepth(16);

        // Create archetype text
        this.archetypeText = scene.add.text(x, y - 50, this.getArchetypeDisplayName(), {
            fontSize: '12px',
            color: EnhancedStyleHelpers.archetype.getColor(this.archetype.type),
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        });
        this.archetypeText.setOrigin(0.5);
        this.archetypeText.setDepth(17);

        // Set up mouse input for attacks
        this.pointerDownHandler = (pointer: Phaser.Input.Pointer) => {
            if (pointer.leftButtonDown()) {
                this.performAttack(pointer);
            }
        };
        scene.input.on('pointerdown', this.pointerDownHandler);

        // Update archetype position
        this.archetype.updatePosition(x, y);
    }

    private getArchetypeDisplayName(): string {
        switch (this.archetype.type) {
            case PlayerArchetypeType.TANK:
                return 'TANK';
            case PlayerArchetypeType.GLASS_CANNON:
                return 'GLASS CANNON';
            case PlayerArchetypeType.EVASIVE:
                return 'EVASIVE';
        }
    }



    // Commented out to resolve unused function warning - may be useful for future UI features
    // private getArchetypeColor(): number {
    //     return EnhancedStyleHelpers.archetype.getColorHex(this.archetype.type);
    // }

    /**
     * Sets the callback function to be called when an enemy dies
     * @param callback - Function to call when enemy dies (x, y, enemyType, xpValue)
     */
    public setEnemyDeathCallback(callback: (x: number, y: number, enemyType: EnemyType, xpValue: number) => void): void {
        this.onEnemyDeathCallback = callback;
    }

    /**
     * Handles enemy death by calling the callback and updating archetype damage dealt
     * @param enemy - The enemy that died
     * @param damage - Damage dealt to the enemy
     */
    private handleEnemyDeath(enemy: Enemy, damage: number): void {
        if (this.onEnemyDeathCallback) {
            this.onEnemyDeathCallback(enemy.sprite.x, enemy.sprite.y, enemy.type, enemy.stats.xpValue);
        }
        this.archetype.dealDamage(damage);
    }

    /**
     * Updates the player state each frame
     * @param enemies - Array of enemy objects to interact with
     * @param deltaTime - Time elapsed since last frame in seconds
     */
    public update(enemies: Enemy[], deltaTime: number): void {
        this.handleMovement();
        this.handleAttack(enemies);
        this.updateBullets(deltaTime);
        this.updateHealthBar();
        this.updateArchetype();
        this.updateInvulnerability();
    }

    private handleMovement(): void {
        if (!this.sprite.body) return;
        
        // Update slow effect
        this.updateSlowEffect();
        
        let velocityX = 0;
        let velocityY = 0;
        
        // Safe input handling with proper null checks
        const leftPressed = this.isKeyPressed(this.cursors?.left) || this.isKeyPressed(this.wasdKeys?.A);
        const rightPressed = this.isKeyPressed(this.cursors?.right) || this.isKeyPressed(this.wasdKeys?.D);
        const upPressed = this.isKeyPressed(this.cursors?.up) || this.isKeyPressed(this.wasdKeys?.W);
        const downPressed = this.isKeyPressed(this.cursors?.down) || this.isKeyPressed(this.wasdKeys?.S);
        
        if (leftPressed) {
            velocityX = -this.archetype.stats.speed;
        }
        if (rightPressed) {
            velocityX = this.archetype.stats.speed;
        }
        if (upPressed) {
            velocityY = -this.archetype.stats.speed;
        }
        if (downPressed) {
            velocityY = this.archetype.stats.speed;
        }
        
        // Apply slow effect
        velocityX *= this.slowMultiplier;
        velocityY *= this.slowMultiplier;
        
        // Normalize diagonal movement
        if (velocityX !== 0 && velocityY !== 0) {
            velocityX *= 0.707; // 1/sqrt(2)
            velocityY *= 0.707;
        }
        
        // Improved movement detection - check if any movement keys are pressed
        const isMoving = leftPressed || rightPressed || upPressed || downPressed;
        
		// Determine target animation based on movement state
		const targetAnimation = isMoving ? 'walk' : 'idle';
        
        // Only change animation if it's different from current
        // The flipping logic is now handled inside playAnimation() to avoid conflicts
        if (this.currentAnimation !== targetAnimation) {
            this.playAnimation(targetAnimation);
        }
        
        // Apply movement using physics velocity
        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(velocityX, velocityY);
        
        // Update archetype position
        this.archetype.updatePosition(this.sprite.x, this.sprite.y);
        
        // Update UI element positions
        this.healthBarBg.setPosition(this.sprite.x, this.sprite.y - 35);
        this.healthBar.setPosition(this.sprite.x, this.sprite.y - 35);
        this.archetypeText.setPosition(this.sprite.x, this.sprite.y - 50);
    }

    private performAttack(pointer: Phaser.Input.Pointer): void {
        const currentTime = Date.now();
        
        if (currentTime - this.lastAttackTime > this.attackCooldown) {
            switch (this.archetype.type) {
                case PlayerArchetypeType.TANK:
                    this.meleeAttack([]);
                    break;
                case PlayerArchetypeType.EVASIVE:
                    this.aoeAttack([]);
                    break;
                case PlayerArchetypeType.GLASS_CANNON:
                default:
                    // Convert pointer coordinates to world coordinates
                    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
                    this.projectileAttackTowardsMouse(worldPoint.x, worldPoint.y);
                    break;
            }
            this.lastAttackTime = currentTime;
        }
    }

    private projectileAttackTowardsMouse(targetX: number, targetY: number): void {
        // Glass Cannon shoots towards target position
        const bullet = this.scene.add.rectangle(this.sprite.x, this.sprite.y, 8, 8, 0xffff00);
        bullet.setDepth(5);
        
        // Set bullet properties
        (bullet as any).damage = this.archetype.stats.damage;
        (bullet as any).range = this.archetype.stats.attackRange;
        (bullet as any).speed = 400;
        (bullet as any).distanceTraveled = 0;
        
        // Calculate direction towards target
        const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, targetX, targetY);
        
        (bullet as any).velocityX = Math.cos(angle) * (bullet as any).speed;
        (bullet as any).velocityY = Math.sin(angle) * (bullet as any).speed;
        
        this.bullets.push(bullet);
    }



    private handleAttack(enemies: Enemy[]): void {
        const currentTime = Date.now();
        
        // Safe input handling for attack
        const attackPressed = this.isKeyPressed(this.cursors?.space) || this.isKeyPressed(this.wasdKeys?.SPACE);
        
        if (attackPressed) {
            // console.log('Attack key pressed, cooldown check:', currentTime - this.lastAttackTime, '>', this.attackCooldown);
        }
        
        if (attackPressed && currentTime - this.lastAttackTime > this.attackCooldown) {
            // console.log('Attacking with archetype:', this.archetype.type, 'damage:', this.archetype.stats.damage);
            this.attack(enemies);
            this.lastAttackTime = currentTime;
        }
    }
    
    private isKeyPressed(key: any): boolean {
        return key && typeof key === 'object' && key.isDown === true;
    }

    /**
     * Perform attack based on archetype (called by right-click)
     */
    private performAttack(pointer: Phaser.Input.Pointer): void {
        // Get world coordinates (account for camera scroll)
        const worldX = pointer.x + this.scene.cameras.main.scrollX;
        const worldY = pointer.y + this.scene.cameras.main.scrollY;
        
        switch (this.archetype.type) {
            case PlayerArchetypeType.TANK:
                this.meleeAttack([]);
                break;
            case PlayerArchetypeType.EVASIVE:
                this.aoeAttack([]);
                break;
            case PlayerArchetypeType.GLASS_CANNON:
            default:
                this.projectileAttackTowardsMouse(worldX, worldY);
                break;
        }
    }

    private attack(enemies: Enemy[]): void {
        switch (this.archetype.type) {
            case PlayerArchetypeType.TANK:
                this.meleeAttack(enemies);
                break;
            case PlayerArchetypeType.EVASIVE:
                this.aoeAttack(enemies);
                break;
            case PlayerArchetypeType.GLASS_CANNON:
            default:
                this.projectileAttack(enemies);
                break;
        }
    }

    private meleeAttack(enemies: Enemy[]): void {
        // Tank uses close-range melee attacks
        const meleeRange = this.archetype.stats.attackRange;
        const meleeDamage = this.archetype.stats.damage;
        
        // Create visual effect for melee attack
        const meleeEffect = this.scene.add.circle(
            this.sprite.x,
            this.sprite.y,
            meleeRange,
            0xff0000,
            0.3
        );
        this.activeEffects.push(meleeEffect);
        
        // Remove effect after short duration
        this.scene.time.delayedCall(150, () => {
            meleeEffect.destroy();
            this.activeEffects = this.activeEffects.filter(e => e !== meleeEffect);
        });
        
        // Damage all enemies within melee range
        // console.log('Melee attack: checking', enemies.length, 'enemies, range:', meleeRange, 'damage:', meleeDamage);
        enemies.forEach(enemy => {
            const distance = Phaser.Math.Distance.Between(
                this.sprite.x,
                this.sprite.y,
                enemy.sprite.x,
                enemy.sprite.y
            );
            
            // console.log('Enemy distance:', distance, 'vs range:', meleeRange, 'enemy health:', enemy.currentHealth);
            
            if (distance <= meleeRange) {
                // console.log('Enemy in range! Applying', meleeDamage, 'damage');
                const enemyDied = enemy.takeDamage(meleeDamage);
                if (enemyDied) {
                    // console.log('Enemy died!');
                    this.handleEnemyDeath(enemy, meleeDamage);
                } else {
                    // console.log('Enemy survived with', enemy.currentHealth, 'health');
                    this.archetype.dealDamage(meleeDamage);
                }
            }
        });
    }

    private aoeAttack(enemies: Enemy[]): void {
        // Evasive uses area-of-effect attacks
        const aoeRange = this.archetype.stats.attackRange;
        const aoeDamage = this.archetype.stats.damage;
        
        // Create multiple AoE explosions around the player
        const explosionCount = 3;
        const explosionRadius = 40;
        
        for (let i = 0; i < explosionCount; i++) {
            const angle = (i / explosionCount) * Math.PI * 2;
            const explosionX = this.sprite.x + Math.cos(angle) * (aoeRange * 0.7);
            const explosionY = this.sprite.y + Math.sin(angle) * (aoeRange * 0.7);
            
            // Create visual effect for explosion
            const explosion = this.scene.add.circle(
                explosionX,
                explosionY,
                explosionRadius,
                0x00ff00,
                0.4
            );
            this.activeEffects.push(explosion);
            
            // Remove effect after short duration
            this.scene.time.delayedCall(200, () => {
                explosion.destroy();
                this.activeEffects = this.activeEffects.filter(e => e !== explosion);
            });
            
            // Damage enemies within explosion radius
            enemies.forEach(enemy => {
                const distance = Phaser.Math.Distance.Between(
                    explosionX,
                    explosionY,
                    enemy.sprite.x,
                    enemy.sprite.y
                );
                
                if (distance <= explosionRadius) {
                    const enemyDied = enemy.takeDamage(aoeDamage);
                    if (enemyDied) {
                        this.handleEnemyDeath(enemy, aoeDamage);
                    } else {
                        this.archetype.dealDamage(aoeDamage);
                    }
                }
            });
        }
    }

    /**
     * Shoot a single projectile towards mouse position (for Glass Cannon with right-click)
     */
    private projectileAttackTowardsMouse(targetX: number, targetY: number): void {
        // Create a single bullet
        const bullet = this.scene.add.rectangle(
            this.sprite.x, 
            this.sprite.y, 
            8, 
            8, 
            0xffff00
        );
        
        bullet.setData('damage', this.archetype.stats.damage);
        bullet.setData('range', this.archetype.stats.attackRange);
        bullet.setData('startX', this.sprite.x);
        bullet.setData('startY', this.sprite.y);
        bullet.setData('speed', 400); // Bullet speed

        // Calculate angle to mouse position
        const angle = Phaser.Math.Angle.Between(
            this.sprite.x,
            this.sprite.y,
            targetX,
            targetY
        );
        const velocityX = Math.cos(angle) * 400;
        const velocityY = Math.sin(angle) * 400;
        
        bullet.setData('velocityX', velocityX);
        bullet.setData('velocityY', velocityY);
        
        this.bullets.push(bullet);
    }

    private projectileAttack(enemies: Enemy[]): void {
        // Glass Cannon uses projectile attacks (original behavior for spacebar)
        const closestEnemy = this.findClosestEnemy(enemies);

        // Create a bullet
        const bullet = this.scene.add.rectangle(
            this.sprite.x, 
            this.sprite.y, 
            8, 
            8, 
            0xffff00
        );
        
        bullet.setData('damage', this.archetype.stats.damage);
        bullet.setData('range', this.archetype.stats.attackRange);
        bullet.setData('startX', this.sprite.x);
        bullet.setData('startY', this.sprite.y);
        bullet.setData('speed', 400); // Bullet speed

        let velocityX = 0;
        let velocityY = -400; // Default to shooting up

        if (closestEnemy) {
            const angle = Phaser.Math.Angle.Between(
                this.sprite.x,
                this.sprite.y,
                closestEnemy.sprite.x,
                closestEnemy.sprite.y
            );
            velocityX = Math.cos(angle) * 400;
            velocityY = Math.sin(angle) * 400;
        }
        
        bullet.setData('velocityX', velocityX);
        bullet.setData('velocityY', velocityY);
        
        this.bullets.push(bullet);
    }

    private findClosestEnemy(enemies: Enemy[]): Enemy | null {
        let closestEnemy: Enemy | null = null;
        let minDistance = Infinity;

        enemies.forEach(enemy => {
            const distance = Phaser.Math.Distance.Between(
                this.sprite.x,
                this.sprite.y,
                enemy.sprite.x,
                enemy.sprite.y
            );

            if (distance < minDistance) {
                minDistance = distance;
                closestEnemy = enemy;
            }
        });

        return closestEnemy;
    }

    private updateBullets(deltaTime: number): void {
        
        this.bullets = this.bullets.filter(bullet => {
            if (!bullet.active) return false;
            
            // Move bullet
            const velocityX = bullet.getData('velocityX');
            const velocityY = bullet.getData('velocityY');
            bullet.x += velocityX * deltaTime;
            bullet.y += velocityY * deltaTime;
            
            // Check range
            const startX = bullet.getData('startX');
            const startY = bullet.getData('startY');
            const range = bullet.getData('range');
            const distance = Math.sqrt(
                Math.pow(bullet.x - startX, 2) + Math.pow(bullet.y - startY, 2)
            );
            
            if (distance > range) {
                bullet.destroy();
                return false;
            }
            
            // Check world bounds instead of hardcoded screen bounds
            const worldBounds = this.scene.physics.world.bounds;
            if (bullet.x < worldBounds.x || bullet.x > worldBounds.width || 
                bullet.y < worldBounds.y || bullet.y > worldBounds.height) {
                bullet.destroy();
                return false;
            }
            
            return true;
        });
    }



    private updateInvulnerability(): void {
        if (this.isInvulnerable) {
            const currentTime = Date.now();
            const timeSinceDamage = currentTime - this.lastDamageTime;
            
            // Check if invulnerability period is over
            if (timeSinceDamage >= this.damageCooldown) {
                this.isInvulnerable = false;
                this.sprite.setAlpha(1.0); // Restore full opacity
                this.sprite.clearTint(); // Restore normal color
            } else {
                // Create flashing effect during invulnerability
                const flashInterval = 100; // Flash every 100ms
                const shouldFlash = Math.floor(timeSinceDamage / flashInterval) % 2 === 0;
                this.sprite.setAlpha(shouldFlash ? 0.3 : 0.8);
            }
        }
    }

    /**
     * Updates the slow effect status
     */
    private updateSlowEffect(): void {
        const currentTime = Date.now();
        
        // Check if slow effect has expired
        if (currentTime >= this.slowEndTime) {
            this.slowMultiplier = 1.0; // Return to normal speed
        }
        
        // Visual indicator for slow effect (cyan tint)
        if (this.slowMultiplier < 1.0 && !this.isInvulnerable) {
            // Apply a cyan tint to show the player is slowed
            this.sprite.setTint(0x00cccc);
        } else if (!this.isInvulnerable) {
            // Clear tint if not slowed (and not invulnerable)
            this.sprite.clearTint();
        }
    }

    /**
     * Applies slow effect to the player
     * @param multiplier - Speed multiplier (0.5 = 50% speed)
     * @param duration - Duration of slow in milliseconds
     */
    private applySlowEffect(multiplier: number, duration: number): void {
        this.slowMultiplier = Math.min(this.slowMultiplier, multiplier); // Use the strongest slow
        this.slowEndTime = Math.max(this.slowEndTime, Date.now() + duration);
        console.log(`Player slowed! Speed: ${(multiplier * 100).toFixed(0)}%, Duration: ${(duration / 1000).toFixed(1)}s`);
    }

    /**
     * Checks for collisions between the player and enemies
     * Also checks if shields block player bullets
     * @param enemies - Array of enemies to check collision against
     */
    public checkCollisionWithEnemies(enemies: Enemy[], shields?: Shield[]): void {
        const bulletsToRemove: Phaser.GameObjects.Rectangle[] = [];
        const blockedBullets = new Set<Phaser.GameObjects.Rectangle>();
        
        // First pass: check if any bullets are blocked by shields
        if (shields && shields.length > 0) {
            this.bullets.forEach(bullet => {
                if (!bullet.active || blockedBullets.has(bullet)) return;
                
                for (const shield of shields) {
                    if (shield.isActive() && shield.blocksProjectile(bullet.x, bullet.y)) {
                        console.log(`Player bullet blocked by shield at (${bullet.x.toFixed(0)}, ${bullet.y.toFixed(0)})!`);
                        blockedBullets.add(bullet); // Mark as blocked FIRST
                        bullet.destroy();
                        bulletsToRemove.push(bullet);
                        break; // This bullet is blocked, no need to check other shields
                    }
                }
            });
        }
        
        // Second pass: check bullet-enemy collisions for non-blocked bullets
        enemies.forEach(enemy => {
            // Check bullet-enemy collision
            this.bullets.forEach(bullet => {
                if (!bullet.active || blockedBullets.has(bullet)) return;
                
                if (this.checkCollision(bullet, enemy.sprite)) {
                    const damage = bullet.getData('damage');
                    console.log(`Bullet hit enemy ${enemy.type} at (${enemy.sprite.x.toFixed(0)}, ${enemy.sprite.y.toFixed(0)}), damage: ${damage}`);
                    const enemyDied = enemy.takeDamage(damage);

                    if (enemyDied) {
                        console.log(`Enemy ${enemy.type} died!`);
                        this.handleEnemyDeath(enemy, damage);
                    } else {
                        this.archetype.dealDamage(damage);
                    }
                    
                    bullet.destroy();
                    bulletsToRemove.push(bullet);
                }
            });
            
            // Check player-enemy collision (only for melee-only enemies like Gnolls)
            // Other enemies damage through their special attacks
            if (enemy.type === EnemyType.GNOLL && this.checkCollision(this.sprite, enemy.sprite)) {
                const currentTime = Date.now();
                if (currentTime - this.lastDamageTime >= this.damageCooldown) {
                    this.takeDamage(enemy.stats.damage);
                    this.lastDamageTime = currentTime;
                    this.isInvulnerable = true;
                }
            }
        });
        
        // Remove destroyed bullets
        this.bullets = this.bullets.filter(bullet => !bulletsToRemove.includes(bullet));
    }

    /**
     * Checks for collisions between the player and enemy projectiles
     * @param projectiles - Array of projectiles to check collision against
     */
    public checkCollisionWithProjectiles(projectiles: Projectile[]): void {
        projectiles.forEach(projectile => {
            if (!projectile.isActive()) return;
            
            const pos = projectile.getPosition();
            const distance = Math.sqrt(
                Math.pow(this.sprite.x - pos.x, 2) + 
                Math.pow(this.sprite.y - pos.y, 2)
            );
            
            // Check if projectile hits player (simple radius check)
            if (distance < 25) { // Player collision radius
                const currentTime = Date.now();
                if (currentTime - this.lastDamageTime >= this.damageCooldown) {
                    this.takeDamage(projectile.damage);
                    this.lastDamageTime = currentTime;
                    this.isInvulnerable = true;
                }
                projectile.destroy();
            }
        });
    }

    /**
     * Checks for collisions between the player and enemy melee attacks
     * @param meleeAttacks - Array of melee attacks to check collision against
     */
    public checkCollisionWithMeleeAttacks(meleeAttacks: MeleeAttack[]): void {
        meleeAttacks.forEach(attack => {
            if (!attack.isActive()) return;
            
            // Use circle-based collision for simplicity with rotated rectangles
            const attackPos = { x: attack.x, y: attack.y };
            const distance = Math.sqrt(
                Math.pow(this.sprite.x - attackPos.x, 2) + 
                Math.pow(this.sprite.y - attackPos.y, 2)
            );
            
            // Check if player is within attack range (using radius based on attack size)
            const attackRadius = Math.max(attack.width, attack.height) / 2;
            if (distance < attackRadius + 25) { // 25 is player collision radius
                const currentTime = Date.now();
                if (currentTime - this.lastDamageTime >= this.damageCooldown) {
                    this.takeDamage(attack.damage);
                    this.lastDamageTime = currentTime;
                    this.isInvulnerable = true;
                }
                // Don't destroy melee attack - it can hit multiple times during its lifetime
            }
        });
    }

    /**
     * Checks for collisions between the player and enemy cone attacks
     * @param coneAttacks - Array of cone attacks to check collision against
     */
    public checkCollisionWithConeAttacks(coneAttacks: ConeAttack[]): void {
        coneAttacks.forEach(attack => {
            if (!attack.isActive()) return;
            
            // Use the cone's built-in point-in-cone check
            if (attack.isPointInCone(this.sprite.x, this.sprite.y)) {
                const currentTime = Date.now();
                if (currentTime - this.lastDamageTime >= this.damageCooldown) {
                    this.takeDamage(attack.damage);
                    this.lastDamageTime = currentTime;
                    this.isInvulnerable = true;
                }
            }
        });
    }

    /**
     * Checks for collisions between the player and enemy vortex attacks
     * Applies damage and slow effect when hit
     * @param vortexAttacks - Array of vortex attacks to check collision against
     */
    public checkCollisionWithVortexAttacks(vortexAttacks: VortexAttack[]): void {
        vortexAttacks.forEach(attack => {
            if (!attack.isActive()) return;
            
            // Use the vortex's built-in point-in-vortex check
            if (attack.isPointInVortex(this.sprite.x, this.sprite.y)) {
                const currentTime = Date.now();
                
                // Apply damage with cooldown (like other attacks)
                if (currentTime - this.lastDamageTime >= this.damageCooldown) {
                    this.takeDamage(attack.damage);
                    this.lastDamageTime = currentTime;
                    this.isInvulnerable = true;
                }
                
                // Apply slow effect if player can be hit by vortex
                if (this.canBeHitByVortex()) {
                    this.applySlow(0.3, 2000); // 70% speed reduction for 2 seconds
                    this.hitByVortex();
                }
            }
        });
    }

    public checkCollisionWithExplosionAttacks(explosionAttacks: ExplosionAttack[]): void {
        explosionAttacks.forEach(attack => {
            if (attack.isActive() && attack.isPointInExplosion(this.sprite.x, this.sprite.y)) {
                const currentTime = Date.now();
                if (currentTime - this.lastDamageTime >= this.damageCooldown) {
                    this.takeDamage(attack.damage);
                    this.lastDamageTime = currentTime;
                    this.isInvulnerable = true;
                }
            }
        });
    }

    private checkCollision(obj1: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle, obj2: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle): boolean {
        const bounds1 = obj1.getBounds();
        const bounds2 = obj2.getBounds();
        return Phaser.Geom.Rectangle.Overlaps(bounds1, bounds2);
    }

    /**
     * Applies damage to the player if not invulnerable
     * @param amount - Amount of damage to apply
     */
    public takeDamage(amount: number): void {
        this.archetype.takeDamage(amount);
        
        // Update damage timing for invulnerability frames
        this.lastDamageTime = Date.now();
        this.isInvulnerable = true;
        
        // Visual feedback - brief red tint, then invulnerability will take over
        this.sprite.setTint(0xff0000);
        this.scene.time.delayedCall(120, () => {
            // Clear damage tint shortly after hit so it doesn't persist
            this.sprite.clearTint();
        });
    }

    /**
     * Checks if the player is still alive
     * @returns True if player health is greater than 0
     */
    public isAlive(): boolean {
        return this.archetype.currentHealth > 0;
    }

    /**
     * Gets the current position of the player
     * @returns Object containing x and y coordinates
     */
    public getPosition(): { x: number; y: number } {
        return { x: this.sprite.x, y: this.sprite.y };
    }

    /**
     * Gets the player's current archetype
     * @returns The player's archetype instance
     */
    public getArchetype(): PlayerArchetype {
        return this.archetype;
    }

    /**
     * Gets all active bullets fired by the player
     * @returns Array of bullet game objects
     */
    public getBullets(): Phaser.GameObjects.Rectangle[] {
        return this.bullets;
    }

    /**
     * Gets the player's current health percentage
     * @returns Health percentage (0-1)
     */
    public getHealthPercentage(): number {
        return this.archetype.getHealthPercentage();
    }

    /**
     * Gets the player's DPS over the last ten seconds
     * @returns DPS value
     */
    public getDPSOverLastTenSeconds(): number {
        return this.archetype.getDPSOverLastTenSeconds();
    }

    /**
     * Gets the player's movement distance over the last ten seconds
     * @returns Movement distance
     */
    public getMovementDistanceLastTenSeconds(): number {
        return this.archetype.getMovementDistanceLastTenSeconds();
    }

    /**
     * Gets the damage taken recently by the player
     * @returns Recent damage taken
     */
    public getDamageTakenRecently(): number {
        return this.archetype.getDamageTakenRecently();
    }

    /**
     * Gets the player's XP generation rate
     * @returns XP generation rate
     */
    public getXPGenerationRate(): number {
        return this.archetype.getXPGenerationRate();
    }

    /**
     * Gets the player's archetype as a vector representation
     * @returns Archetype vector
     */
    public getArchetypeVector(): number[] {
        return this.archetype.getArchetypeVector();
    }

    /**
     * Gets the player's current position
     * @returns Position object with x and y coordinates
     */
    public get position(): { x: number; y: number } {
        return { x: this.sprite.x, y: this.sprite.y };
    }

    /**
     * Gets the player's current health
     * @returns Current health value
     */
    public get currentHealth(): number {
        return this.archetype.currentHealth;
    }

    /**
     * Gets the player's scene for accessing world bounds
     * @returns The scene instance
     */
    public getScene(): Scene {
        return this.scene;
    }

    private playAnimation(animationName: string): void {
        if (this.currentAnimation !== animationName) {
            this.currentAnimation = animationName;
            console.log(`🎬 Attempting to play animation: ${animationName}`);
            
            try {
                const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                let targetAnimation: string;
                
                // Check for directional animations first
                if (body && Math.abs(body.velocity.x) > 10) {
                    const direction = body.velocity.x < 0 ? 'left' : 'right';
                    const directionalKey = animationName === 'idle' ? 
                        (direction === 'left' ? this.characterAnimations.idle_left : this.characterAnimations.idle_right) :
                        (direction === 'left' ? this.characterAnimations.walk_left : this.characterAnimations.walk_right);
                    
                    if (directionalKey && this.scene.anims.exists(directionalKey)) {
                        console.log(`✅ Playing directional animation: ${directionalKey}`);
                        this.sprite.play(directionalKey);
                        return;
                    }
                }
                
                // Use hardcoded animation mappings
                targetAnimation = animationName === 'idle' ? 
                    this.characterAnimations.idle : 
                    this.characterAnimations.walk;
                
                if (this.scene.anims.exists(targetAnimation)) {
                    console.log(`✅ Playing hardcoded animation: ${targetAnimation}`);
                    this.sprite.play(targetAnimation);
                    
                    // Apply flipping for non-directional animations
                    if (body && Math.abs(body.velocity.x) > 10) {
                        this.sprite.setFlipX(body.velocity.x < 0);
                    }
                    return;
                }
                
                // Fallback to generic animations
                const fallbackAnimation = animationName === 'idle' ? 'player_idle' : 'player_walk';
                if (this.scene.anims.exists(fallbackAnimation)) {
                    console.log(`⚠️ Using fallback animation: ${fallbackAnimation}`);
                    this.sprite.play(fallbackAnimation);
                    
                    if (body && Math.abs(body.velocity.x) > 10) {
                        this.sprite.setFlipX(body.velocity.x < 0);
                    }
                    return;
                }
                
                console.warn(`❌ No animation found for ${animationName}, keeping current texture`);
                
            } catch (error) {
                console.warn(`Failed to play animation ${animationName}:`, error);
            }
        }
    }

	// Attempt to resolve archetype-specific animation keys (idle/walk)


    /**
     * Collects XP orbs within range and adds XP to the player
     * @param xpOrbSystem - The XP orb system to collect from
     */
    public collectXPOrbs(xpOrbSystem: any): void {
        const playerPos = this.getPosition();
        // console.log('Player collecting XP orbs at position:', playerPos.x, playerPos.y);
        const totalCollected = xpOrbSystem.collectOrbs(playerPos.x, playerPos.y, (xp: number) => {
            // console.log('Player gained XP:', xp);
            this.archetype.gainXP(xp);
        });
        if (totalCollected > 0) {
            // console.log('Total XP collected this frame:', totalCollected);
        }
    }

    /**
     * Updates the health bar display
     */
    private updateHealthBar(): void {
        const healthPercent = this.archetype.currentHealth / this.archetype.stats.maxHealth;
        const maxWidth = 48;
        const currentWidth = maxWidth * healthPercent;
        
        this.healthBar.setSize(currentWidth, 6);
        
        // Color based on health percentage using EnhancedStyleHelpers
        const healthColor = EnhancedStyleHelpers.enemy.getHealthBarColor(healthPercent);
        this.healthBar.setFillStyle(healthColor);
    }

    /**
     * Updates the archetype sprite tinting
     */
    private updateArchetype(): void {
        if (!this.isInvulnerable) {
            const archetypeColor = EnhancedStyleHelpers.archetype.getColorHex(this.archetype.type);
            this.sprite.setTint(archetypeColor);
        }
    }

    /**
     * Updates the slow effect on the player
     */
    private updateSlowEffect(): void {
        const currentTime = Date.now();
        if (currentTime >= this.slowEndTime) {
            this.slowMultiplier = 1.0; // Reset to normal speed
            // Remove slow visual effect
            if (!this.isInvulnerable) {
                const archetypeColor = EnhancedStyleHelpers.archetype.getColorHex(this.archetype.type);
                this.sprite.setTint(archetypeColor);
            }
        } else {
            // Apply slow visual effect (cyan tint)
            this.sprite.setTint(0x00ffff);
        }
    }

    /**
     * Applies a slow effect to the player
     * @param slowAmount - Multiplier for speed (0.5 = 50% speed)
     * @param duration - Duration of slow effect in milliseconds
     */
    public applySlow(slowAmount: number, duration: number): void {
        this.slowMultiplier = Math.min(this.slowMultiplier, slowAmount); // Take the stronger slow effect
        this.slowEndTime = Math.max(this.slowEndTime, Date.now() + duration); // Extend duration if needed
    }

    /**
     * Checks if the player can be hit by vortex (respects cooldown)
     * @returns True if player can be hit by vortex
     */
    public canBeHitByVortex(): boolean {
        const currentTime = Date.now();
        return currentTime - this.lastVortexHitTime >= this.vortexHitCooldown;
    }

    /**
     * Marks the player as hit by vortex (updates cooldown)
     */
    public hitByVortex(): void {
        this.lastVortexHitTime = Date.now();
    }

    /**
     * Destroys the player and cleans up all associated resources
     */
    public destroy(): void {
        // Unregister input handlers
        if (this.pointerDownHandler) {
            this.scene.input.off('pointerdown', this.pointerDownHandler);
        }
    
        // Destroy player sprite
        this.sprite.destroy();
    
        // Destroy UI elements
        if (this.healthBar) this.healthBar.destroy();
        if (this.healthBarBg) this.healthBarBg.destroy();
        if (this.archetypeText) this.archetypeText.destroy();
    
        // Destroy bullets and clear array
        this.bullets.forEach(bullet => bullet.destroy());
        this.bullets = [];
    
        // Destroy transient attack visuals
        this.activeEffects.forEach(effect => effect.destroy());
        this.activeEffects = [];
    }
}
