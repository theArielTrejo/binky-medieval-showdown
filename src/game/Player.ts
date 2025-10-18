import { Scene } from 'phaser';
import { PlayerArchetype, PlayerArchetypeType } from './PlayerArchetype';
import { Enemy, EnemyType, Projectile, MeleeAttack, ConeAttack, Shield, VortexAttack, ExplosionAttack } from './EnemySystem';
import { EnhancedStyleHelpers } from '../ui/EnhancedDesignSystem';

export class Player {
    public sprite: Phaser.GameObjects.Sprite;
    public archetype: PlayerArchetype;
    private scene: Scene;
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasdKeys: any;
    private lastAttackTime: number = 0;
    private attackCooldown: number;
    private bullets: Phaser.GameObjects.Rectangle[] = [];
    private healthBar: Phaser.GameObjects.Rectangle;
    private healthBarBg: Phaser.GameObjects.Rectangle;
    private archetypeText: Phaser.GameObjects.Text;
    private lastDamageTime: number = 0;
    private damageCooldown: number = 1000; // 1 second invincibility frames
    private isInvulnerable: boolean = false;
    private isMoving: boolean = false;
    private currentAnimation: string = '';
    private onEnemyDeathCallback: ((x: number, y: number, enemyType: EnemyType, xpValue: number) => void) | null = null;
    private slowMultiplier: number = 1.0; // Current speed multiplier (1.0 = normal, 0.5 = 50% speed)
    private slowEndTime: number = 0; // Timestamp when slow effect ends
    private lastVortexHitTime: number = 0; // Last time player was hit by vortex
    private vortexHitCooldown: number = 500; // Cooldown between vortex hits (ms)

