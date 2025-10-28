import { Scene } from 'phaser';
import { PlayerArchetype, PlayerArchetypeType } from './PlayerArchetype';
import { Enemy, Projectile, MeleeAttack, ConeAttack, Shield, VortexAttack, ExplosionAttack, LightningStrikeAttack } from './EnemySystem';
import { EnemyType } from './types/EnemyTypes';
import { EnhancedStyleHelpers } from '../ui/EnhancedDesignSystem';
import { AnimationMapper, CharacterAnimationSet } from './config/AnimationMappings';

export class Player {
    public sprite: Phaser.Physics.Arcade.Sprite;
    private archetype: PlayerArchetype;
    private scene: Scene;

	private characterVariant: string = 'Knight_1'; // Default
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
    private slowMultiplier: number = 1.0;
    private slowEndTime: number = 0;
    private lastVortexHitTime: number = 0;
    private vortexHitCooldown: number = 500;
    // --- REMOVED ---
    // private facingLeft: boolean = false; // Track current facing direction

    constructor(scene: Scene, x: number, y: number, archetypeType: PlayerArchetypeType) {
        this.scene = scene;
        this.archetype = new PlayerArchetype(archetypeType);
        this.attackCooldown = 1000 / this.archetype.stats.attackSpeed;

        this.characterVariant = AnimationMapper.getHardcodedCharacterForArchetype(this.archetype.type);
        this.characterAnimations = AnimationMapper.getCharacterAnimations(this.characterVariant);

        console.log(`🎮 Selected character variant: ${this.characterVariant} for archetype: ${this.archetype.type}`);
        console.log('🎮 Character animations:', this.characterAnimations);

        const textureKey = this.characterAnimations.texture;
        this.sprite = scene.physics.add.sprite(x, y, textureKey);
        console.log(`🎮 Created player sprite with texture: ${textureKey}`);
        this.sprite.setScale(0.05);
        this.sprite.setDepth(3);
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.setAngle(0);
        this.sprite.setRotation(0);
        this.sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);
        body.setSize(410, 545);
        body.setOffset(265, 175);
        body.setDrag(800);
        body.allowRotation = false;
        if ((this.sprite as any).setAngularVelocity) {
            (this.sprite as any).setAngularVelocity(0);
        }

        // --- REMOVED ---
        // Initialize facing direction based on sprite's default state
        // this.facingLeft = this.sprite.flipX;

        this.playAnimation('idle'); // Start idle

        this.cursors = scene.input.keyboard!.createCursorKeys();
        this.wasdKeys = scene.input.keyboard!.addKeys('W,S,A,D,SPACE');

        // --- (UI Element creation remains the same) ---
        this.healthBarBg = scene.add.rectangle(x, y - 35, 50, 8, 0x000000);
        this.healthBarBg.setDepth(15);
        this.healthBar = scene.add.rectangle(x, y - 35, 48, 6, 0x00ff00);
        this.healthBar.setDepth(16);
        this.archetypeText = scene.add.text(x, y - 50, this.getArchetypeDisplayName(), { /* ... style ... */ });
        this.archetypeText.setOrigin(0.5);
        this.archetypeText.setDepth(17);


