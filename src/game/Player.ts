import { Scene } from 'phaser';
import { PlayerArchetype, PlayerArchetypeType } from './PlayerArchetype';
import { Enemy } from './EnemySystem';

export class Player {
    public sprite: Phaser.GameObjects.Rectangle;
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

    constructor(scene: Scene, x: number, y: number, archetypeType: PlayerArchetypeType) {
        this.scene = scene;
        this.archetype = new PlayerArchetype(archetypeType);
        this.attackCooldown = 1000 / this.archetype.stats.attackSpeed; // Convert to milliseconds
        
        // Create player sprite (blue rectangle)
        this.sprite = scene.add.rectangle(x, y, 30, 30, 0x0066ff);
        this.sprite.setStrokeStyle(2, 0x003399);
        
        // Create health bar
        this.healthBarBg = scene.add.rectangle(x, y - 40, 40, 6, 0x333333);
        this.healthBar = scene.add.rectangle(x, y - 40, 40, 6, 0x00ff00);
        
        // Create archetype display
        this.archetypeText = scene.add.text(x, y - 60, this.getArchetypeDisplayName(), {
            fontSize: '12px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // Set up input
        this.cursors = scene.input.keyboard!.createCursorKeys();
        this.wasdKeys = scene.input.keyboard!.addKeys('W,S,A,D,SPACE');
        
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

    private getArchetypeColor(): number {
        switch (this.archetype.type) {
            case PlayerArchetypeType.TANK:
                return 0x4169E1; // Royal Blue
            case PlayerArchetypeType.GLASS_CANNON:
                return 0xFF6347; // Tomato
            case PlayerArchetypeType.EVASIVE:
                return 0x32CD32; // Lime Green
        }
    }

    public update(enemies: Enemy[], deltaTime: number): void {
        this.handleMovement(deltaTime);
        this.handleAttack(enemies);
        this.updateBullets(deltaTime);
        this.updateHealthBar();
        this.updateArchetype();
        this.updateInvulnerability();
    }

    private handleMovement(deltaTime: number): void {
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
        
        // Apply movement with actual delta time
        this.sprite.x += velocityX * deltaTime;
        this.sprite.y += velocityY * deltaTime;
        
        // Keep player within screen bounds
        const gameWidth = 1024;
        const gameHeight = 768;
        this.sprite.x = Phaser.Math.Clamp(this.sprite.x, 15, gameWidth - 15);
        this.sprite.y = Phaser.Math.Clamp(this.sprite.y, 15, gameHeight - 15);
        
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
                    this.archetype.gainXP(enemy.stats.xpValue);
                }
                this.archetype.dealDamage(meleeDamage);
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
                        this.archetype.gainXP(enemy.stats.xpValue);
                    }
                    this.archetype.dealDamage(aoeDamage);
                }
            });
        }
    }

    private projectileAttack(enemies: Enemy[]): void {
        // Glass Cannon uses projectile attacks (original behavior)
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
        
        // Change color based on health
        if (healthPercent > 0.6) {
            this.healthBar.setFillStyle(0x00ff00); // Green
        } else if (healthPercent > 0.3) {
            this.healthBar.setFillStyle(0xffff00); // Yellow
        } else {
            this.healthBar.setFillStyle(0xff0000); // Red
        }
    }

    private updateArchetype(): void {
        // Update sprite color based on archetype (only if not invulnerable)
        if (!this.isInvulnerable) {
            this.sprite.setFillStyle(this.getArchetypeColor());
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
                this.sprite.setFillStyle(this.getArchetypeColor()); // Restore normal color
            } else {
                // Create flashing effect during invulnerability
                const flashInterval = 100; // Flash every 100ms
                const shouldFlash = Math.floor(timeSinceDamage / flashInterval) % 2 === 0;
                this.sprite.setAlpha(shouldFlash ? 0.3 : 0.8);
            }
        }
    }

    public checkCollisionWithEnemies(enemies: Enemy[]): void {
        const bulletsToRemove: Phaser.GameObjects.Rectangle[] = [];
        
        enemies.forEach(enemy => {
            // Check bullet-enemy collision
            this.bullets.forEach(bullet => {
                if (bullet.active && this.checkCollision(bullet, enemy.sprite)) {
                    const damage = bullet.getData('damage');
                    const enemyDied = enemy.takeDamage(damage);
                    
                    if (enemyDied) {
                        this.archetype.gainXP(enemy.stats.xpValue);
                    }
                    this.archetype.dealDamage(damage);
                    
                    bullet.destroy();
                    bulletsToRemove.push(bullet);
                }
            });
            
            // Check player-enemy collision
            if (this.checkCollision(this.sprite, enemy.sprite)) {
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

    private checkCollision(obj1: Phaser.GameObjects.Rectangle, obj2: Phaser.GameObjects.Rectangle): boolean {
        const bounds1 = obj1.getBounds();
        const bounds2 = obj2.getBounds();
        return Phaser.Geom.Rectangle.Overlaps(bounds1, bounds2);
    }

    public takeDamage(amount: number): void {
        this.archetype.takeDamage(amount);
        
        // Visual feedback - brief red flash, then invulnerability will take over
        this.sprite.setFillStyle(0xff0000);
        this.scene.time.delayedCall(50, () => {
            // Don't restore color here - let invulnerability system handle it
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

    public destroy(): void {
        this.sprite.destroy();
        this.healthBar.destroy();
        this.healthBarBg.destroy();
        this.archetypeText.destroy();
        this.bullets.forEach(bullet => bullet.destroy());
    }
}