    constructor(scene: Scene, x: number, y: number, archetypeType: PlayerArchetypeType) {
        this.scene = scene;
        this.archetype = new PlayerArchetype(archetypeType);
        this.attackCooldown = 1000 / this.archetype.stats.attackSpeed; // Convert to milliseconds
        
        // Create player sprite using Dark Oracle character
        const spriteKey = this.getSpriteKeyForArchetype();
        this.sprite = scene.add.sprite(x, y, spriteKey);
        this.sprite.setScale(0.15); // Scale down significantly to match enemy proportions
        
        // Start with idle animation
        this.playAnimation('idle');
        
        // Create health bar
        this.healthBarBg = scene.add.rectangle(x, y - 40, 40, 6, 0x333333);
        this.healthBar = scene.add.rectangle(x, y - 40, 40, 6, 0x00ff00);
        
        // Create archetype display using Enhanced Design System
        this.archetypeText = scene.add.text(
            x, 
            y - 60, 
            this.getArchetypeDisplayName(), 
            EnhancedStyleHelpers.archetype.getStyle(archetypeType)
        ).setOrigin(0.5);
        
        // Set up input
        this.cursors = scene.input.keyboard!.createCursorKeys();
        this.wasdKeys = scene.input.keyboard!.addKeys('W,S,A,D,SPACE');
        
        // Set up mouse input for left-click attacks
        scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.leftButtonDown()) {
                const currentTime = Date.now();
                if (currentTime - this.lastAttackTime > this.attackCooldown) {
                    this.performAttack(pointer);
                    this.lastAttackTime = currentTime;
                }
            }
        });
        
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

    private getSpriteKeyForArchetype(): string {
        // All archetypes now use the medieval knight
        return 'medieval_knight_idle';
    }

    private getArchetypeColor(): number {
        return EnhancedStyleHelpers.archetype.getColorHex(this.archetype.type);
    }

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
        this.handleMovement(deltaTime);
        this.handleAttack(enemies);
        this.updateBullets(deltaTime);
        this.updateHealthBar();
        this.updateArchetype();
        this.updateInvulnerability();
    }

    private handleMovement(deltaTime: number): void {
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
        
        // Normalize diagonal movement
        if (velocityX !== 0 && velocityY !== 0) {
            velocityX *= 0.707; // 1/sqrt(2)
            velocityY *= 0.707;
        }
        
        // Apply slow effect
        velocityX *= this.slowMultiplier;
        velocityY *= this.slowMultiplier;
        
        // Check if player is moving and update animations
        const moved = velocityX !== 0 || velocityY !== 0;
        if (moved !== this.isMoving) {
            this.isMoving = moved;
            this.playAnimation(moved ? 'running' : 'idle');
        }
        
        // Apply movement with actual delta time
        this.sprite.x += velocityX * deltaTime;
        this.sprite.y += velocityY * deltaTime;
        
        // Keep player within world bounds (will be set by the game scene)
        const worldBounds = this.scene.physics.world.bounds;
        if (worldBounds.width > 0 && worldBounds.height > 0) {
            this.sprite.x = Phaser.Math.Clamp(this.sprite.x, worldBounds.x + 15, worldBounds.x + worldBounds.width - 15);
            this.sprite.y = Phaser.Math.Clamp(this.sprite.y, worldBounds.y + 15, worldBounds.y + worldBounds.height - 15);
        }
        
        // Update archetype position
        this.archetype.updatePosition(this.sprite.x, this.sprite.y);
        
        // Update UI elements position
        this.healthBarBg.setPosition(this.sprite.x, this.sprite.y - 40);
        this.healthBar.setPosition(this.sprite.x, this.sprite.y - 40);
        this.archetypeText.setPosition(this.sprite.x, this.sprite.y - 60);
    }

    private handleAttack(enemies: Enemy[]): void {
        const currentTime = Date.now();
        
        // Safe input handling for attack
        const attackPressed = this.isKeyPressed(this.cursors?.space) || this.isKeyPressed(this.wasdKeys?.SPACE);
        
        if (attackPressed && currentTime - this.lastAttackTime > this.attackCooldown) {
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
        
        // Remove effect after short duration
        this.scene.time.delayedCall(150, () => {
            meleeEffect.destroy();
        });
        
        // Damage all enemies within melee range
        enemies.forEach(enemy => {
            const distance = Phaser.Math.Distance.Between(
                this.sprite.x,
                this.sprite.y,
                enemy.sprite.x,
                enemy.sprite.y
            );
            
            if (distance <= meleeRange) {
                const enemyDied = enemy.takeDamage(meleeDamage);
                if (enemyDied) {
                    this.handleEnemyDeath(enemy, meleeDamage);
                } else {
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
            
            // Remove effect after short duration
            this.scene.time.delayedCall(200, () => {
                explosion.destroy();
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
            
            // Check screen bounds
            if (bullet.x < 0 || bullet.x > 1024 || bullet.y < 0 || bullet.y > 768) {
                bullet.destroy();
                return false;
            }
            
            return true;
        });
    }

    private updateHealthBar(): void {
        const healthPercent = this.archetype.getHealthPercentage();
        this.healthBar.scaleX = healthPercent;
        
        // Use Enhanced Design System for health bar colors
        const healthColor = EnhancedStyleHelpers.enemy.getHealthBarColor(healthPercent);
        this.healthBar.setFillStyle(healthColor);
    }

    private updateArchetype(): void {
        // Update sprite tint based on archetype (only if not invulnerable)
        if (!this.isInvulnerable) {
            this.sprite.setTint(this.getArchetypeColor());
        }
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
                
                // Apply slow effect (separate cooldown to prevent spam)
                if (currentTime - this.lastVortexHitTime >= this.vortexHitCooldown) {
                    this.applySlowEffect(attack.slowEffect, attack.slowDuration * 1000);
                    this.lastVortexHitTime = currentTime;
                }
            }
        });
    }

    public checkCollisionWithExplosionAttacks(explosionAttacks: ExplosionAttack[]): void {
        explosionAttacks.forEach(attack => {
            if (!attack.isActive()) return;
            
            // Use the explosion's built-in point-in-explosion check
            if (attack.isPointInExplosion(this.sprite.x, this.sprite.y)) {
                const currentTime = Date.now();
                
                // Apply damage with cooldown to prevent multiple hits from same explosion
                if (currentTime - this.lastDamageTime >= this.damageCooldown) {
                    this.takeDamage(attack.damage);
                    this.lastDamageTime = currentTime;
                    this.isInvulnerable = true;
                    console.log(`Player hit by explosion for ${attack.damage} damage!`);
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
        
        // Visual feedback - brief red tint, then invulnerability will take over
        this.sprite.setTint(0xff0000);
        this.scene.time.delayedCall(50, () => {
            // Don't restore tint here - let invulnerability system handle it
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

    private playAnimation(animationName: string): void {
        if (this.currentAnimation !== animationName) {
            this.currentAnimation = animationName;
            try {
                // Map animation names to medieval knight animations
                let animKey = '';
                if (animationName === 'idle') {
                    animKey = 'medieval_knight_idle';
                } else if (animationName === 'running') {
                    animKey = 'medieval_knight_walk';
                } else {
                    // Default to walking animation for any movement
                    animKey = 'medieval_knight_walk';
                }
                
                if (this.scene.anims.exists(animKey)) {
                    this.sprite.play(animKey);
                } else {
                    console.warn(`Animation ${animKey} not found, using static frame`);
                    // Fallback to static medieval knight frame
                    this.sprite.setTexture('medieval_knight_idle');
                }
            } catch (error) {
                console.warn(`Failed to play animation ${animationName}:`, error);
            }
        }
    }

    /**
     * Collects XP orbs within range and adds XP to the player
     * @param xpOrbSystem - The XP orb system to collect from
     */
    public collectXPOrbs(xpOrbSystem: any): void {
        const playerPos = this.getPosition();
        xpOrbSystem.collectOrbs(playerPos.x, playerPos.y, (xp: number) => {
            this.archetype.gainXP(xp);
        });
    }

    /**
     * Destroys the player and cleans up all associated resources
     */
    public destroy(): void {
        this.sprite.destroy();
        this.healthBar.destroy();
        this.healthBarBg.destroy();
        this.archetypeText.destroy();
        this.bullets.forEach(bullet => bullet.destroy());
    }
}