        this.pointerDownHandler = (pointer: Phaser.Input.Pointer) => {
            if (pointer.leftButtonDown()) {
                this.performAttack(pointer);
            }
        };
        scene.input.on('pointerdown', this.pointerDownHandler);
        this.archetype.updatePosition(x, y);
    }

    // --- (getArchetypeDisplayName, setEnemyDeathCallback, handleEnemyDeath remain the same) ---
     private getArchetypeDisplayName(): string {
        switch (this.archetype.type) {
            case PlayerArchetypeType.TANK:
                return 'Knight';
            case PlayerArchetypeType.GLASS_CANNON:
                return 'Magician';
            case PlayerArchetypeType.EVASIVE:
                return 'Rogue';
        }
    }
    public setEnemyDeathCallback(callback: (x: number, y: number, enemyType: EnemyType, xpValue: number) => void): void {
        this.onEnemyDeathCallback = callback;
    }
     private handleEnemyDeath(enemy: Enemy, damage: number): void {
        if (this.onEnemyDeathCallback) {
            this.onEnemyDeathCallback(enemy.sprite.x, enemy.sprite.y, enemy.type, enemy.stats.xpValue);
        }
        this.archetype.dealDamage(damage);
    }

    public update(enemies: Enemy[], deltaTime: number): void {
        if (this.sprite.rotation !== 0 || this.sprite.angle !== 0) {
            this.sprite.setAngle(0);
            this.sprite.setRotation(0);
        }
        this.handleMovement(); // Still handles movement and animation switching
        this.handleAttack(enemies);
        this.updateBullets(deltaTime);
        this.updateHealthBar();
        this.updateArchetype();
        this.updateInvulnerability();
    }

    private handleMovement(): void {
        if (!this.sprite.body) return;

        this.updateSlowEffect();
        let velocityX = 0;
        let velocityY = 0;

        const leftPressed = this.isKeyPressed(this.cursors?.left) || this.isKeyPressed(this.wasdKeys?.A);
        const rightPressed = this.isKeyPressed(this.cursors?.right) || this.isKeyPressed(this.wasdKeys?.D);
        const upPressed = this.isKeyPressed(this.cursors?.up) || this.isKeyPressed(this.wasdKeys?.W);
        const downPressed = this.isKeyPressed(this.cursors?.down) || this.isKeyPressed(this.wasdKeys?.S);

        if (leftPressed) velocityX = -this.archetype.stats.speed;
        if (rightPressed) velocityX = this.archetype.stats.speed;
        if (upPressed) velocityY = -this.archetype.stats.speed;
        if (downPressed) velocityY = this.archetype.stats.speed;

        velocityX *= this.slowMultiplier;
        velocityY *= this.slowMultiplier;

        if (velocityX !== 0 && velocityY !== 0) {
            velocityX *= 0.707;
            velocityY *= 0.707;
        }

        const isMoving = leftPressed || rightPressed || upPressed || downPressed;
		const targetAnimationKey = isMoving ? 'walk' : 'idle';

        // --- REMOVED FLIP LOGIC ---
        // if (leftPressed && !rightPressed) {
        //     if (!this.facingLeft) {
        //         this.facingLeft = true;
        //         this.sprite.setFlipX(true);
        //     }
        // } else if (rightPressed && !leftPressed) {
        //     if (this.facingLeft) {
        //         this.facingLeft = false;
        //         this.sprite.setFlipX(false);
        //     }
        // }
        // --- END REMOVED FLIP LOGIC ---

        // Play the animation (idle or walk)
        this.playAnimation(targetAnimationKey as keyof CharacterAnimationSet);

        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(velocityX, velocityY);

        this.archetype.updatePosition(this.sprite.x, this.sprite.y);
        this.healthBarBg.setPosition(this.sprite.x, this.sprite.y - 35);
        this.healthBar.setPosition(this.sprite.x, this.sprite.y - 35);
        this.archetypeText.setPosition(this.sprite.x, this.sprite.y - 50);
    }

    private playAnimation(animationName: keyof CharacterAnimationSet): void {
        try {
            const targetAnimation = this.characterAnimations[animationName];

            if (this.scene.anims.exists(targetAnimation)) {
                const currentlyPlaying = this.sprite.anims.currentAnim?.key;

                if (currentlyPlaying !== targetAnimation) {
                    // --- REMOVED FLIP PRESERVATION ---
                    // const currentFlipX = this.sprite.flipX;
                    this.sprite.play(targetAnimation);
                    // this.sprite.setFlipX(currentFlipX); // No longer needed
                }
                return;
            }
            console.warn(`❌ Animation not found: ${targetAnimation}`);
        } catch (error) {
            console.warn(`Failed to play animation ${animationName}:`, error);
        }
    }

    // --- (All other methods like performAttack, handleAttack, attack types, collision checks, takeDamage, etc., remain unchanged) ---

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
     private applySlowEffect(multiplier: number, duration: number): void {
        this.slowMultiplier = Math.min(this.slowMultiplier, multiplier); // Use the strongest slow
        this.slowEndTime = Math.max(this.slowEndTime, Date.now() + duration);
        console.log(`Player slowed! Speed: ${(multiplier * 100).toFixed(0)}%, Duration: ${(duration / 1000).toFixed(1)}s`);
    }
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
     public checkCollisionWithVortexAttacks(vortexAttacks: VortexAttack[]): void {
        vortexAttacks.forEach(attack => {
            if (!attack.isActive()) return;
            
            // Use the vortex's built-in point-in-vortex check
            if (attack.isPointInVortex(this.sprite.x, this.sprite.y)) {
                // Stop traveling vortexes when they hit the player
                if (attack.isTravelingToTarget()) {
                    attack.stopAtCurrentPosition();
                }
                
                const currentTime = Date.now();
                
                // Apply damage with cooldown (like other attacks)
                if (currentTime - this.lastDamageTime >= this.damageCooldown) {
                    this.takeDamage(attack.damage);
                    this.lastDamageTime = currentTime;
                    this.isInvulnerable = true;
                }
                
                // Apply slow effect if player can be hit by vortex
                if (this.canBeHitByVortex()) {
                    this.applySlowEffect(attack.slowEffect, attack.slowDuration); // 70% speed reduction for 2 seconds
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

    public checkCollisionWithLightningStrikes(lightningStrikes: LightningStrikeAttack[]): void {
        lightningStrikes.forEach(attack => {
            if (attack.isActive() && attack.hasStruckLightning() && attack.isPointInStrike(this.sprite.x, this.sprite.y)) {
                const currentTime = Date.now();
                if (currentTime - this.lastDamageTime >= this.damageCooldown) {
                    this.takeDamage(attack.damage);
                    this.lastDamageTime = currentTime;
                    this.isInvulnerable = true;
                }
            }
        });
    }

    public checkCollisionWithClawAttacks(clawAttacks: any[]): void {
        clawAttacks.forEach(attack => {
            if (!attack.isActive()) return;
            
            // Use bounding box collision for claw attacks
            const attackBounds = attack.getBounds();
            const distance = Math.sqrt(
                Math.pow(this.sprite.x - attack.x, 2) + 
                Math.pow(this.sprite.y - attack.y, 2)
            );
            
            // Check if player is within the attack's hitbox
            if (distance < (attackBounds.width / 2 + 20)) { // 20 is approximate player radius
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
     public isAlive(): boolean {
        return this.archetype.currentHealth > 0;
    }
     public getPosition(): { x: number; y: number } {
        return { x: this.sprite.x, y: this.sprite.y };
    }
     public getArchetype(): PlayerArchetype {
        return this.archetype;
    }
     public getBullets(): Phaser.GameObjects.Rectangle[] {
        return this.bullets;
    }
     public getHealthPercentage(): number {
        return this.archetype.getHealthPercentage();
    }
     public getDPSOverLastTenSeconds(): number {
        return this.archetype.getDPSOverLastTenSeconds();
    }
     public getMovementDistanceLastTenSeconds(): number {
        return this.archetype.getMovementDistanceLastTenSeconds();
    }
     public getDamageTakenRecently(): number {
        return this.archetype.getDamageTakenRecently();
    }
     public getXPGenerationRate(): number {
        return this.archetype.getXPGenerationRate();
    }
     public getArchetypeVector(): number[] {
        return this.archetype.getArchetypeVector();
    }
     public get position(): { x: number; y: number } {
        return { x: this.sprite.x, y: this.sprite.y };
    }
     public get currentHealth(): number {
        return this.archetype.currentHealth;
    }
     public getScene(): Scene {
        return this.scene;
    }
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
     private updateHealthBar(): void {
        const healthPercent = this.archetype.currentHealth / this.archetype.stats.maxHealth;
        const maxWidth = 48;
        const currentWidth = maxWidth * healthPercent;
        
        this.healthBar.setSize(currentWidth, 6);
        
        // Color based on health percentage using EnhancedStyleHelpers
        const healthColor = EnhancedStyleHelpers.enemy.getHealthBarColor(healthPercent);
        this.healthBar.setFillStyle(healthColor);
    }
     private updateArchetype(): void {
        if (!this.isInvulnerable) {
            // const archetypeColor = EnhancedStyleHelpers.archetype.getColorHex(this.archetype.type);
            // this.sprite.setTint(archetypeColor);
        }
    }
     private updateSlowEffect(): void {
        const currentTime = Date.now();
        if (currentTime >= this.slowEndTime) {
            this.slowMultiplier = 1.0; // Reset to normal speed
            // Remove slow visual effect
            if (!this.isInvulnerable) {
                this.sprite.clearTint();
            }
        } else {
            // Apply slow visual effect (cyan tint)
            this.sprite.setTint(0x00ffff);
        }
    }
     public applySlow(slowAmount: number, duration: number): void {
        this.slowMultiplier = Math.min(this.slowMultiplier, slowAmount); // Take the stronger slow effect
        this.slowEndTime = Math.max(this.slowEndTime, Date.now() + duration); // Extend duration if needed
    }
     public canBeHitByVortex(): boolean {
        const currentTime = Date.now();
        return currentTime - this.lastVortexHitTime >= this.vortexHitCooldown;
    }
     public hitByVortex(): void {
        this.lastVortexHitTime = Date.now();
    }
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
